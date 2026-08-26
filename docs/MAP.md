# Markov — Documentation Map

This repository **is** the six products. Each name is a path here, not a future remote.

Rule: a doc that describes code is written from the code, never before it.

## Principles

1. Every external claim carries source + date (`docs/FACTS.md`). If it isn't verified, it isn't documented.
2. Public claims must match litepaper v0.4. When docs and litepaper drift, the litepaper wins and the doc gets fixed.
3. Refusals are documented as features, not errors — every doc that shows an action shows its refusal path.
4. Each surface README answers "what is this and how do I run it" without leaving that tree.

## markov-program → `programs/`

| Doc | Path |
|---|---|
| README | `programs/mandate/README.md` |
| SPEC | `SPEC.md` |
| SECURITY | `SECURITY.md` |
| FACTS | `docs/FACTS.md` |
| gates | `docs/gates.md` |
| venues | `docs/venues.md` |

## markov-sdk → `packages/sdk`, `packages/engine`, `packages/operator`

| Doc | Path |
|---|---|
| HTTP client README | `packages/sdk/README.md` |
| Operator README | `packages/operator/README.md` |
| SKILL | `skills/markov-mandates/SKILL.md` · `packages/sdk/SKILL.md` |
| GuardedResult | `docs/guarded-result.md` |
| Soft gates | `docs/soft-gates.md` |
| paidFetch | `docs/paid-fetch.md` |

## float-web → `apps/web`, `apps/api`, `apps/indexer`

`apps/web/README.md` · `apps/indexer/README.md`

## float-agents → `apps/agents`, `apps/data-api`

`apps/agents/README.md` · `apps/data-api/README.md`

## float-bot → `apps/bot`

`apps/bot/README.md`

## markov-site → `apps/site`

Docusaurus host in this repo (`bun run --filter @markov/site dev`, `:3001`). Free, in-repo. Marketing at [markovhq.com](https://markovhq.com) is a different property and is not restyled here.

Live docs routes: `/` · `/docs` · `/docs/mandates` · `/docs/policy` · `/docs/receipts` · `/docs/kill-switch` · `/docs/owners` · `/docs/operators` · `/docs/venues` · `/docs/program` · `/docs/sdk` · `/docs/block-reason` · `/docs/data-api` · `/docs/security` · `/llms.txt`
