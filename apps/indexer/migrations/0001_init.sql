-- Receipt index. Postgres (DATABASE_URL) or local SQLite use the same names.
create table if not exists operators (
  authority text primary key,
  name text,
  uri text,
  fee_bps integer
);

create table if not exists mandates (
  id text primary key,
  owner text not null,
  operator text not null,
  state text not null,
  created_ts bigint
);

create table if not exists receipts (
  id integer primary key,
  mandate_id text not null,
  kind text not null,
  refused integer not null default 0,
  reason text,
  nonce integer,
  sig text,
  ts bigint
);

create index if not exists receipts_mandate_idx on receipts (mandate_id, id desc);
