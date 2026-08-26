---
title: BlockReason
---

# BlockReason

```
Paused | Revoked | Expired | Unauthorized
ProgramNotAllowed | TokenNotAllowed
OverTxCap | OverDailyCap
OverSpendCap | OverSpendDailyCap
SlippageExceeded
```

Gate order, fail-closed, first match wins. Written from `MandateEngine.gate`. Stub venues run this same stack; they fake liquidity, never enforcement.

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

UTC day is `floor(unix_ts / 86400)`, not a rolling 24h window. Source: `MandateEngine.gate` and repo `docs/gates.md`.
