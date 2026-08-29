import { Connection, PublicKey, type ConfirmedSignatureInfo, type Logs } from "@solana/web3.js";
import {
  actionKindName,
  eventNameCanonical,
  loadFacts,
  mandateProgramId,
  parseMandateLogs,
  pubkeyString,
  strategyIdHex,
  variantName,
  type ParsedProgramEvent,
} from "@markovfyi/operator";
import { rpcUrl, wsUrl } from "@markov/rpc";
import type { Database } from "bun:sqlite";
import { join } from "node:path";
import {
  type ReceiptRow,
  upsertIndexerState,
  upsertMandate,
  upsertReceipt,
} from "./db";
import { upsertPostgresReceipt, upsertPostgresState } from "./pg";

const ROOT = join(import.meta.dir, "../../..");
const FACTS_PATH = join(ROOT, "data/devnet.json");
const ACTION_KINDS = new Set(["ActionExecuted", "ActionRefused"]);

export type ChainHealth = {
  rpcOk: boolean;
  rpcSlot: number | null;
  lastIndexedSlot: number | null;
  lagSlots: number | null;
  chainReady: boolean;
};

export type ApplyResult = { inserted: number; skipped: number };

function maxLag(): number {
  const n = Number(process.env.INDEXER_MAX_LAG_SLOTS ?? 128);
  return Number.isFinite(n) && n > 0 ? n : 128;
}

function fromSlot(): number {
  const n = Number(process.env.INDEXER_FROM_SLOT ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function programId(): PublicKey {
  const facts = loadFacts(FACTS_PATH);
  if (facts?.programs.mandate) return new PublicKey(facts.programs.mandate);
  const env = process.env.MARKOV_PROGRAM_ID?.trim();
  if (env) return new PublicKey(env);
  return mandateProgramId();
}

export function chainConnection(): Connection {
  return new Connection(rpcUrl(), { commitment: "confirmed", wsEndpoint: wsUrl() });
}

function venueLabel(pk: string): string {
  const facts = loadFacts(FACTS_PATH);
  if (!facts) return pk;
  if (pk === facts.programs.demoSwap) return "demo_swap";
  if (pk === facts.programs.demoYield) return "demo_yield";
  if (pk === facts.programs.mandate) return "x402";
  return pk;
}

function tokenLabel(pk: string): string {
  const facts = loadFacts(FACTS_PATH);
  if (!facts) return pk;
  if (pk === facts.mints.usdcd) return "USDC-d";
  if (pk === facts.mints.demo) return "DEMO";
  return pk;
}

function bnNumber(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "bigint") return Number(raw);
  if (raw && typeof raw === "object" && "toString" in raw) {
    const n = Number((raw as { toString(): string }).toString());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function receiptFromEvent(
  ev: ParsedProgramEvent,
  args: { signature: string; eventIndex: number; ts: number },
): ReceiptRow | null {
  const kind = eventNameCanonical(ev.name);
  if (!ACTION_KINDS.has(kind)) return null;
  const refused = kind === "ActionRefused" ? 1 : 0;
  const actionType = actionKindName(ev.data.kind);
  const venuePk = pubkeyString(ev.data.venue);
  const tokenPk = pubkeyString(ev.data.tokenIn ?? ev.data.token_in);
  const amount = bnNumber(ev.data.amountIn ?? ev.data.amount_in ?? ev.data.requestedAmount ?? ev.data.requested_amount);
  const reason = refused ? variantName(ev.data.reason) : null;
  return {
    mandate_id: pubkeyString(ev.data.mandate),
    kind,
    refused,
    reason,
    nonce: bnNumber(ev.data.nonce),
    sig: args.signature,
    ts: args.ts,
    strategy_id: strategyIdHex(ev.data.strategyId ?? ev.data.strategy_id),
    operator: pubkeyString(ev.data.operator),
    venue: venuePk ? venueLabel(venuePk) : null,
    token: tokenPk ? tokenLabel(tokenPk) : null,
    amount,
    action_type: actionType,
    event_index: args.eventIndex,
  };
}

export function applyParsedEvents(
  db: Database,
  events: ParsedProgramEvent[],
  args: { signature: string; ts: number; slot?: number },
): ApplyResult {
  let inserted = 0;
  let skipped = 0;
  events.forEach((ev, eventIndex) => {
    const name = eventNameCanonical(ev.name);
    if (name === "MandateCreated") {
      upsertMandate(db, {
        id: pubkeyString(ev.data.mandate),
        owner: pubkeyString(ev.data.owner),
        operator: pubkeyString(ev.data.operator),
        state: "Active",
        created_ts: args.ts,
        strategy_id: strategyIdHex(ev.data.strategyId ?? ev.data.strategy_id),
      });
    }
    const row = receiptFromEvent(ev, { signature: args.signature, eventIndex, ts: args.ts });
    if (!row) return;
    const changed = upsertReceipt(db, row);
    if (changed) inserted += 1;
    else skipped += 1;
  });
  if (args.slot != null) upsertIndexerState(db, { lastIndexedSlot: args.slot, lastSignature: args.signature });
  return { inserted, skipped };
}

export async function persistPostgres(db: Database, row?: ReceiptRow): Promise<void> {
  if (row) await upsertPostgresReceipt(row);
  const state = db.query(`select last_indexed_slot, last_rpc_slot, last_signature, updated_ts from indexer_state where id = 1`).get() as
    | { last_indexed_slot: number | null; last_rpc_slot: number | null; last_signature: string | null; updated_ts: number | null }
    | undefined;
  if (state) {
    await upsertPostgresState({
      lastIndexedSlot: state.last_indexed_slot,
      lastRpcSlot: state.last_rpc_slot,
      lastSignature: state.last_signature,
      updatedTs: state.updated_ts,
    });
  }
}

export async function indexSignature(
  db: Database,
  connection: Connection,
  signature: string,
): Promise<ApplyResult> {
  let tx = null;
  for (let i = 0; i < 6; i++) {
    try {
      tx = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (tx) break;
    } catch {
      /* 429 / transient */
    }
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  if (!tx) return { inserted: 0, skipped: 0 };
  const logs = tx.meta?.logMessages ?? [];
  const events = parseMandateLogs(logs, programId());
  const ts = tx.blockTime ?? Math.floor(Date.now() / 1000);
  const result = applyParsedEvents(db, events, { signature, ts, slot: tx.slot });
  for (let i = 0; i < events.length; i++) {
    const row = receiptFromEvent(events[i]!, { signature, eventIndex: i, ts });
    if (row) await upsertPostgresReceipt(row);
  }
  await persistPostgres(db);
  return result;
}

export async function backfill(db: Database, connection: Connection): Promise<{ signatures: number; inserted: number }> {
  const pid = programId();
  const start = fromSlot();
  let before: string | undefined;
  let signatures = 0;
  let inserted = 0;
  const seen = new Set<string>();
  for (;;) {
    const page: ConfirmedSignatureInfo[] = await connection.getSignaturesForAddress(pid, {
      before,
      limit: 1000,
    });
    if (page.length === 0) break;
    const batch = start > 0 ? page.filter((s) => (s.slot ?? 0) >= start) : page;
    for (const info of batch) {
      if (seen.has(info.signature)) continue;
      seen.add(info.signature);
      const result = await indexSignature(db, connection, info.signature);
      signatures += 1;
      inserted += result.inserted;
    }
    const oldest = page[page.length - 1];
    if (!oldest || page.length < 1000) break;
    if (start > 0 && (oldest.slot ?? 0) < start) break;
    before = oldest.signature;
  }
  const rpcSlot = await connection.getSlot("confirmed");
  upsertIndexerState(db, { lastIndexedSlot: rpcSlot, lastRpcSlot: rpcSlot });
  await persistPostgres(db);
  return { signatures, inserted };
}

export function readHealth(db: Database): Omit<ChainHealth, "rpcOk" | "rpcSlot" | "chainReady" | "lagSlots"> & {
  lastIndexedSlot: number | null;
} {
  const row = db.query(`select last_indexed_slot from indexer_state where id = 1`).get() as
    | { last_indexed_slot: number | null }
    | undefined;
  return { lastIndexedSlot: row?.last_indexed_slot ?? null };
}

export async function chainHealth(db: Database, connection = chainConnection()): Promise<ChainHealth> {
  let rpcSlot: number | null = null;
  let rpcOk = false;
  try {
    rpcSlot = await connection.getSlot("confirmed");
    rpcOk = true;
  } catch {
    rpcOk = false;
  }
  const lastIndexedSlot = readHealth(db).lastIndexedSlot;
  const lagSlots = rpcOk && rpcSlot != null && lastIndexedSlot != null ? Math.max(0, rpcSlot - lastIndexedSlot) : null;
  upsertIndexerState(db, { lastRpcSlot: rpcSlot });
  const chainReady = rpcOk && lastIndexedSlot != null && lagSlots != null && lagSlots <= maxLag();
  return { rpcOk, rpcSlot, lastIndexedSlot, lagSlots, chainReady };
}

export function subscribeLogs(
  db: Database,
  connection: Connection,
  onIndexed?: (sig: string, result: ApplyResult) => void,
): () => void {
  const id = connection.onLogs(
    programId(),
    (logs: Logs) => {
      if (logs.err) return;
      indexSignature(db, connection, logs.signature)
        .then((result) => onIndexed?.(logs.signature, result))
        .catch((err) => console.warn("indexer log", err));
    },
    "confirmed",
  );
  return () => {
    void connection.removeOnLogsListener(id);
  };
}
