# Markov

The trust layer for capital in the agent economy. This repo is the Phase 0 prototype: mandate engine, Float (marketplace + console + kill switch), revoke-only Telegram bot, first-party agents (DCA, dip-buyer, yield rotation), and the four-beat demo.

Consumer line: **Give an agent your capital. Keep the keys.**

Internal canon: [`docs/PITCH.md`](docs/PITCH.md). Claims ledger: [`docs/FACTS.md`](docs/FACTS.md). Engine semantics: [`docs/SPEC.md`](docs/SPEC.md). Litepaper claims: v0.4.

The marketing site is live at [markovhq.com](https://markovhq.com) and is **not** this repository.

## Four-beat demo (the climax is a refusal)

1. Create a mandate and fund it (USDC-d).
2. Agent pays for a quote (x402 spend) and trades under policy. Receipts land in the console.
3. Over-cap intent is refused on screen: `blocked: over_cap`.
4. Emergency bot revokes. Next operator action is `blocked: revoked`. Owner withdraw still works.

## Stack

| Piece | Path | Notes |
|---|---|---|
| Mandate engine | `packages/engine` | Fail-closed gates, action + refusal receipts |
| SDK | `packages/sdk` | HTTP client |
| API | `apps/api` | Hono, persists `data/ledger.json` |
| Float | `apps/web` | Next.js marketplace + console |
| Agents | `apps/agents` | DCA, dip, yield |
| Bot | `apps/bot` | Pause/revoke only |
| Anchor port | `programs/mandate` | Instruction map; runtime is the engine until the validator lands |

Demo mints: **USDC-d**, **DEMO**. Venues are stubs with the same adapter shape mainnet venues will use.

## Run

Requires [Bun](https://bun.sh).

```bash
bun install
bun test
bun run demo          # four-beat, in-process
bun run dev           # API :8787 + Float :3000
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) and click **Run four-beat demo**. No wallet extension on this prototype.

```bash
bun run --filter @markov/agents start dca <mandateId>
bun run --filter @markov/bot start '/revoke <mandateId>'
```

Set `TELEGRAM_BOT_TOKEN` to attach the same revoke-only commands to Telegram.

## Scope freeze (Phase 0)

In: mandates, allowlists, caps, x402 spend budget, executed **and** refused receipts, Float, revoke-only bot, first-party agents, four-beat demo.

Out: copilot, launch radar, pooled mandates, score/bonds/credit, token, marketing page.
