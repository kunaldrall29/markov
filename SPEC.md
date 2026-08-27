# Markov spec

Authoritative account / instruction / event spec for the mandate primitive.

**Live implementation:** `packages/engine` (`MandateEngine`). Float, agents, and the bot speak this surface today.

**On-chain port:** `programs/mandate` (Anchor, `src/lib.rs`). Instruction names below are the IDL. The engine is still the **live** runtime Float talks to. Names must stay 1:1.

Litepaper v0.4 wins if this file and the litepaper drift; then this file gets fixed.

## Status

| Surface | State |
|---|---|
| Engine (`MandateEngine`) | Implemented, tested |
| `demo_swap` / `demo_yield` Rust | Source present (vault accounts pinned). **Not** on public Solana devnet |
| Mandate program | Source in `programs/mandate`; public-devnet executable recorded in `docs/FACTS.md`. Source now pins CPI vaults — **redeploy before treating the live binary as this tree** |
| Cluster | Local engine (`markov-localnet`) is the Float runtime. Public program IDs: `docs/FACTS.md` |

## Accounts

### Operator (`OperatorProfile`)

| Field | Type | Notes |
|---|---|---|
| authority | pubkey string | On-chain: `Pubkey` |
| name | string | |
| uri | string | |
| feeBps | u16 | |
| kind | `agent \| human` | |
| blurb | string | Off-chain metadata on-chain |

PDA (intended): `[b"operator", authority]`.

### Mandate

| Field | Engine | Notes |
|---|---|---|
| id | `mdt_NNNN` | On-chain: PDA `[b"mandate", owner, nonce]` |
| owner | pubkey string | signer for fund, amend, unpause, withdraw |
| operator | pubkey string | only signer that may execute/spend |
| emergencyKey | pubkey string \| null | pause + revoke only |
| policy | `Policy` | copied in; max 4 programs, 4 tokens |
| state | `Active \| Paused \| Revoked` | terminal: Revoked |
| createdTs / expiresTs | unix seconds | expiry is a gate, not a state bit |
| dayStamp | UTC day = `floor(ts / 86400)` | rolls `spentToday` and `spendToday` |
| spentToday | notional (base units) | trade / deposit / withdraw_venue |
| spendToday | base units | x402 `spend` only |
| nonce | u64 | increments on every execute/spend attempt |
| vault | mint → amount | engine ledger; on-chain: ATA vaults |
| yieldShares | u64 | demo_yield share accounting |

### Policy

| Field | Bound |
|---|---|
| programAllowlist | 1–4 program ids |
| tokenAllowlist | 1–4 mints |
| perTxCap | notional per execute (non-spend) |
| dailyCap | UTC-day notional |
| spendPerCallCap | per `spend` |
| spendDailyCap | UTC-day `spend` |
| maxSlippageBps | swap only; checked at execute time |

Create/amend reject empty or >4 allowlists (throw, not a `BlockReason`).

### Vault

Only the owner can credit via `fund` or debit via `ownerWithdraw`. The operator never receives vault tokens. Operator movement is allowlisted venue apply (swap / deposit / withdraw_venue) or budgeted `spend`.

## Instructions

Admin auth failures **throw** (transaction fails). Operator execute/spend failures that are policy gates **succeed as refusals** and emit a receipt. Refusals are data.

| Instruction (IDL) | Engine method | Who | Effect |
|---|---|---|---|
| `register_operator` | `registerOperator` | operator | upsert profile |
| `create_mandate` | `createMandate` | owner | Active mandate, optional emergency key, TTL |
| `fund` | `fund` | owner | credit vault; token must be allowlisted |
| `amend_policy` | `amendPolicy` | owner | replace policy; forbidden if Revoked |
| `pause` | `pause` | owner or emergency | Active → Paused |
| `unpause` | `unpause` | **owner only** | Paused → Active |
| `revoke` | `revoke` | owner or emergency | → Revoked (terminal) |
| `owner_withdraw` | `ownerWithdraw` | owner | debit vault; **any state** |
| `execute_swap` | `execute({ kind: "swap" })` | operator | gate stack then demo_swap |
| `execute_deposit` | `execute({ kind: "deposit" })` | operator | gate stack then demo_yield deposit |
| `execute_withdraw_venue` | `execute({ kind: "withdraw_venue" })` | operator | gate stack then demo_yield withdraw |
| `spend` | `execute({ kind: "spend" })` | operator | gate stack then budgeted transfer + nonce memo |

There is no operator withdraw instruction. `unpause` throws `"only owner can unpause"` if the emergency key (or anyone else) calls it.

## Gate stack

Fixed order, fail-closed. First matching reason wins. Evaluated in `MandateEngine.gate`.

| # | Gate | BlockReason |
|---|---|---|
| 1 | `state == Paused` | `Paused` |
| 2 | `state == Revoked` | `Revoked` |
| 3 | `now >= expiresTs` | `Expired` |
| 4 | caller ≠ operator | `Unauthorized` |
| 5 | program not on allowlist | `ProgramNotAllowed` |
| 6 | any involved mint not on allowlist | `TokenNotAllowed` |
| 7a | spend: amount > spendPerCallCap | `OverSpendCap` |
| 7b | spend: spendToday + amount > spendDailyCap | `OverSpendDailyCap` |
| 8 | non-spend: notional > perTxCap | `OverTxCap` |
| 9 | non-spend: spentToday + notional > dailyCap | `OverDailyCap` |
| 10 | swap: `minOut > expected` or expected below policy min | `SlippageExceeded` |

Spend skips notional caps (8–9) and slippage (10). After 7a/7b the spend path returns.

Refusals increment `nonce` and emit `ActionRefused`. They do **not** mutate `spentToday`, `spendToday`, vault, or yield shares.

Day buckets roll on the execute path before gates (`utcDayStamp`).

## BlockReason

```
Paused | Revoked | Expired | Unauthorized
ProgramNotAllowed | TokenNotAllowed
OverTxCap | OverDailyCap
OverSpendCap | OverSpendDailyCap
SlippageExceeded
```

On-chain event name (intended): `ActionRefused { reason: BlockReason }`.
Engine receipt: `{ type: "ActionRefused", reason }`.

Every variant has a negative test in `packages/engine/tests/engine.test.ts`. No new variant without a test.

## Events / receipts

Engine `Receipt.type` is the live schema. Intended program events in parentheses where they differ.

| Receipt | When |
|---|---|
| `MandateCreated` | create |
| `MandateFunded` | fund |
| `PolicyAmended` | amend |
| `ActionExecuted` (`ActionExecuted`) | execute/spend passed gates and applied |
| `ActionRefused` (`ActionRefused`) | execute/spend blocked |
| `Paused` / `Unpaused` / `Revoked` | lifecycle |
| `OwnerWithdrew` | owner withdraw |

`ActionExecuted` includes venue, tokenIn/tokenOut, amountIn/amountOut, nonce.
`ActionRefused` includes kind, requestedAmount, reason, nonce.

Exactly one of `ActionExecuted` | `ActionRefused` per execute/spend.

## Invariants

1. No path moves vault funds except allowlisted-venue apply or `ownerWithdraw`.
2. `ownerWithdraw` succeeds in Active, Paused, and Revoked (owner signer, sufficient balance).
3. Emergency key: pause and revoke only. `unpause` requires owner. A compromised emergency key can only over-protect.
4. Every execute/spend emits exactly one action or refusal receipt.
5. Every `BlockReason` has at least one negative test.

## Demo venues (Phase 0)

Adapter shape is the real one; liquidity is fake. Venue interface docs land at S3 from the adapter code (`docs/venues.md`).

### demo_swap (`PROGRAMS.demoSwap` = `demo_swap`)

Constant-rate pool. Default: 10 DEMO per 1 USDC-d, 30 bps fee (`DEFAULT_SWAP`). Rust: `programs/demo_swap`.

Notional for caps: if `tokenIn` is USDC-d, `amountIn`; else the USDC-d-equivalent quote.

### demo_yield (`PROGRAMS.demoYield` = `demo_yield`)

Share accounting. Default `shareValue = 1_000_000`. Deposit: `shares = amount * 1e6 / shareValue`. Withdraw: `amount = shares * shareValue / 1e6`. Rust: `programs/demo_yield`.

### x402 (`"x402"`)

Budgeted USDC-d debit to `recipient` with `nonce` + `memo`. Counts against spend caps, not notional caps. Demo price endpoint charges this (`apps/api/src/data.ts`, 20_000 units per quote).

## Demo mints

`USDC-d`, `DEMO` (`TOKENS.usdcd`, `TOKENS.demo`). Six decimals in `formatUnits`.

## Mapping: program README verbs → engine

| README (IDL) | Engine |
|---|---|
| `register_operator` | `registerOperator` |
| `create_mandate` | `createMandate` |
| `fund` | `fund` |
| `amend_policy` | `amendPolicy` |
| `pause` / `unpause` / `revoke` | `pause` / `unpause` / `revoke` |
| `owner_withdraw` | `ownerWithdraw` |
| `execute_swap` / `execute_deposit` / `execute_withdraw_venue` / `spend` | `execute` + `kind` |
| `ActionExecuted` / `ActionRefused` | `ActionExecuted` / `ActionRefused` |
| `BlockReason` | `BlockReason` |
