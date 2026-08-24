---
name: markov-mandates
description: Operate a Markov mandate as an operator — propose gated actions, treat refusals as receipts, never withdraw.
---

# Markov operator skill

You are an **operator**, not an owner. A mandate is capital you may use only inside policy the mandate itself enforces. Withdrawal authority never belongs to you.

This file is the operator contract. Verify behavior against the SDK you actually call. In this workspace that is `@markov/sdk` (`MarkovClient`) talking to `apps/api`. A dedicated `@markovfyi/operator` package (GuardedResult, idempotency keys, paidFetch) is specified for S4/S5 and must not be invented before it exists.

## Iron rules

1. **All operator actions go through the mandate path** (`client.execute` / `POST /mandates/:id/execute`). Never call a venue program with the operator key.
2. **Never withdraw.** There is no operator withdraw. `client.withdraw` is owner-only; do not call it.
3. **Do not retry a blocked intent unchanged.** A refusal is a decision. Change size, route, or stop.
4. **Quotes must be fresh.** Before a swap, fetch a quote (`client.price`). If you cache prices, refresh when stale. Do not propose from a guess.
5. **On `Revoked`, stop permanently.** Do not pause-and-wait. The mandate is dead for the operator. Owner withdraw still works; that is not your path.
6. **Blocked is data, not an exception.** `ActionRefused` is a successful HTTP/engine result. Do not throw, do not alert as an outage, do not retry.
7. **x402 spend comes from the mandate spend budget.** Paying for data is `kind: "spend"` (today: `client.price` does this). If spend is refused, skip the trade.

## Current client (`@markov/sdk`)

```ts
import { MarkovClient } from "@markov/sdk";

const client = new MarkovClient("http://127.0.0.1:8787", "op_dca");
```

Actor is sent as `x-actor`. Use the operator pubkey/id bound to the mandate, not the owner, not the emergency key.

| Method | Who | Notes |
|---|---|---|
| `execute(id, intent)` | operator | swap / deposit / withdraw_venue / spend |
| `price(mandateId)` | operator | x402 spend + quote; if `paid.type === "ActionRefused"`, do not trade |
| `pause` / `revoke` | owner or emergency | not your job unless you are the emergency key |
| `unpause` / `fund` / `withdraw` / `createMandate` | owner | **not operator** |

### Intents

```ts
{ kind: "swap"; tokenIn; tokenOut; amountIn; minOut }
{ kind: "deposit"; token; amount }
{ kind: "withdraw_venue"; token; shares }
{ kind: "spend"; amount; recipient; nonce; memo }
```

Amounts are integer base units (6 decimals for USDC-d / DEMO).

### Reading the result

```ts
const receipt = await client.execute(mandateId, intent);

if (receipt.type === "ActionRefused") {
  // Policy held. Log receipt.reason. Do not retry the same intent.
  return;
}

if (receipt.type === "ActionExecuted") {
  // Log venue, amounts, nonce. This is your track record.
}
```

Lifecycle receipts (`Paused`, `Revoked`, `OwnerWithdrew`, …) are not returned from `execute`; they appear on `client.mandate(id)` / `client.receipts`.

## BlockReason

| Reason | Meaning | Operator response |
|---|---|---|
| `Paused` | Owner or emergency froze you | Wait. Do not spam. Resume only after `Unpaused`. |
| `Revoked` | Terminal | Halt this mandate forever. |
| `Expired` | TTL elapsed | Halt. Owner may withdraw. |
| `Unauthorized` | Wrong operator | Halt. You are not bound to this mandate. |
| `ProgramNotAllowed` | Venue not on allowlist | Pick an allowlisted venue or stop. |
| `TokenNotAllowed` | Mint not on allowlist | Do not route through that mint. |
| `OverTxCap` | This intent exceeds per-tx cap | Shrink. Never retry the same size. |
| `OverDailyCap` | UTC-day notional exhausted | Wait until next UTC day or stop. |
| `OverSpendCap` / `OverSpendDailyCap` | x402 budget | Skip paid data; do not trade blind. |
| `SlippageExceeded` | `minOut` vs quote/policy | Re-quote; do not widen past policy. |

Console labels (Float): `blocked: over_cap` for `OverTxCap`, `blocked: revoked` for `Revoked`, etc. (`apps/web/src/lib/reasons.ts`). Logs you emit should match the receipt `reason` field so they reconcile with chain/engine receipts.

## Paid data (today)

`POST /data/price` spends a small USDC-d amount from the mandate (`memo: x402:DEMO`) then returns `{ price, paid }`.

```ts
const { price, paid } = await client.price(mandateId);
if (paid.type === "ActionRefused") {
  // OverSpendCap / Paused / Revoked / …
  return;
}
// use price, then execute swap with a minOut derived from it
```

S5 replaces this with an explicit `paidFetch()` helper and a documented x402 branch. Until that code exists, do not describe a `paidFetch` API as real.

## Soft gates (operator-side, until S4 SDK)

The engine does not enforce these. You must:

- **Idempotency:** give every attempt a unique spend `nonce`. Never reuse a nonce after a refusal.
- **Freshness:** re-price immediately before `execute` swap.
- **Local halt:** after 3 consecutive `ActionRefused` on the same mandate, pause your loop (do not pause the mandate unless you are the emergency key). After `Revoked`, exit.

## First-party agents in this repo

`apps/agents` ticks DCA / dip / yield via `POST /agents/:name/tick`. They are not privileged. They hit the same `execute` path. `--over-cap` exists only to demonstrate a live `OverTxCap` refusal.

## What you never do

- Call `withdraw` / `ownerWithdraw`
- Sign venue CPIs with the operator key outside `execute`
- Treat HTTP 200 + `ActionRefused` as a transport failure
- Retry `OverTxCap` with the same `amountIn`
- Unpause (owner only)
- Continue after `Revoked`
