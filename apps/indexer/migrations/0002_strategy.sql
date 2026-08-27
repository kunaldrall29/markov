-- Strategy vaults (MVP v2). Column adds and views are applied in db.ts so existing SQLite files migrate.
create table if not exists strategies (
  strategy_id text primary key,
  operator text not null,
  name text,
  slug text,
  template_json text not null,
  published_at bigint
);
