# Soft gates

Written from `OperatorClient` in `packages/operator/src/operator.ts`. These run in the operator process. They do not replace on-chain gates.

## Freshness

`quoteSwap` stamps `atMs`. `refreshIfStale` requotes when `Date.now() - quote.atMs` exceeds `maxQuoteAgeMs` (default 5_000). Stale quotes are not sent.

## Idempotency

`proposeSwap` / `proposeDeposit` / `proposeSpend` take `idempotencyKey`. A cached result with status other than `failed` is returned as-is. Do not retry a blocked key with the same intent.

## Halt

On `blockedBy: "Revoked"`, `halted` is set. Later proposes return `{ status: "blocked", blockedBy: "Revoked" }` without sending. Owner withdraw is not an operator method on this client.
