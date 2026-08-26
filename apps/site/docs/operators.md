---
title: For operators
---

# For operators

Use `@markovfyi/operator`. Propose swap, deposit, or spend. Read `GuardedResult`. Never call venue programs with the operator key. Never withdraw.

On `blockedBy: "Revoked"`, halt that mandate. Do not retry the same intent after a block; change size, route, or stop.

Skill: `packages/sdk/SKILL.md`. HTTP client: `@markov/sdk` against `apps/api`.
