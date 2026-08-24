# Mandate program (Phase 1 port)

Phase 0 ships a spec-faithful TypeScript runtime so Float, agents, and the bot can be exercised end to end without a validator.

This directory is the on-chain port. The instruction surface must stay identical to `packages/engine`:

| Instruction | Who | Effect |
|---|---|---|
| `register_operator` | operator | Profile PDA |
| `create_mandate` | owner | Mandate PDA + vault ATAs, policy, optional emergency key |
| `fund` | owner | SPL transfer into vault |
| `amend_policy` | owner | Replace policy (not while revoked) |
| `pause` / `unpause` | owner or emergency / owner | Freeze operator |
| `revoke` | owner or emergency | Terminal. Operator dead. Owner withdraw still works |
| `owner_withdraw` | owner | Any state |
| `execute_swap` / `execute_deposit` / `execute_withdraw_venue` | operator | CPI to allowlisted venue after gates |
| `spend` | operator | Budgeted x402 transfer + nonce memo |

Gate order is fail-closed and fixed: state → expiry → operator → program allowlist → token allowlist → per-tx cap → daily cap → spend caps → slippage → CPI.

Every execute/spend path emits exactly one `ActionExecuted` or `ActionRefused` with a `BlockReason`.

Stack: Anchor, classic SPL token, remaining-accounts venue adapters. Devnet venues in Phase 0 are stubs (`demo_swap`, `demo_yield`); real Jupiter/Orca adapters are Phase 1.
