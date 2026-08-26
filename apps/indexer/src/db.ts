import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type ReceiptRow = {
  mandate_id: string;
  kind: string;
  refused: number;
  reason: string | null;
  nonce: number | null;
  sig: string | null;
  ts: number | null;
};

export function openDb(path = ":memory:"): Database {
  const db = new Database(path);
  const sql = readFileSync(join(import.meta.dir, "../migrations/0001_init.sql"), "utf8");
  db.exec(sql);
  return db;
}

export function upsertMandate(
  db: Database,
  row: { id: string; owner: string; operator: string; state: string; created_ts: number | null },
) {
  db.query(
    `insert into mandates (id, owner, operator, state, created_ts) values (?1, ?2, ?3, ?4, ?5)
     on conflict(id) do update set owner=excluded.owner, operator=excluded.operator, state=excluded.state`,
  ).run(row.id, row.owner, row.operator, row.state, row.created_ts);
}

export function insertReceipt(db: Database, row: ReceiptRow) {
  db.query(
    `insert into receipts (mandate_id, kind, refused, reason, nonce, sig, ts)
     values (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
  ).run(row.mandate_id, row.kind, row.refused, row.reason, row.nonce, row.sig, row.ts);
}

export function listReceipts(db: Database, mandateId?: string) {
  if (mandateId) {
    return db
      .query(`select * from receipts where mandate_id = ?1 order by id desc`)
      .all(mandateId);
  }
  return db.query(`select * from receipts order by id desc`).all();
}

export function fromEngineReceipt(r: Record<string, unknown>): ReceiptRow {
  const kind = String(r.type ?? "unknown");
  const refused = kind === "ActionRefused" ? 1 : 0;
  return {
    mandate_id: String(r.mandateId ?? ""),
    kind,
    refused,
    reason: typeof r.reason === "string" ? r.reason : null,
    nonce: typeof r.nonce === "number" ? r.nonce : null,
    sig: typeof r.sig === "string" ? r.sig : null,
    ts: typeof r.ts === "number" ? r.ts : null,
  };
}
