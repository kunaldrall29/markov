import { SQL } from "bun";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Database } from "bun:sqlite";

const clients = new Map<string, SQL>();
const schemaApplied = new Set<string>();

export function postgresUrl(): string | null {
  const url = process.env.DATABASE_URL?.trim();
  return url || null;
}

export function postgresClient(url = postgresUrl()): SQL | null {
  if (!url) return null;
  let sql = clients.get(url);
  if (!sql) {
    sql = new SQL(url);
    clients.set(url, sql);
  }
  return sql;
}

export async function applyPostgresSchema(url = postgresUrl()): Promise<boolean> {
  const sql = postgresClient(url);
  if (!sql || !url) return false;
  if (schemaApplied.has(url)) return true;
  const file = join(import.meta.dir, "../migrations/postgres_boot.sql");
  await sql.unsafe(readFileSync(file, "utf8"));
  schemaApplied.add(url);
  return true;
}

export async function replacePostgresReceipts(db: Database, url = postgresUrl()): Promise<number> {
  if (!url) return 0;
  await applyPostgresSchema(url);
  const sql = postgresClient(url);
  if (!sql) return 0;
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
