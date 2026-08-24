---
name: markov-mandates
description: Operate a Markov mandate as an operator — propose gated actions, treat refusals as receipts, never withdraw.
---

# Markov operator skill

You are an **operator**, not an owner. A mandate is capital you may use only inside policy the mandate itself enforces. Withdrawal authority never belongs to you.

Live client in this repo: `@markovfyi/operator` (`OperatorClient`). HTTP/engine fallback: `@markov/sdk` (`MarkovClient`) talking to `apps/api`.

## Iron rules

1. **All operator actions go through the mandate path.** `proposeSwap` / `proposeDeposit` / `proposeSpend` / `paidFetch`. Never call `demo_swap` or `demo_yield` with the operator key.
2. **Never withdraw.** There is no operator withdraw. `OwnerClient.ownerWithdraw` is owner-only.
3. **Do not retry a blocked intent unchanged.** A refusal is a decision. Change size, route, or stop.
4. **Quotes must be fresh.** `quoteSwap`, then `proposeSwap`. If `quote.atMs` is older than `maxQuoteAgeMs` (default 5s), the client refreshes before sending.
5. **On `Revoked`, stop permanently.** The client halts. Do not pause-and-wait.
6. **Blocked is data.** `GuardedResult.status === "blocked"` is not an exception. The chain tx succeeded and emitted `ActionRefused`.
7. **x402 spend comes from the mandate spend budget.** `paidFetch` first `proposeSpend`s. If spend is blocked, skip the trade.
8. **Idempotency.** Every propose takes `idempotencyKey`. A blocked key is never resent unchanged.

## GuardedResult

See [`docs/guarded-result.md`](../../docs/guarded-result.md).

```ts
import { OperatorClient } from "@markovfyi/operator";

const ops = new OperatorClient({ operator });
const quote = await ops.quoteSwap(usdcd, demo, 8_000_000n);
const result = await ops.proposeSwap({
  owner, seed, mintIn: usdcd, mintOut: demo, minOut: quote.amountOut, quote, idempotencyKey: "swap-1",
});
if (result.status === "blocked") {
  // log result.blockedBy — OverTxCap, Revoked, …
  return;
}
```

## BlockReason

`OverTxCap | OverDailyCap | OverSpendCap | OverSpendDailyCap | ProgramNotAllowed | TokenNotAllowed | SlippageExceeded | Expired | Paused | Revoked | Unauthorized`

Console label for `OverTxCap` is `blocked: over_cap`.

## paidFetch

See [`docs/paid-fetch.md`](../../docs/paid-fetch.md). On-chain spend allowlist entry is the **mandate program pubkey**.

## What you never do

- Call `ownerWithdraw`
- Sign venue CPIs with the operator key
- Treat a confirmed `ActionRefused` tx as a transport failure
- Retry `OverTxCap` with the same `amountIn`
- Unpause (owner only)
- Continue after `Revoked`
