# Markov engine spec (Phase 0)

Local runtime that Float talks to. Semantics are the mandate spec; the Anchor port lives in `programs/mandate`.

## Accounts

- Operator: authority, name, fee bps
- Mandate: owner, operator, emergency key, policy, state (`Active|Paused|Revoked`), expiry, UTC day buckets, vault balances, yield shares
- Vault: only owner can withdraw; operator may only move funds via allowlisted venue CPIs or budgeted `spend`

## Policy

- program allowlist (≤4)
- token allowlist (≤4)
- per-tx notional cap
- UTC-day notional cap
- x402 spend per-call and daily caps
- max slippage bps

## Block reasons

`Paused Revoked Expired Unauthorized ProgramNotAllowed TokenNotAllowed OverTxCap OverDailyCap OverSpendCap OverSpendDailyCap SlippageExceeded`

Refusals do not mutate spent/spend buckets.

## Demo venues

- `demo_swap`: constant-rate pool USDC-d ↔ DEMO
- `demo_yield`: share accounting with adjustable share value
- `x402`: budgeted USDC-d transfer to a recipient with nonce memo
