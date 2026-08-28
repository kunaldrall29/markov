# Markov MVP v2 — Phase 0 (devnet)

Date: 2026-08-27. Source of truth for this tree. Where this file conflicts with older S0–S10 notes, this file wins. Diagrams: `docs/markov-architecture-v2.mermaid`, `docs/markov-gate-flow-v2.mermaid`, `docs/markov-strategy-vault-flow.mermaid`.

This repository **is** the six products (paths, not MarkovFyi remotes). Do not split the tree. Marketing at https://markovhq.com is out of scope. Litepaper claims stay v0.4 until a v0.5 file exists. Telegram username in FACTS is `markov_float_bot`.

## What changed from v1

1. **Strategy vaults (D2).** `PolicyTemplate v0` (SDK JSON) → `strategy_id = sha256(canonical_json(template))` on the mandate → stamped into every `ActionExecuted` and `ActionRefused`. No on-chain template storage, no pooling.
2. **x402: conformant only.** No or-fallback hedge. Facilitator + `X402_SETTLE_MINT` are open FACTS (`F-X402-SETTLE-MINT`).
3. **Three house operators:** `markov-steady`, `markov-momentum`, `markov-redteam`.
4. **Float is a strategy marketplace.** Cards are strategies. Subscribe = create-mandate-from-template with tighten-only overrides.
5. **Fan-out.** One strategy action iterates subscriber mandates (N txs). Batching is Phase 1.
6. **D1.** `unpause` is owner-only. Emergency key: pause + revoke only.
7. **Acceptance** is the 90-second script in §7.

## Frozen verbs and gates

`register_operator · create_mandate · fund · amend_policy · pause · unpause(owner) · revoke · owner_withdraw(any state) · execute_swap · execute_deposit · execute_withdraw_venue · spend`.

Gate order: state → expiry → operator → program allowlist → token allowlist → per-tx cap → daily cap → spend caps → slippage → CPI.

BlockReason (IDL / engine, never re-declared in UI): `Paused · Revoked · Expired · Unauthorized · ProgramNotAllowed · TokenNotAllowed · OverTxCap · OverDailyCap · OverSpendCap · OverSpendDailyCap · SlippageExceeded`.

## Out of scope

Pooling/NAV, real venues, batching, Score SDK, bonds/credit, mainnet, restyling markovhq.com, copilot, launch radar, token.

## §7 Acceptance (90-second demo)

1. Float strategy card showing actions, refusals.
2. Owner subscribes from template, lowers per-tx cap; funds stay in that owner's mandate.
3. Operator fan-out executes on A + B.
4. Mandate C (low cap) → `OverTxCap` refusal.
5. Telegram `/revoke` → next attempt `Revoked`.
6. Close: per-user policy inside one strategy — impossible in a pool.

Plus: redteam has emitted all 11 BlockReasons at least once (engine/API sweep); `owner_withdraw` in Revoked.

Live public-devnet program deploy/upgrade is **not** this file's job until vault-pinning + `strategy_id` bytecode is built and funded. That deploy landed 2026-08-28. Wallet-connected Float now builds unsigned mandate txs and confirms them before the engine HUD updates.
