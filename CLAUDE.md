# Working agreement

This is the Phase 0 Markov monorepo (protocol semantics + Float). Marketing at https://markovhq.com is a different property — do not rebuild or restyle it.

## Canon

| Source | Use |
|---|---|
| Litepaper v0.4 | Public protocol claims |
| `docs/PITCH.md` | Internal pitch / copy source |
| `docs/FACTS.md` | Only sourced numbers leave the repo |
| `SPEC.md` | Engine/program semantics |
| `SECURITY.md` | Authority model |
| `docs/MAP.md` | Which docs exist vs which wait for code |
| `packages/sdk/SKILL.md` | How operators must behave |

If docs and litepaper disagree, litepaper wins and the doc is wrong.

## Code vs docs

A document that describes code is written from the code, never before it. Do not add `docs/gates.md`, `docs/venues.md`, `docs/guarded-result.md`, `docs/soft-gates.md`, or `docs/paid-fetch.md` until the sessions in `docs/MAP.md` have produced that code.

Refusals are features. Every execute path has an `ActionRefused` path with a `BlockReason`.

## Unpause

`unpause` is owner-only. Emergency key: pause + revoke only. Do not “fix” this to let the bot resume.

## Stack

Bun workspaces. No npm/yarn lockfiles. Engine tests: `bun test`. Demo: `bun run demo`. Dev: `bun run dev` (API `:8787`, Float `:3000`).

## Phase 0 freeze

In: mandates, allowlists, caps, x402 spend budget, action **and** refusal receipts, Float, revoke-only bot, first-party agents (DCA, dip, yield), four-beat demo.

Out: copilot, launch radar, pooled mandates, score/bonds/credit, token, landing-page work, real Jupiter/Orca unless proven.

## Handoff

Append `SESSION_LOG.md` when you stop. Next session starts there.
