# Markov MVP v2.2 — Phase 0 (devnet)

Date: 2026-08-29. **v2.2 supersedes v2.1 / the 2026-08-27 body where they conflict.** Source of truth for this tree. Diagrams: `docs/markov-architecture-v2.mermaid`, `docs/markov-gate-flow-v2.mermaid`, `docs/markov-strategy-vault-flow.mermaid`.

This repository **is** the product tree (paths, not MarkovFyi remotes until A1 lands). Do not split the tree. Marketing at https://markovhq.com is out of scope for restyle. Telegram username in FACTS is `markov_float_bot`.

## v2.2 corrections (apply over v2.1)

1. **Data layer is Railway Postgres, not Supabase.** Every "Supabase `markov-devnet`" line is wrong. Migrations, `public_receipts`, and `waitlist` live in Railway Postgres, SQL in this repo. Env: `DATABASE_URL` replaces `SUPABASE_URL` / `SUPABASE_SERVICE_KEY`.
2. **Indexer is chain-native.** It subscribes to program logs via Helius WS (`SOLANA_WS_URL`), parses Anchor events, and is the **only** writer of receipts. The API-ledger sync path is removed, not a fallback.
3. **Docs site is a fourth hosted surface** (`markov-docs`, Vercel) at `docs.markovhq.com`.
4. **x402 facilitator settlement is grant milestone M2, not MVP.** MVP ships in-program spend budgets with `OverSpendCap` / `OverSpendDailyCap` on-chain against the priced demo endpoint. `F-X402-SETTLE-MINT` is deferred-M2, not open-blocking.
5. **Canonical domains (Decision 0 resolved):** `markovhq.com` (marketing), `float.markovhq.com` (Float + public receipts at `/receipts`), `docs.markovhq.com`, `api.markovhq.com` (data-api). `app.markovhq.com` 301 → float. `markov.fyi` apex + wildcard 301 → markovhq.com equivalents; redirect-only, never a product host. Handle stays @markovfyi.
6. **Definition of done unchanged:** the 90-second demo passes *against hosted surfaces*, all 11 BlockReasons exist on chain, and `docs/prompt-mvp-status-audit.md` prints GO.

## What changed from v1

1. **Strategy vaults (D2).** `PolicyTemplate v0` (SDK JSON) → `strategy_id = sha256(canonical_json(template))` on the mandate → stamped into every `ActionExecuted` and `ActionRefused`. No on-chain template storage, no pooling.
2. **x402: in-program budgets on MVP.** Facilitator + `X402_SETTLE_MINT` are M2 (`F-X402-SETTLE-MINT`).
3. **Three house operators:** `markov-steady`, `markov-momentum`, `markov-redteam` — three distinct on-chain keypairs, never a shared key.
4. **Float is a strategy marketplace.** Cards are strategies. Subscribe = create-mandate-from-template with tighten-only overrides.
5. **Fan-out.** One strategy action iterates subscriber mandates (N txs). Batching is Phase 1.
6. **D1.** `unpause` is owner-only. Emergency key: pause + revoke only.
7. **Acceptance** is the 90-second script in §7, against hosted URLs.

## Frozen verbs and gates

`register_operator · create_mandate · fund · amend_policy · pause · unpause(owner) · revoke · owner_withdraw(any state) · execute_swap · execute_deposit · execute_withdraw_venue · spend`.

Gate order: state → expiry → operator → program allowlist → token allowlist → per-tx cap → daily cap → spend caps → slippage → CPI.

BlockReason (IDL / engine, never re-declared in UI): `Paused · Revoked · Expired · Unauthorized · ProgramNotAllowed · TokenNotAllowed · OverTxCap · OverDailyCap · OverSpendCap · OverSpendDailyCap · SlippageExceeded`.

## Out of scope

Pooling/NAV, real venues, batching, Score SDK, bonds/credit, mainnet, restyling markovhq.com, copilot, launch radar, token, websockets/SSE, historical charts, per-operator pages, auth on `/v1/receipts`, Supabase, x402 facilitator settlement (M2).

## §7 Acceptance (90-second demo)

Against **hosted** surfaces (`float.markovhq.com`, Railway API, `api.markovhq.com`, `https://float.markovhq.com/receipts`). Local engine / `data/ledger.json` never counts.

1. Float strategy card showing actions, refusals.
2. Owner subscribes from template, lowers per-tx cap; funds stay in that owner's mandate.
3. Operator fan-out executes on A + B (two signatures).
4. Mandate C (low cap) → `OverTxCap` refusal (third signature). Same `strategy_id` on all three.
5. Telegram `/revoke` → next attempt `Revoked`.
6. Close: per-user policy inside one strategy — impossible in a pool.

Plus: redteam has emitted all 11 BlockReasons as real devnet transactions; `owner_withdraw` in Revoked.

Live public-devnet program (vault-pinning + `strategy_id`) landed 2026-08-28. Wallet-connected Float builds unsigned mandate txs and confirms them before the engine HUD updates.
