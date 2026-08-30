# Devnet security review

Date: 2026-08-30. Scope: the **devnet system as it exists today** — mandate program, mock venues (`demo_swap`, `demo_yield`), own mints (USDC-d, DEMO), hosted API, indexer, data-api, Float, Telegram bot.

Out of scope: mainnet, pooled mandates, Score/credit, x402 facilitator settlement.

Posture: fail closed. Findings are not embarrassing; unfound findings are. Every row has severity, evidence, exploitability **in current scope**, and a fix or accepted-risk note.

## Severity summary

| Severity | Count | IDs |
|---|---|---|
| Critical | 0 | — |
| High | 2 | SR-H1, SR-H2 |
| Medium | 8 | SR-M1 … SR-M8 |
| Low | 5 | SR-L1 … SR-L5 |
| Info | 6 | SR-I1 … SR-I6 |

**Critical / High (verbatim):**

- **SR-H1 High — Program upgrade authority is a single deployer key.** Evidence: `docs/FACTS.md` mandate program `5o8EAwdHyQ31Nmt6tUDm1y6PNDt5STmVvA6CX3E6WJPm`, upgrade authority `2fpQvTynG9cnCXUqsrJ8CvpJZsNykehMdSv4nkJVStGg` (same key as venue programs and mint authority). Exploitability in current scope: the deployer can rewrite every gate on devnet. This is the Drift lesson pointed at ourselves. Fix / accepted: accepted for **devnet**. Intended mainnet plan: upgrade authority to a multisig, then freeze (immutable) after a soak. Recorded so reviewers ask and get an answer.
- **SR-H2 High — Slippage bound is versus a program-read pool quote, not venue return data.** Evidence: `programs/mandate/src/lib.rs` `quote_swap` (~603) reads `demo_swap` pool `rate_num` / `rate_den`; `gate_swap` compares operator `min_out` to that quote (~675–682); `ActionExecuted.amount_out` is `expected` (~263), not the CPI fill. Exploitability on **current mock venues**: low — `demo_swap` uses the same formula, so quote and fill match. On a real venue whose fill can diverge from the account quote, the bound is advisory. Fix: after CPI, read destination vault delta (or venue return data) and refuse/halt if fill &lt; floor. Until real venues, accepted as a design finding with low current exploitability.

## Findings table

| ID | Sev | Finding | Evidence | Exploitability now | Fix / accepted |
|---|---|---|---|---|---|
| SR-H1 | High | Single-key program upgrade authority | FACTS; `solana program show` authority `2fpQvTyn…StGg` | Deployer can replace bytecode | Accepted on devnet. Mainnet: multisig, then freeze |
| SR-H2 | High | Slippage vs quote, not fill | `lib.rs` `quote_swap`, `amount_out: expected` | Low on mock venue; High on a diverging venue | Read vault delta post-CPI before treating the bound as enforced |
| SR-M1 | Medium | Refusal txs bump `nonce` | `execute_swap` ~187 saturating_add before `refuse()` | Not fund movement; receipts are sequenced | Accepted. Document: refuse-and-record is not zero mutation — nonce is the receipt sequence |
| SR-M2 | Medium | `InsufficientShares` uses `err!` after gates | `execute_withdraw_venue` ~387–390 | That closed door reverts; **no** `ActionRefused` | Change to `refuse()` or accept that share underflow is an instruction error, not a policy receipt |
| SR-M3 | Medium | UTC daily window edge | `utc_day` = `ts/86400` (~555); `rollover` (~559) | Operator can spend a full `daily_cap` at 23:59 UTC and another at 00:00 | Accepted. Documented; test `utc_day_rolls_at_midnight_utc` |
| SR-M4 | Medium | Spend destination is any ATA of the mint | `Spend` `destination` `token::mint = mint` only (~1043) | Operator-chosen payee; caps still apply. Intended for x402 | Accepted on MVP. Mainnet: optional owner-allowlisted destinations |
| SR-M5 | Medium | Telegram `/pause` `/revoke` bound to chat allowlist, not mandate-owner Telegram ID | `apps/bot/src/allow.ts` `canMutate`; `commands.ts` ~110–117 | Any allowlisted chat can emergency-pause/revoke any engine id the API knows. CLI (`chatId == null`) allowed | Accepted while the bot is a house emergency control. Do not treat it as per-owner auth. Hosted allowlist is a single chat id |
| SR-M6 | Medium | Simulation avoidance under-represents refusals | Design (C3) | Operator can simulate locally and submit only passing txs | Scoring layer (out of scope): weight owner-initiated pause/revoke/expiry; weight tenure and volume; a zero-refusal record is unremarkable, not excellent |
| SR-M7 | Medium | Indexer does not unwind devnet reorgs | `apps/indexer/src/chain.ts` `onLogs` + backfill; unique `(sig, event_index)` | Duplicate sigs are skipped (regression test). Dropped txs leave a row | Accepted on devnet. Mainnet: confirm by root + optional slot rewind |
| SR-M8 | Medium | Indexer stalled on public RPC 429s; data-api `chainReady` false | Hosted indexer logs 2026-08-30; `/health` `lagSlots` ~319k, `chainReady:false`. `rpcOk` on data-api false | Public feed still serves 41 indexed receipts; new txs may lag | Set Helius `SOLANA_RPC_URL` / `SOLANA_WS_URL` on Railway indexer (not in git) |
| SR-L1 | Low | Mint authority on USDC-d / DEMO is the deployer | FACTS mints; faucet `createMintToInstruction` `apps/api/src/chain.ts` ~384 | Extra minting inflates vault size; **does not** skip per-tx caps | Accepted mock. Mainnet: freeze mint or use canonical USDC |
| SR-L2 | Low | Hosted faucet needs `keys/deployer.json` on disk | `faucetDemoUsdcd`; `.dockerignore` drops `keys` | Image cannot mint; loopback can | Keep keys out of the image. Optional `DEPLOYER_KEY_JSON` later if a public faucet is required |
| SR-L3 | Low | CORS allows `*.vercel.app` | `packages/rpc/src/domains.ts` `isProductOrigin` | Any Vercel app can read public receipts (already public) | Tighten when custom TLS is attached |
| SR-L4 | Low | Generic RPC URL is not cluster-tagged | `publicRpcUrl` allows a Helius host without `devnet` in the hostname | Mis-set `NEXT_PUBLIC_SOLANA_RPC_URL` could still be the wrong cluster if it does not contain `mainnet` | Pin cluster; reject mainnet URLs on a devnet UI (done). Prefer URLs that include `devnet` |
| SR-L5 | Low | Wallet still shows opaque bytes | `@solana/wallet-adapter` `signTransaction` | User must read Float’s preview; Phantom does not decode this program | In-app preview added (`confirmChainIntent`). Residual: wallet UI |
| SR-I1 | Info | `unpause` / `amend_policy` / `owner_withdraw` are owner-only | `OwnerOnly` / `OwnerWithdraw` `has_one = owner`; tests `emergency_cannot_unpause`, `emergency_cannot_amend_policy_or_move_funds` | Emergency key cannot unpause, amend, or move funds | Spec held |
| SR-I2 | Info | PDA bumps stored and re-checked | `create_mandate` stores `ctx.bumps.mandate`; mutate accounts `bump = mandate.bump` | Caller cannot supply a bump to spoof vault/mandate binding | Spec held |
| SR-I3 | Info | CPI program id is typed | `ExecuteSwap.swap_program: Program<'info, DemoSwap>` (~999) then `program_allowed` | Cannot `invoke` an arbitrary program through this instruction | Spec held for mock venues |
| SR-I4 | Info | Refusals return `Ok(())` with `emit!(ActionRefused)` | `refuse` ~511–531; test `refuse_returns_ok_so_the_receipt_is_not_lost` | Fail closed is refuse-and-record, not error-and-vanish | Spec held. Nonce bump is SR-M1 |
| SR-I5 | Info | `owner_withdraw` has no state/expiry gate | `owner_withdraw` body; test `owner_withdraw_reachable_in_active_paused_revoked_expired` | Owner can withdraw in Active, Paused, Revoked, and after expiry | Spec held |
| SR-I6 | Info | Token accounts checked on vault transfers | `token::mint` + `token::authority = mandate` on vaults; owner dest `token::authority = owner` | No client-supplied ATA without mint/authority constraints on vaults | Spend dest is SR-M4 |

## C1 — Authority and accounts

Signer paths:

| Instruction | Context | Who |
|---|---|---|
| `create_mandate`, `fund` | owner signer | Owner |
| `amend_policy`, `unpause` | `OwnerOnly` (`has_one = owner`) | Owner only |
| `owner_withdraw` | `OwnerWithdraw` (`has_one = owner`) | Owner only |
| `pause`, `revoke` | `EmergencyOrOwner` + `check_emergency_or_owner` | Owner or emergency |
| `execute_*`, `spend` | `caller` signer; `gate_state` requires `caller == operator` | Operator (else `Unauthorized` receipt) |
| `register_operator` | `authority` signer | Operator registering themselves |

Emergency key: pause + revoke only. It cannot reach `unpause`, `amend_policy`, or fund movement (`owner_withdraw` / CPI). Tests encode that in source.

Vaults are ATAs with `associated_token::authority = mandate`. Mutating instructions pin `seeds = [b"mandate", mandate.owner, seed], bump = mandate.bump`. Mismatched owner/seed fails PDA derivation.

Delegate / close-authority on the vault: SPL associated token owned by the mandate PDA. The program does not set a delegate. Close would require the mandate PDA as signer — only this program’s seeds.

**Mint authority (USDC-d `6eDVRp…`, DEMO `54Xpms…`):** deployer. Caps are in token units. Minting more into a vault does not bypass `per_tx_cap`. It can make a mandate look better funded. Devnet mock — SR-L1.

## C2 — Gate correctness

Gate order in `gate_state` then `gate_swap` / `gate_move`: state (Paused/Revoked) → expiry (`Clock` unix_timestamp) → operator → program allowlist → token allowlist → per-tx cap → daily cap → spend caps → slippage (`min_out` vs quote). Matches SPEC. No execute variant skips `gate_*` before CPI.

Checked arithmetic: `checked_add` / `checked_mul` / `checked_sub` with `MandateError::Math`. Daily remaining uses `saturating_add` vs cap (cannot wrap into a false allow).

**Clock:** `Clock::get()?.unix_timestamp`. Validator time can skew; expiry and UTC day follow that clock. Accepted.

**Re-entrancy / CPI:** `swap_program` is `Program<'info, DemoSwap>` (fixed program id `demo_swap::ID`), then `program_allowed`. Same for `DemoYield`. No `invoke` of a caller-chosen program id.

**InsufficientShares** is the exception to refuse-and-record (SR-M2).

## C3 — Reputation integrity (design)

**Simulation avoidance.** An operator can simulate and broadcast only passing transactions. On-chain refusal counts then under-represent attempted risk. This weakens a naive “clean record” claim. The scoring layer (out of scope) should: (1) weight owner-initiated pause, revoke, and expiry — those cannot be simulated away; (2) weight tenure and notional volume; (3) treat a zero-refusal record as unremarkable, not excellent.

**Refusal spam.** `ActionRefused.operator` is the `caller` signer. `gate_state` refuses `Unauthorized` if caller ≠ mandate.operator — that receipt is still attributed to the *caller*, not the operator. A third party can pay fees to emit `Unauthorized` on a mandate they do not operate. They cannot emit `OverTxCap` as that operator without the operator key. Mitigation for scoring: count operator-signed execute/refuse only; ignore `Unauthorized` from other pubkeys. Operator signature is required for an attributed policy refusal. Fees: the transaction fee payer (usually the caller).

**Wash delegation.** Self-owned mandates can inflate a record. House operators (`markov-steady`, `markov-momentum`, `markov-redteam`) are excluded from adoption metrics by product rule. Scoring should discount owner==operator and known house keys.

## C4 — Off-chain keys and services

| Key / secret | Process | Where | Public endpoint? |
|---|---|---|---|
| Owner wallet | Browser | Phantom/Solflare; Float never sees the secret | No. API returns unsigned tx; `useChain` signs client-side |
| Emergency | Hosted **api** | `EMERGENCY_KEY_JSON` on Railway api (SET; not in git). Bot does **not** hold it | Bot POSTs API with `x-api-key`. Emergency key is not in the client bundle |
| Operator house keys | Local `scripts/chain-sprint.ts` / agents | `keys/` gitignored, dockerignored | Hosted API does not tick house operators from disk keys in the image |
| Deployer / upgrade / mint | Local + optional faucet | `keys/deployer.json` | Not in the image (SR-L2) |
| `MARKOV_API_SECRET` | api, bot | Railway env | Not in git |
| Telegram token | bot | Railway env | Not in git |

Owner actions (subscribe, unpause, withdraw, owner pause/revoke) are wallet-signed. Hosted API `OwnerClient` uses `Keypair.generate()` as a dummy payer when **building** unsigned txs (`client()` in `chain.ts`).

**Telegram:** `/pause` and `/revoke` require `canMutate(chatId)` (allowlist or CLI). Not bound to the mandate owner’s Telegram ID (SR-M5). Replay: Telegram `update_id` offset; no extra nonce. **Single poller:** Railway owns `getUpdates`; loopback does not poll unless `TELEGRAM_POLL=1` (`apps/bot/src/index.ts`).

**data-api:** Parameterised SQL (`postgresStore` tagged template; sqlite `?` placeholders). Rate limit 60/min/IP with `Retry-After`. CORS `isProductOrigin` includes `https://float.markovhq.com`. `public_receipts` view is on-chain-derived fields only (`receipt_id, ts, mandate, operator, action_type, venue, token, amount, result, block_reason, tx_sig`). No service credentials in the Float client: receipts fetch uses `NEXT_PUBLIC_RECEIPTS_API_URL` or the public Railway origin.

**Indexer:** `connection.onLogs(programId(), …)` with `programId()` from `data/devnet.json` / `MARKOV_PROGRAM_ID`. Parses Anchor events for that program id. Idempotency `(sig, event_index)` — test `replaying a processed signature creates zero duplicates`.

**Config integrity:** `.dockerignore` previously dropped `data/house-operators.json` and broke hosted subscribe. Now `!data/house-operators.json` and `!data/devnet.json`. Still excluded: `keys`, `*.so`, other `data/*.json`, sqlite. Runtime needs `devnet.json` + house map in the **api** image (copied). data-api image does not copy `data/` (uses `DATABASE_URL`). Do not add `keys/` to the image.

**Supply chain:** `bun.lock` is committed; Docker `bun install --frozen-lockfile`. C6 records `cargo audit` / JS audit results below.

## C5 — Client

Float `useChain` shows a human-readable dialog (`describeIntent`: action, mandate/seed, amount, operator) **before** `signTransaction`. Residual: the wallet adapter still presents opaque bytes (SR-L5).

Cluster: `WalletProviders` uses `publicRpcUrl()`. `markovCluster()` defaults to `devnet`. `publicRpcUrl("devnet")` ignores a URL that looks like mainnet. Mainnet requires `MARKOV_MAINNET=1`. Cluster chip in nav.

## C6 — Re-verification

2026-08-30 this session.

| Gate | Result |
|---|---|
| `cargo test --manifest-path programs/mandate/Cargo.toml --features no-entrypoint` | **20 passed** |
| `bun test packages apps scripts` | **130 pass, 0 fail** |
| `bun scripts/mvp-status-audit.ts` | **NO-GO**. OK 13 / FAIL 2 / DEFERRED 4. FAIL: `https://float.markovhq.com/receipts` HTTP 404 (Vercel `lemmalabs` deploy blocked: this token is `kunaldrall29` with **zero teams**); data-api `chainReady=false` (indexer 429 on `api.devnet.solana.com`, SR-M8). Deferred: D-08, D-09 ×3. Chain 11 BlockReasons confirmed. Stats 11 keys. Ledger 41 receipts. |
| 11 FACTS BlockReason sigs | OK (audit, retry on 429) |
| Hosted four-beat signatures | Unchanged in `docs/demo/hosted-four-beat.json` (create/fund, allow, OverTxCap, hosted-bot revoke, Revoked) |
| Hosted API `/health` | `chainReady:true` `cluster:devnet` slot ~490381239 |
| Hosted data-api `/health` | `chainReady:false` `lagSlots` ~319k |
| `GET /v1/receipts/stats` | `{total:41, allowed:21, blocked:20}` with **11** `by_reason` keys |
| `https://float.markovhq.com` | HTTP 200 |
| `https://float.markovhq.com/receipts` | HTTP **404** until Kunal deploys `float-web` on `lemmalabs` from this branch |
| Local Float `/receipts` | HTTP 200; UI `41 actions gated · 20 refusals emitted · 11 BlockReason keys` |
| Secret scan | `gitleaks detect` 81 commits, no leaks. Float `.next/static` has no `MARKOV_API_SECRET` / `TELEGRAM_BOT_TOKEN` / PEM |
| `cargo audit` | Tool not installed in this environment |
| JS `bun audit` | 11 advisories (7 high, 4 moderate): `serialize-javascript` via Docusaurus, `sharp` via Next, `uuid` via wallet adapter / web3.js. Transitive; not patched this session |

Audit verdict block (verbatim):

```
NO-GO
OK 13 / FAIL 2 / DEFERRED 4

Deferred by decision — reactivates when:
- grant application outside repo (D-08, owner Kunal): Never — the grant pack lives outside the code repo by design
- github org MarkovFyi transfer (D-09, owner Kunal): Grant acceptance
- licence holder MarkovFyi (D-09, owner Kunal): Grant acceptance
- six-repo layout (D-09, owner Kunal): Grant acceptance
```

## Accepted risks for devnet scope

1. Mutable program under a single upgrade authority (SR-H1). Mainnet plan: multisig → freeze.
2. Mock venues and mock mints: slippage vs quote (SR-H2) and mint inflation (SR-L1) are not mainnet-safe; they are honest on this cluster.
3. UTC day rollover (SR-M3): two full daily caps minutes apart across midnight UTC.
4. Refusal nonce bump (SR-M1): required for a committed receipt.
5. Telegram house allowlist (SR-M5), not per-owner Telegram binding.
6. Simulation avoidance and wash delegation (SR-M6 / C3): scoring is not shipped; do not market a zero-refusal house record as excellence.
7. Indexer reorgs on devnet (SR-M7). Public-RPC 429 stall (SR-M8) until Helius is set.
8. `F-DOMAIN-SUBDOMAINS` still open: docs/api/app TLS is owner DNS, not a code task.
9. x402 facilitator and Score/credit: out of scope (M2 / backlog).
10. Spend destination any same-mint ATA (SR-M4) while x402 payee is operator-chosen.

No Critical findings in current scope. Do not treat that as a mainnet audit.
