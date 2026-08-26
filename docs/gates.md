# Gate order

Written from `MandateEngine.gate` in `packages/engine/src/engine.ts`. Fail-closed. First matching reason wins. Stub venues run this same stack; they fake liquidity, never enforcement.

UTC day is `floor(unix_ts / 86400)`, not a rolling 24h window. Day buckets roll on execute before gates. A refusal increments `nonce` and emits `ActionRefused`. It does not mutate `spentToday`, `spendToday`, vault, or yield shares.

| # | Gate | BlockReason |
|---|---|---|
| 1 | `state == Paused` | `Paused` |
| 2 | `state == Revoked` | `Revoked` |
| 3 | `now >= expiresTs` | `Expired` |
| 4 | caller ≠ operator | `Unauthorized` |
| 5 | program not on allowlist | `ProgramNotAllowed` |
| 6 | involved mint not on allowlist | `TokenNotAllowed` |
| 7 | spend: amount > spendPerCallCap | `OverSpendCap` |
| 8 | spend: spendToday + amount > spendDailyCap | `OverSpendDailyCap` |
| 9 | non-spend: notional > perTxCap | `OverTxCap` |
| 10 | non-spend: spentToday + notional > dailyCap | `OverDailyCap` |
| 11 | swap: minOut above expected, or expected below policy min | `SlippageExceeded` |
| 12 | CPI / venue apply | (accept) |

Spend returns after 7–8 and skips 9–11. Admin auth failures throw (transaction fails). Operator gate failures succeed as `ActionRefused`.
