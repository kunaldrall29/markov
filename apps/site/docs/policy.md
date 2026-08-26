---
title: Policy
---

# Policy

Copied onto the mandate at create and replaceable by the owner via `amend_policy` (not when Revoked).

- program allowlist: 1–4 program ids
- token allowlist: 1–4 mints (this prototype: USDC-d, DEMO)
- per-tx cap and UTC-day notional cap
- spend per-call and UTC-day spend caps (x402)
- max slippage bps (swaps)

Empty or oversized allowlists throw at create/amend. They are not a `BlockReason`.

Gate order: [BlockReason](/docs/block-reason).
