-- Public Receipt Read Model (SPEC.md). SQLite (indexer) and Railway Postgres share these column names.
drop view if exists public_receipts;
create view public_receipts as
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
