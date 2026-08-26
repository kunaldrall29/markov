---
title: Mandates
---

# Mandates

A mandate is a fenced account: owner, operator, optional emergency key, policy, vault, expiry. State is Active, Paused, or Revoked. Revoked is terminal.

PDA (on-chain): `[b"mandate", owner, nonce]`. Live engine ids look like `mdt_0001`.

Only the owner credits the vault (`fund`) or takes funds out (`owner_withdraw`, any state). The operator never receives vault tokens. Operator movement is allowlisted venue apply or budgeted `spend`.

Source: repo `SPEC.md` and `packages/engine`.
