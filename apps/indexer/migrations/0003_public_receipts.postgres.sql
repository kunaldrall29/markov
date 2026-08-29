-- Apply on Railway Postgres (DATABASE_URL). The chain indexer is the only writer.
-- Read-only public surface. data-api queries this view only.

alter table receipts add column if not exists strategy_id text;
alter table receipts add column if not exists operator text;
alter table receipts add column if not exists venue text;
alter table receipts add column if not exists token text;
alter table receipts add column if not exists amount bigint;
alter table receipts add column if not exists action_type text;

create index if not exists receipts_public_ts_idx on receipts (ts desc, id desc);

drop view if exists public.public_receipts;
create view public.public_receipts as
select
  cast(id as text) as receipt_id,
  ts,
  mandate_id as mandate,
  operator,
  coalesce(
    action_type,
    case
      when venue in ('demo_swap', 'demoSwap') then 'swap'
      when venue in ('demo_yield', 'demoYield') then 'deposit'
      else null
    end
  ) as action_type,
  venue,
  token,
  amount,
  case
    when refused = 1 or kind = 'ActionRefused' then 'blocked'
    else 'allowed'
  end as result,
  case
    when refused = 1 or kind = 'ActionRefused' then reason
    else null
  end as block_reason,
  sig as tx_sig
from receipts
where kind in ('ActionExecuted', 'ActionRefused')
  and ts is not null;

comment on view public.public_receipts is 'Public Receipt Read Model (SPEC.md). Exposed fields only.';

revoke all on public.public_receipts from public;
revoke all on public.public_receipts from anon;
revoke all on public.public_receipts from authenticated;
grant select on public.public_receipts to service_role;
