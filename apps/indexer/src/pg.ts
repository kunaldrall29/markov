import { SQL } from "bun";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Database } from "bun:sqlite";

export function postgresUrl(): string | null {
  const url = process.env.DATABASE_URL?.trim();
  return url || null;
}

export async function applyPostgresSchema(url = postgresUrl()): Promise<boolean> {
  if (!url) return false;
  const sql = new SQL(url);
  const file = join(import.meta.dir, "../migrations/postgres_boot.sql");
  await sql.unsafe(readFileSync(file, "utf8"));
  return true;
}

export async function replacePostgresReceipts(db: Database, url = postgresUrl()): Promise<number> {
  if (!url) return 0;
  await applyPostgresSchema(url);
  const sql = new SQL(url);
  const rows = db.query(`select * from receipts`).all() as Array<{
    mandate_id: string;
    kind: string;
    refused: number;
    reason: string | null;
    nonce: number | null;
    sig: string | null;
    ts: number | null;
    strategy_id: string | null;
    operator: string | null;
    venue: string | null;
    token: string | null;
    amount: number | null;
    action_type: string | null;
  }>;
  await sql`delete from receipts`;
  for (const row of rows) {
    await sql`
      insert into receipts (
        mandate_id, kind, refused, reason, nonce, sig, ts,
        strategy_id, operator, venue, token, amount, action_type
      ) values (
        ${row.mandate_id}, ${row.kind}, ${row.refused}, ${row.reason}, ${row.nonce}, ${row.sig}, ${row.ts},
        ${row.strategy_id}, ${row.operator}, ${row.venue}, ${row.token}, ${row.amount}, ${row.action_type}
      )
    `;
  }
  return rows.length;
}
