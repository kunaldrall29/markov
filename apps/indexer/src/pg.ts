import { SQL } from "bun";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReceiptRow } from "./db";

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

export async function upsertPostgresReceipt(row: ReceiptRow, url = postgresUrl()): Promise<boolean> {
  if (!url) return false;
  await applyPostgresSchema(url);
  const sql = postgresClient(url);
  if (!sql) return false;
  if (row.sig && row.event_index != null) {
    const existing = await sql`
      select id from receipts where sig = ${row.sig} and event_index = ${row.event_index} limit 1
    `;
    if (Array.isArray(existing) && existing.length > 0) return false;
  }
  try {
    await sql`
      insert into receipts (
        mandate_id, kind, refused, reason, nonce, sig, ts,
        strategy_id, operator, venue, token, amount, action_type, event_index
      ) values (
        ${row.mandate_id}, ${row.kind}, ${row.refused}, ${row.reason}, ${row.nonce}, ${row.sig}, ${row.ts},
        ${row.strategy_id}, ${row.operator}, ${row.venue}, ${row.token}, ${row.amount}, ${row.action_type}, ${row.event_index}
      )
    `;
  } catch {
    return false;
  }
  return true;
}

export async function upsertPostgresState(
  state: {
    lastIndexedSlot: number | null;
    lastRpcSlot: number | null;
    lastSignature: string | null;
    updatedTs: number | null;
  },
  url = postgresUrl(),
): Promise<void> {
  if (!url) return;
  await applyPostgresSchema(url);
  const sql = postgresClient(url);
  if (!sql) return;
  await sql`
    insert into indexer_state (id, last_indexed_slot, last_rpc_slot, last_signature, updated_ts)
    values (1, ${state.lastIndexedSlot}, ${state.lastRpcSlot}, ${state.lastSignature}, ${state.updatedTs})
    on conflict (id) do update set
      last_indexed_slot = excluded.last_indexed_slot,
      last_rpc_slot = excluded.last_rpc_slot,
      last_signature = excluded.last_signature,
      updated_ts = excluded.updated_ts
  `;
}

export async function readPostgresHealth(url = postgresUrl()): Promise<{
  lastIndexedSlot: number | null;
  lastRpcSlot: number | null;
} | null> {
  if (!url) return null;
  const sql = postgresClient(url);
  if (!sql) return null;
  try {
    const rows = (await sql`
      select last_indexed_slot, last_rpc_slot from indexer_state where id = 1
    `) as Array<{ last_indexed_slot: number | null; last_rpc_slot: number | null }>;
    const row = rows[0];
    if (!row) return { lastIndexedSlot: null, lastRpcSlot: null };
    return { lastIndexedSlot: row.last_indexed_slot, lastRpcSlot: row.last_rpc_slot };
  } catch {
    return null;
  }
}
