# Markov — Documentation Map

This workspace is a **Phase 0 monorepo**. The six named products below are the intended repo split; until then, paths in this table are canonical. Status: **now** (in this commit), **Sn** (written in that build session, from real code), or **phase** (post-MVP).

Rule: a doc that describes code is written from the code, never before it.

## Principles

1. Every external claim carries source + date (`docs/FACTS.md`). If it isn't verified, it isn't documented.
2. Public claims must match litepaper v0.4. When docs and litepaper drift, the litepaper wins and the doc gets fixed.
3. Refusals are documented as features, not errors — every doc that shows an action shows its refusal path.
4. Each surface is self-explaining: README answers "what is this and how do I run it" without leaving the tree.

## markov-program → `programs/`, `SPEC.md`, `SECURITY.md`

| Doc | Path | Purpose | When |
|---|---|---|---|
| README.md | `programs/mandate/README.md` | What Markov is, the primitive, gate order, layout, status | now |
| SPEC.md | `SPEC.md` | Accounts, instructions, events, BlockReason, invariants | now |
| SECURITY.md | `SECURITY.md` | Authority model, invariants, reporting | now |
| docs/FACTS.md | `docs/FACTS.md` | Verified external claims, source + date | S0, grows every session |
| docs/gates.md | — | Gate order table: gate → reason → event | S2 |
| docs/venues.md | — | Adapter interface for venue programs | S3 |
| CLAUDE.md, SESSION_LOG.md | `CLAUDE.md`, `SESSION_LOG.md` | Working agreement, session handoffs | S0 |

## markov-sdk → `packages/sdk`, `packages/engine`

| Doc | Path | Purpose | When |
|---|---|---|---|
| README.md | `packages/sdk/README.md` | Quickstart: propose a guarded action in ~20 lines | S4 |
| SKILL.md | `packages/sdk/SKILL.md` | Agent skill: operate a mandate correctly | now |
| llms.txt | `llms.txt` | Machine-readable project summary | now |
| docs/guarded-result.md | — | GuardedResult + blockedBy handling table | S4 |
| docs/soft-gates.md | — | Freshness, idempotency, local halt | S4 |
| docs/paid-fetch.md | — | x402 spend flow (branch chosen at S5) | S5 |

## float-web → `apps/web`, `apps/api`

README (run + deploy, S7) · docs/indexer.md (event parsing, tables, REST, S7) · docs/policy-presets.md (default policies + reasoning, S7).

## float-agents → `apps/agents`

README (runner env + commands, S6) · docs/data-api.md (paid endpoint, chosen x402 branch, S5) · docs/demo.md → moves to `DEMO.md` (four-beat script, S9) · scripts/README (seed + reset, S9).

## float-bot → `apps/bot`

README (setup, /link flow, S8) · SECURITY.md (three-sentence authority model, S8).

## markov-site (markov.fyi)

Landing is **live** at [markovhq.com](https://markovhq.com) and is **not this repository**. Site docs IA (/litepaper, /docs) goes live at S9; until then GitHub is canonical.

Intended site IA (do not treat these URLs as live until FACTS says so):

- Concepts: mandates · policy · receipts and refusals · the kill switch · the credit ladder
- Guides: for owners · for operators · for venues
- Reference: program (from SPEC.md) · SDK · BlockReason · data API
- Security: authority model · threat model (litepaper §10) · disclosure
- `llms.txt` at site root

## Future skills (post-MVP)

markov-client SKILL.md (owner-side, Phase 1) · markov-score SKILL.md (reputation queries, Phase 2). Same format as `packages/sdk/SKILL.md`.
