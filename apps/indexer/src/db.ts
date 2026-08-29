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
  strategy_id: string | null;
  operator: string | null;
  venue: string | null;
  token: string | null;
  amount: number | null;
  action_type: string | null;
  event_index: number | null;
};

export type MandateRow = {
  id: string;
  owner: string;
  operator: string;
  state: string;
  created_ts: number | null;
  strategy_id: string | null;
};

function migrate(db: Database, file: string) {
  const sql = readFileSync(join(import.meta.dir, "../migrations", file), "utf8");
  db.exec(sql);
}

function tableColumns(db: Database, table: string): Set<string> {
  const rows = db.query(`pragma table_info(${table})`).all() as { name: string }[];
  return new Set(rows.map((r) => r.name));
}

function addColumn(db: Database, table: string, name: string, ddl: string) {
  if (tableColumns(db, table).has(name)) return;
  db.exec(`alter table ${table} add column ${ddl}`);
}

function recreateViews(db: Database) {
  db.exec(`drop view if exists strategy_stats`);
  db.exec(`drop view if exists operator_stats`);
  db.exec(`drop view if exists public_receipts`);
  db.exec(`
    create view strategy_stats as
    select
      strategy_id,
      sum(case when kind = 'ActionExecuted' then 1 else 0 end) as actions,
      sum(case when kind = 'ActionRefused' then 1 else 0 end) as refusals,
      case
        when sum(case when kind in ('ActionExecuted','ActionRefused') then 1 else 0 end) = 0 then 0.0
        else 1.0 * sum(case when kind = 'ActionRefused' then 1 else 0 end)
          / sum(case when kind in ('ActionExecuted','ActionRefused') then 1 else 0 end)
      end as refusal_rate,
      coalesce(sum(case when kind = 'ActionExecuted' then coalesce(amount, 0) else 0 end), 0) as volume
    from receipts
    where strategy_id is not null and strategy_id != ''
    group by strategy_id
  `);
  db.exec(`
    create view operator_stats as
    select
      operator,
      sum(case when kind = 'ActionExecuted' then 1 else 0 end) as actions,
      sum(case when kind = 'ActionRefused' then 1 else 0 end) as refusals,
      case
        when sum(case when kind in ('ActionExecuted','ActionRefused') then 1 else 0 end) = 0 then 0.0
        else 1.0 * sum(case when kind = 'ActionRefused' then 1 else 0 end)
          / sum(case when kind in ('ActionExecuted','ActionRefused') then 1 else 0 end)
      end as refusal_rate,
      coalesce(sum(case when kind = 'ActionExecuted' then coalesce(amount, 0) else 0 end), 0) as volume
    from receipts
    where operator is not null and operator != ''
    group by operator
  `);
  migrate(db, "0003_public_receipts.sql");
}

export function openDb(path = ":memory:"): Database {
  const db = new Database(path);
  db.exec("pragma journal_mode=WAL");
  migrate(db, "0001_init.sql");
  migrate(db, "0002_strategy.sql");
  addColumn(db, "mandates", "strategy_id", "strategy_id text");
  addColumn(db, "receipts", "strategy_id", "strategy_id text");
  addColumn(db, "receipts", "operator", "operator text");
  addColumn(db, "receipts", "venue", "venue text");
  addColumn(db, "receipts", "token", "token text");
  addColumn(db, "receipts", "amount", "amount integer");
  addColumn(db, "receipts", "action_type", "action_type text");
  addColumn(db, "receipts", "event_index", "event_index integer");
  db.exec(`create table if not exists indexer_state (
    id integer primary key check (id = 1),
    last_indexed_slot integer,
    last_rpc_slot integer,
    last_signature text,
    updated_ts integer
  )`);
  db.exec(`insert or ignore into indexer_state (id) values (1)`);
  db.exec(`create unique index if not exists receipts_sig_event_uidx on receipts (sig, event_index) where sig is not null and event_index is not null`);
  db.exec(`create index if not exists receipts_strategy_idx on receipts (strategy_id)`);
  db.exec(`create index if not exists receipts_public_ts_idx on receipts (ts desc, id desc)`);
  db.exec(`create index if not exists mandates_strategy_idx on mandates (strategy_id)`);
  recreateViews(db);
  return db;
}

export function upsertMandate(db: Database, row: MandateRow) {
  db.query(
    `insert into mandates (id, owner, operator, state, created_ts, strategy_id)
     values (?1, ?2, ?3, ?4, ?5, ?6)
     on conflict(id) do update set
       owner=excluded.owner,
       operator=excluded.operator,
       state=excluded.state,
       strategy_id=excluded.strategy_id`,
  ).run(row.id, row.owner, row.operator, row.state, row.created_ts, row.strategy_id);
}

export function upsertStrategy(
  db: Database,
  row: {
    strategy_id: string;
    operator: string;
    name: string | null;
    slug: string | null;
    template_json: string;
    published_at: number | null;
  },
) {
  db.query(
    `insert into strategies (strategy_id, operator, name, slug, template_json, published_at)
     values (?1, ?2, ?3, ?4, ?5, ?6)
     on conflict(strategy_id) do update set
       operator=excluded.operator,
       name=excluded.name,
       slug=excluded.slug,
       template_json=excluded.template_json`,
  ).run(row.strategy_id, row.operator, row.name, row.slug, row.template_json, row.published_at);
}

export function insertReceipt(db: Database, row: ReceiptRow) {
  db.query(
    `insert into receipts (mandate_id, kind, refused, reason, nonce, sig, ts, strategy_id, operator, venue, token, amount, action_type, event_index)
     values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
  ).run(
    row.mandate_id,
    row.kind,
    row.refused,
    row.reason,
    row.nonce,
    row.sig,
    row.ts,
    row.strategy_id,
    row.operator,
    row.venue,
    row.token,
    row.amount,
    row.action_type,
    row.event_index ?? null,
  );
}

/** Idempotent on (sig, event_index). Returns true when a new row was written. */
export function upsertReceipt(db: Database, row: ReceiptRow): boolean {
  if (row.sig && row.event_index != null) {
    const existing = db
      .query(`select id from receipts where sig = ?1 and event_index = ?2`)
      .get(row.sig, row.event_index) as { id: number } | null;
    if (existing) return false;
  }
  insertReceipt(db, row);
  return true;
}

export function upsertIndexerState(
  db: Database,
  patch: {
    lastIndexedSlot?: number | null;
    lastRpcSlot?: number | null;
    lastSignature?: string | null;
  },
) {
  const now = Math.floor(Date.now() / 1000);
  const cur = db.query(`select last_indexed_slot, last_rpc_slot, last_signature from indexer_state where id = 1`).get() as
    | { last_indexed_slot: number | null; last_rpc_slot: number | null; last_signature: string | null }
    | undefined;
  const lastIndexed = patch.lastIndexedSlot !== undefined ? patch.lastIndexedSlot : (cur?.last_indexed_slot ?? null);
  const lastRpc = patch.lastRpcSlot !== undefined ? patch.lastRpcSlot : (cur?.last_rpc_slot ?? null);
  const lastSig = patch.lastSignature !== undefined ? patch.lastSignature : (cur?.last_signature ?? null);
  db.query(
    `insert into indexer_state (id, last_indexed_slot, last_rpc_slot, last_signature, updated_ts)
     values (1, ?1, ?2, ?3, ?4)
     on conflict(id) do update set
       last_indexed_slot=excluded.last_indexed_slot,
       last_rpc_slot=excluded.last_rpc_slot,
       last_signature=excluded.last_signature,
       updated_ts=excluded.updated_ts`,
  ).run(lastIndexed, lastRpc, lastSig, now);
}

export function listReceipts(db: Database, mandateId?: string) {
  if (mandateId) {
    return db.query(`select * from receipts where mandate_id = ?1 order by id desc`).all(mandateId);
  }
  return db.query(`select * from receipts order by id desc`).all();
}

export function listStrategyStats(db: Database) {
  return db.query(`select * from strategy_stats`).all();
}

export function listOperatorStats(db: Database) {
  return db.query(`select * from operator_stats`).all();
}

const ACTION_TYPES = new Set(["swap", "deposit", "withdraw_venue", "spend"]);

export function fromEngineReceipt(r: Record<string, unknown>): ReceiptRow {
  const kind = String(r.type ?? "unknown");
  const refused = kind === "ActionRefused" ? 1 : 0;
  const amount =
    typeof r.amountIn === "number"
      ? r.amountIn
      : typeof r.requestedAmount === "number"
        ? r.requestedAmount
        : typeof r.amount === "number"
          ? r.amount
          : null;
  const token =
    typeof r.tokenIn === "string" ? r.tokenIn : typeof r.token === "string" ? r.token : null;
  const actionType = typeof r.kind === "string" && ACTION_TYPES.has(r.kind) ? r.kind : null;
  return {
    mandate_id: String(r.mandateId ?? ""),
    kind,
    refused,
    reason: typeof r.reason === "string" ? r.reason : null,
    nonce: typeof r.nonce === "number" ? r.nonce : null,
    sig: typeof r.sig === "string" ? r.sig : null,
    ts: typeof r.ts === "number" ? r.ts : null,
    strategy_id: typeof r.strategyId === "string" ? r.strategyId : null,
    operator: typeof r.operator === "string" ? r.operator : typeof r.by === "string" ? r.by : null,
    venue: typeof r.venue === "string" ? r.venue : null,
    token,
    amount,
    action_type: actionType,
    event_index: typeof r.eventIndex === "number" ? r.eventIndex : null,
  };
}
