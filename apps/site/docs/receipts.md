---
title: Receipts and refusals
---

# Receipts and refusals

Events: MandateCreated, MandateFunded, PolicyAmended, ActionExecuted, ActionRefused, Paused, Unpaused, Revoked, OwnerWithdrew.

Exactly one of ActionExecuted or ActionRefused per execute or spend. A refusal increments nonce and mutates no vault, no spentToday, no spendToday.

Refusals are successful transactions. `GuardedResult.status === "blocked"` is data. Do not treat it as `err`.

Anchor EventParser emits camelCase (`actionRefused`). Compare case-insensitively.
