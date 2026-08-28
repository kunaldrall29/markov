import { SQL } from "bun";
import { Database } from "bun:sqlite";
import { BLOCK_REASONS, type BlockReason } from "@markov/engine/types";

export const PUBLIC_RECEIPT_FIELDS = [
  "receipt_id",
  "ts",
  "mandate",
  "operator",
  "action_type",
  "venue",
  "token",
  "amount",
  "result",
  "block_reason",
  "tx_sig",
] as const;

export type PublicResult = "allowed" | "blocked";

export type PublicReceipt = {
  receipt_id: string;
  ts: number;
  mandate: string;
  operator: string | null;
  action_type: string | null;
  venue: string | null;
  token: string | null;
  amount: number | null;
  result: PublicResult;
  block_reason: BlockReason | null;
  tx_sig: string | null;
};

export type ReceiptListQuery = {
  cursor?: string;
  limit: number;
  result?: PublicResult;
  reason?: BlockReason;
};

export type ReceiptStats = {
  total: number;
  allowed: number;
  blocked: number;
  by_reason: Record<BlockReason, number>;
};

export type PublicReceiptsStore = {
  list(query: ReceiptListQuery): Promise<PublicReceipt[]>;
  stats(): Promise<ReceiptStats>;
};

const SELECT_LIST = `select receipt_id, ts, mandate, operator, action_type, venue, token, amount, result, block_reason, tx_sig from public_receipts`;
const SELECT_STATS = `select result, block_reason, count(*) as n from public_receipts group by result, block_reason`;

export function emptyStats(): ReceiptStats {
  const by_reason = {} as Record<BlockReason, number>;
  for (const reason of BLOCK_REASONS) by_reason[reason] = 0;
  return { total: 0, allowed: 0, blocked: 0, by_reason };
}

export function isBlockReason(value: string): value is BlockReason {
  return (BLOCK_REASONS as readonly string[]).includes(value);
}

export function encodeCursor(row: Pick<PublicReceipt, "receipt_id" | "ts">): string {
  const json = JSON.stringify({ i: row.receipt_id, t: row.ts });
  return btoa(json).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function decodeCursor(raw: string): { receipt_id: string; ts: number } | null {
  try {
    const pad = raw.length % 4 === 0 ? "" : "=".repeat(4 - (raw.length % 4));
    const json = atob(raw.replaceAll("-", "+").replaceAll("_", "/") + pad);
    const parsed = JSON.parse(json) as { i?: unknown; t?: unknown };
    if (typeof parsed.i !== "string" || !/^\d{1,20}$/.test(parsed.i)) return null;
    if (typeof parsed.t !== "number" || !Number.isFinite(parsed.t)) return null;
    return { receipt_id: parsed.i, ts: parsed.t };
  } catch {
    return null;
  }
}

function rowNewerThanCursor(row: PublicReceipt, cursor: { receipt_id: string; ts: number }): boolean {
  if (row.ts > cursor.ts) return true;
  if (row.ts < cursor.ts) return false;
  const a = Number(row.receipt_id);
  const b = Number(cursor.receipt_id);
  if (Number.isFinite(a) && Number.isFinite(b)) return a > b;
  return row.receipt_id > cursor.receipt_id;
}

function sortNewest(a: PublicReceipt, b: PublicReceipt): number {
  if (a.ts !== b.ts) return b.ts - a.ts;
  const na = Number(a.receipt_id);
  const nb = Number(b.receipt_id);
  if (Number.isFinite(na) && Number.isFinite(nb)) return nb - na;
  return a.receipt_id < b.receipt_id ? 1 : a.receipt_id > b.receipt_id ? -1 : 0;
}

function asReceipt(row: Record<string, unknown>): PublicReceipt {
  const result = row.result === "blocked" ? "blocked" : "allowed";
  const reason = typeof row.block_reason === "string" && isBlockReason(row.block_reason) ? row.block_reason : null;
  return {
    receipt_id: String(row.receipt_id ?? ""),
    ts: Number(row.ts),
    mandate: String(row.mandate ?? ""),
    operator: typeof row.operator === "string" ? row.operator : null,
    action_type: typeof row.action_type === "string" ? row.action_type : null,
    venue: typeof row.venue === "string" ? row.venue : null,
    token: typeof row.token === "string" ? row.token : null,
    amount: typeof row.amount === "number" ? row.amount : row.amount == null ? null : Number(row.amount),
    result,
    block_reason: result === "blocked" ? reason : null,
    tx_sig: typeof row.tx_sig === "string" && row.tx_sig.length > 0 ? row.tx_sig : null,
  };
}

function applyFilters(rows: PublicReceipt[], query: ReceiptListQuery): PublicReceipt[] {
  let out = rows.slice().sort(sortNewest);
  if (query.result) out = out.filter((r) => r.result === query.result);
  if (query.reason) out = out.filter((r) => r.block_reason === query.reason);
  if (query.cursor) {
    const cursor = decodeCursor(query.cursor);
    if (!cursor) throw new Error("invalid cursor");
    out = out.filter((r) => !rowNewerThanCursor(r, cursor) && !(r.ts === cursor.ts && r.receipt_id === cursor.receipt_id));
  }
  return out.slice(0, query.limit);
}

export function memoryStore(seed: PublicReceipt[] = []): PublicReceiptsStore {
  const rows = seed.slice();
  return {
    async list(query) {
      return applyFilters(rows, query);
    },
    async stats() {
      const out = emptyStats();
      for (const row of rows) {
        out.total += 1;
        if (row.result === "allowed") out.allowed += 1;
        else out.blocked += 1;
        if (row.block_reason) out.by_reason[row.block_reason] += 1;
      }
      return out;
    },
  };
}

function statsFromGroups(groups: { result: string; block_reason: string | null; n: number }[]): ReceiptStats {
  const out = emptyStats();
  for (const g of groups) {
    const n = Number(g.n) || 0;
    out.total += n;
    if (g.result === "allowed") out.allowed += n;
    else if (g.result === "blocked") out.blocked += n;
    if (g.block_reason && isBlockReason(g.block_reason)) out.by_reason[g.block_reason] += n;
  }
  return out;
}

export function sqliteStore(db: Database): PublicReceiptsStore {
  return {
    async list(query) {
      const params: Array<string | number | null> = [];
      const where: string[] = [];
      if (query.result) {
        where.push(`result = ?`);
        params.push(query.result);
      }
      if (query.reason) {
        where.push(`block_reason = ?`);
        params.push(query.reason);
      }
      if (query.cursor) {
        const cursor = decodeCursor(query.cursor);
        if (!cursor) throw new Error("invalid cursor");
        where.push(`(ts < ? or (ts = ? and cast(receipt_id as integer) < ?))`);
        params.push(cursor.ts, cursor.ts, Number(cursor.receipt_id));
      }
      const sql =
        `${SELECT_LIST}` +
        (where.length ? ` where ${where.join(" and ")}` : "") +
        ` order by ts desc, cast(receipt_id as integer) desc limit ?`;
      params.push(query.limit);
      const raw = db.query(sql).all(...params) as Record<string, unknown>[];
      return raw.map(asReceipt);
    },
    async stats() {
      const groups = db.query(SELECT_STATS).all() as { result: string; block_reason: string | null; n: number }[];
      return statsFromGroups(groups);
    },
  };
}

export function postgresStore(databaseUrl: string): PublicReceiptsStore {
  const sql = new SQL(databaseUrl);
  return {
    async list(query) {
      const cursor = query.cursor ? decodeCursor(query.cursor) : null;
      if (query.cursor && !cursor) throw new Error("invalid cursor");
      const result = query.result ?? null;
      const reason = query.reason ?? null;
      const cursorTs = cursor?.ts ?? null;
      const cursorId = cursor ? Number(cursor.receipt_id) : null;
      const raw = await sql`
        select receipt_id, ts, mandate, operator, action_type, venue, token, amount, result, block_reason, tx_sig
        from public_receipts
        where (${result}::text is null or result = ${result})
          and (${reason}::text is null or block_reason = ${reason})
          and (${cursorTs}::bigint is null or (ts < ${cursorTs} or (ts = ${cursorTs} and cast(receipt_id as integer) < ${cursorId})))
        order by ts desc, cast(receipt_id as integer) desc
        limit ${query.limit}
      `;
      return (raw as Record<string, unknown>[]).map(asReceipt);
    },
    async stats() {
      const groups = (await sql`
        select result, block_reason, count(*) as n from public_receipts group by result, block_reason
      `) as { result: string; block_reason: string | null; n: number }[];
      return statsFromGroups(groups);
    },
  };
}

export function defaultSqlitePath(): string {
  return process.env.INDEXER_SQLITE ?? `${import.meta.dir}/../../../data/indexer.sqlite`;
}

export function openConfiguredStore(): PublicReceiptsStore | null {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) return postgresStore(databaseUrl);
  const path = defaultSqlitePath();
  try {
    return sqliteStore(new Database(path, { readonly: true }));
  } catch {
    return null;
  }
}
