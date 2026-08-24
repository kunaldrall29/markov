# Markov

The mandate layer for Solana. Non-custodial accounts where an owner deposits capital and an operator — an AI agent or a human strategist — can act on it only within a policy the program enforces. Withdrawal authority never leaves the owner. Every action, and every refusal, emits an on-chain receipt.

Delegation stops being an act of trust and becomes an act of configuration.

## Status in this workspace

**Pre-audit. No mainnet. Do not use with real value.**

| Layer | Path | Status |
|---|---|---|
| Spec-faithful runtime | `packages/engine` | Live. Float, agents, and the bot talk to this. |
| On-chain port | `programs/mandate` | `src/lib.rs` present. Not deployed. Must stay 1:1 with `SPEC.md`. |
| Devnet venue stubs | `programs/demo_swap`, `programs/demo_yield` | Rust sources exist; not deployed. |

Quickstart for the live stack is in the [workspace README](../../README.md). `anchor test` lands with the on-chain port. Until then: `bun test` and `bun run demo`.

## The primitive

One program, one object, many verbs. A **mandate** holds the owner's assets and binds an operator to a **policy**:

- Program allowlist — the only venues the operator may touch
- Token allowlist — the only assets the mandate may hold
- Per-transaction and daily (UTC-day) notional caps
- Spend budget — x402 payments for data and services, capped per call and per day
- Execution bounds — max slippage at CPI time
- Expiry — mandates end by default
- Revocation — unconditional, instant, owner or emergency key

**Verbs:** `register_operator` · `create_mandate` · `fund` · `amend_policy` · `pause` · `unpause` (owner only) · `revoke` · `owner_withdraw` (any state, always) · `execute_swap` / `execute_deposit` / `execute_withdraw_venue` · `spend`.

## The gate stack (fixed order, fail-closed)

state → expiry → operator signature → program allowlist → token allowlist → per-tx cap → daily cap → spend caps → slippage bound → CPI

A proposal that fails any gate emits a refusal receipt with a machine-readable reason:

`Paused | Revoked | Expired | Unauthorized | ProgramNotAllowed | TokenNotAllowed | OverTxCap | OverDailyCap | OverSpendCap | OverSpendDailyCap | SlippageExceeded`

Refusals are receipts. The record shows not only what an operator did, but what the policy stopped.

## Invariants

1. No instruction moves vault funds anywhere except an allowlisted-venue CPI or the owner.
2. `owner_withdraw` succeeds in every state, including Revoked.
3. The emergency key can pause and revoke — nothing else. Unpause is owner-only, because restoring operator authority is not a protective action.
4. Every execute/spend path emits exactly one `ActionExecuted` or `ActionRefused`.
5. Every `BlockReason` variant has at least one negative test. No test, no merge.

## Workspace layout

- `packages/engine` — live semantics (TypeScript)
- `programs/mandate` — protocol port
- `programs/demo_swap`, `programs/demo_yield` — venue stubs behind the adapter shape mainnet venues will use (`docs/venues.md` lands at S3 from that interface)
- `packages/engine/tests` — lifecycle, gates, and the negative-test matrix
- [`SPEC.md`](../../SPEC.md) — accounts, instructions, events, invariants
- [`SECURITY.md`](../../SECURITY.md) — authority model and disclosure

## Ecosystem

Protocol and SDKs are open source and never credit-gated. The hosted product — Float — is in `apps/web` (marketplace, console, kill switch) and `apps/bot` (pause/revoke only). Marketing site: [markovhq.com](https://markovhq.com) (not this repo). Litepaper: v0.4.
