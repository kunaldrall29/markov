# Markov

The mandate layer for Solana. Non-custodial accounts where an owner deposits capital and an operator — an AI agent or a human strategist — can act on it only within a policy the program enforces. Withdrawal authority never leaves the owner. Every action, and every refusal, emits a receipt.

Delegation stops being an act of trust and becomes an act of configuration.

This repository **is** the Phase 0 product: protocol, SDK, Float, agents, bot, and docs. Six named surfaces are directories here. Marketing is live at [markovhq.com](https://markovhq.com) and is **not** this repo.

Consumer line: **Give an agent your capital. Keep the keys.**

| Canon | Path |
|---|---|
| Litepaper (protocol claims) | v0.4 |
| Internal pitch | [`docs/PITCH.md`](docs/PITCH.md) |
| Claims ledger | [`docs/FACTS.md`](docs/FACTS.md) |
| Spec | [`SPEC.md`](SPEC.md) |
| Security / disclosure | [`SECURITY.md`](SECURITY.md) |
| Doc map | [`docs/MAP.md`](docs/MAP.md) |
| Operator skill | [`skills/markov-mandates/SKILL.md`](skills/markov-mandates/SKILL.md) · [`packages/sdk/SKILL.md`](packages/sdk/SKILL.md) |
| Machine summary | [`llms.txt`](llms.txt) |

## The primitive

A **mandate** holds the owner's assets and binds an operator to a **policy**: program allowlist, token allowlist, per-transaction and UTC-day notional caps, x402 spend budgets, max slippage, expiry, instant revoke.

**Verbs:** `register_operator` · `create_mandate` · `fund` · `amend_policy` · `pause` · `unpause` (owner only) · `revoke` · `owner_withdraw` (any state) · `execute_swap` / `execute_deposit` / `execute_withdraw_venue` · `spend`.

Gate stack (fixed, fail-closed): state → expiry → operator → program allowlist → token allowlist → per-tx cap → daily cap → spend caps → slippage → CPI.

Refusals emit `ActionRefused` (`ActionRefused` in the live engine) with a `BlockReason`. Refusals are receipts, not errors.

## Four-beat demo (the climax is a refusal)

1. Create a mandate and fund it (USDC-d).
2. Agent pays for a quote (x402 spend) and trades under policy. Receipts land in the console.
3. Over-cap intent is refused: `blocked: over_cap`.
4. Emergency bot revokes. Next operator action is `blocked: revoked`. Owner withdraw still works.

## Workspace

| Product | Path |
|---|---|
| markov-program | `programs/` |
| markov-sdk | `packages/sdk`, `packages/engine`, `packages/operator` |
| float-web | `apps/web`, `apps/api`, `apps/indexer` |
| float-agents | `apps/agents`, `apps/data-api` |
| float-bot | `apps/bot` |
| markov-site | `apps/site` (Docusaurus, :3001 docs) |

Demo mints: **USDC-d**, **DEMO**. Venues are stubs with the adapter shape mainnet venues will use.

## Run

Requires [Bun](https://bun.sh).

```bash
bun install
bun test
bun run demo          # four-beat, in-process
bun run dev           # API :8787 + Float :3000 + docs :3001
bun run dev:services  # data-api :8788 + indexer :8790 + bot :8789
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) and click **Run four-beat demo**. Docs: [http://127.0.0.1:3001](http://127.0.0.1:3001). No wallet extension on this prototype.

```bash
bun run --filter @markov/agents start dca <mandateId>
bun run --filter @markov/bot start '/revoke <mandateId>'
```

Set `TELEGRAM_BOT_TOKEN` to attach the same revoke-only commands to Telegram.

On-chain: `bun run devnet:setup` deploys to Solana devnet (needs SOL). `bun run demo:devnet` runs the live four-beat. Toolchain and program IDs: `docs/FACTS.md`.

## Scope freeze (Phase 0)

In: mandates, allowlists, caps, x402 spend budget, executed **and** refused receipts, Float, revoke-only bot, first-party agents, four-beat demo.

Out: copilot, launch radar, pooled mandates, score/bonds/credit, token, marketing page, this repo restyling markovhq.com.
