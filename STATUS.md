# STATUS.md — Markov Phase 0 MVP audit

**2026-08-29 refresh:** still **NO-GO**. Audit now evaluates: Float 200, data-api `chainReady`, public ledger 41 receipts, 11 `by_reason` keys, 11 FACTS refusal sigs confirmed on chain, three house operators on-chain, `F-X402-SETTLE-MINT` deferred-M2. Remaining FAIL rows: grant application stub; `F-CANONICAL-DOMAIN` still Open (partial). Hosted four-beat (Railway create/fund + allow + OverTxCap) and hosted-bot revoke+Revoked pair are in `docs/demo/hosted-four-beat.json`. Phone Telegram capture still missing. `origin/main` is the product tree. Run `bun scripts/mvp-status-audit.ts`.

**Date:** 2026-08-28 ~15:20 UTC (original audit below)  
**Auditor posture:** read-only. No product fixes. Working tree in `/workspace` (`kunaldrall29/markov`, branch `cursor/mvp-prototype-aeb5`) had **uncommitted** house-operator tick / indexer-log WIP; those files were not treated as shipped.  
**Trees inspected:** `/workspace` (live product monorepo) and `~/markov/` (Aug 25 six-folder clone).  
**Missing spec files (BLOCKED as sources):** `prompt-mvp-build-v2.md`, `markov-superteam-application-v2.md`, `markov-litepaper-v0.6.md` are **not in either tree**. Live HTML litepaper at `https://markovhq.com/litepaper` is **v0.6**. In-repo canon is `docs/markov-mvp-v2.md` + `SPEC.md` (litepaper claims stay v0.4 in `docs/FACTS.md` until this appendix).

Tiers: **EXECUTED** ran here · **INSPECTED** code/config · **CLAIMED** asserted but not verified · **BLOCKED** missing input.

---

## 1. Verdict

**NO-GO** for the claim **“MVP complete and hosted on devnet.”**

The mandate program + stub venues **are** on public Solana devnet and dump-match this tree. That is not the same as a hosted Float MVP, nor as the public-receipt claims on the live litepaper/FAQ.

### Blocking list

1. **No public Float URL.** `https://app.markov.fyi`, `https://float.markov.fyi`, `https://api.markov.fyi` → HTTP 404 `DEPLOYMENT_NOT_FOUND`. `https://float-web.vercel.app` is a **different** product (“Your Place on the Water”). Local `http://127.0.0.1:3000` is 200 only on this VM. `<FLOAT_URL>` cannot be filled for a grant.
2. **On-chain BlockReasons are 2/11**, not 11. Parsed mandate-program events: `OverTxCap`, `Revoked` only. Litepaper v0.6: *“triggered all eleven refusal types in public.”* **UNVERIFIED / NO-GO.**
3. **No pinned x402 facilitator or settle mint.** `F-X402-SETTLE-MINT` open. `X402_SETTLE_MINT` / facilitator name+version **UNSET**. Litepaper v0.6: *“settling through a live Solana facilitator on devnet today.”* **UNVERIFIED / NO-GO.**
4. **Grant/spec pack incomplete in repo.** Master prompt + Superteam application markdown **absent**. Cannot cross-check milestone numbers `[50/100]` from those files.
5. **MarkovFyi is not six Apache-2.0 product repos.** Org has `markov-program`, `markov-sdk`, `float-web`, `.github` — licenses **MIT**. Live product is `kunaldrall29/markov` **Apache-2.0**. Decision 0 not applied.
6. **§7 90-second / 6-beat demo is not hosted end-to-end on devnet.** Engine/API loopback can run strategy-vault + four-beat. Fan-out is **not** N on-chain txs. Telegram `/revoke` this run was **engine HUD**, no Solana sigs.
7. **Supabase not configured.** `DATABASE_URL` UNSET, `SUPABASE_SERVICE_ROLE_KEY` UNSET. No hosted indexer/data-api.
8. **Secret scanners not installed** (`gitleaks` / `trufflehog` missing). Partial git scan: `.env` not committed. Full-history org scan **BLOCKED**.

Non-blocking but material: dirty uncommitted tick/indexer WIP; `bun run typecheck` currently **exit 2** on those files; house operators share **one** on-chain pubkey; `hello@markovhq.net` still on the marketing site.

---

## 2. Built & verified

| Item | Tier | Evidence |
|---|---|---|
| Mandate program on public devnet | EXECUTED | `solana program show 5o8EAwdHyQ31Nmt6tUDm1y6PNDt5STmVvA6CX3E6WJPm -u https://api.devnet.solana.com` → Authority `2fpQvTynG9cnCXUqsrJ8CvpJZsNykehMdSv4nkJVStGg`, **Last Deployed In Slot 489249058**, data length 405120 |
| Dump matches `target/deploy/mandate.so` | EXECUTED | `cmp -n 403424` equal; on-chain file 405120 (1696 zero pad) |
| demo_swap on devnet | EXECUTED | `3HwcGXdsbfaAov2rYhDtnyeeEbuFVXUaT5GASTCjUUSK` slot **489248688** |
| demo_yield on devnet | EXECUTED | `GsE3vpoBb26vZWbPBbtMACwVem2qgw7whouTLwAAhyzC` slot **489248781** |
| `bun test packages apps` | EXECUTED | **99 pass, 0 fail** (includes uncommitted tests in working tree) |
| `#[test]` in `programs/` | EXECUTED | **none**. `Anchor.toml` `[scripts] test = "bun test"` — no Rust program suite |
| 11 BlockReason negative tests (engine) | EXECUTED | `packages/engine/tests/engine.test.ts` + `apps/api/tests/redteam.test.ts` (`exerciseAllBlockReasons`) all pass |
| D1 unpause owner-only (engine) | EXECUTED | `unpause is owner-only` throws `"only owner can unpause"` |
| Emergency pause/revoke, not fund (engine) | EXECUTED | `emergency key may pause and revoke, but not fund or trade` |
| `owner_withdraw` in Revoked (engine) | EXECUTED | same test, `OwnerWithdrew` after Revoked |
| `owner_withdraw` in Paused | INSPECTED | Engine + program omit state check. **No dedicated Paused-withdraw test** |
| IDL `Mandate.strategy_id: Option<[u8;32]>` | INSPECTED | `packages/operator/idl/mandate.json` account + `create_mandate` arg |
| IDL `ActionExecuted` / `ActionRefused` carry `strategy_id` | INSPECTED + EXECUTED | IDL types; operator test `ActionExecuted and ActionRefused events carry strategy_id` pass |
| On-chain mandate with non-null `strategy_id` | EXECUTED | PDA `4YQ5Xm7qxxC6UjDHPSh8F2Md5dorb8hsKbcWpfrM21X4` decodes `strategyId` hex `b7148375f60fe4a027ce664cd47c9982f9c6005868dc7ee148dc53c8ad976245` (momentum template) |
| On-chain **receipt events** with Some(strategy_id) | EXECUTED | EventParser over all 26 program sigs: **strategyEvents = 0** (wallet mandate never executed; four-beat creates used `strategy_id: null`) |
| Chain receipts / reasons | EXECUTED | See §B. Distinct on-chain BlockReasons: **2** (`OverTxCap`, `Revoked`) |
| PolicyTemplate v0 + hash + tighten-only | EXECUTED | `packages/sdk/tests/template.test.ts` 3 pass. Schema in `packages/sdk/src/overrides.ts` |
| `@markov/sdk` typecheck | EXECUTED | exit 0 |
| `@markov/web` build | EXECUTED | Next build exit 0 |
| `bun run typecheck` (workspace) | EXECUTED | **exit 2** — uncommitted `apps/indexer` + `apps/api/tests/chain.test.ts` |
| Local API `/health` | EXECUTED | `http://127.0.0.1:8787/health` 200 `chainReady:true` `cluster:devnet` |
| Local Float | EXECUTED | `GET http://127.0.0.1:3000/` 200 |
| Local docs | EXECUTED | `GET http://127.0.0.1:3001/docs` 200 Docusaurus |
| Local data-api | EXECUTED | `:8788/health` 200; `GET /price/DEMO` 402 payment-required stub |
| Local bot | EXECUTED | `:8789/health` 200 `tokenSet:true` `username:markov_float_bot` |
| Indexer process | EXECUTED | `:8790/health` **down**. sqlite file exists (`data/indexer.sqlite` 77824 bytes, mtime 12:31) |
| Hosted Float / API / docs / data | EXECUTED | `*.markov.fyi` still 404. Railway 2026-08-28: api/data-api/indexer/bot/agents `/health` 200. Hosted receipts `https://data-api-production-5ac5.up.railway.app/v1/receipts` 200 empty |
| markovhq.com | EXECUTED | HTTP 200 title `Markov — Give an agent your capital. Keep the keys.` Vercel. GitHub `https://github.com/MarkovFyi`. **zero** `kunaldrall29` in HTML |
| Litepaper live | EXECUTED | `https://markovhq.com/litepaper` 200 title `Markov litepaper — The mandate layer for Solana.` **v0.6** (also mentions previous v0.4). `markov.fyi/litepaper` 301 → markovhq.com |
| `markov.fyi/docs` | EXECUTED | 301 → `markovhq.com/docs` → **404** |
| Marketplace cards | INSPECTED | `GET /strategies` maps `publishedStrategies()` + **engine** `strategyStats`, not indexer `strategy_stats` |
| Withdraw never gated by state | EXECUTED | `withdrawDisabled(amount, _state)` amount-only; design test Paused+Revoked |
| BlockReason import | INSPECTED | `apps/web/src/lib/reasons.ts` imports `BLOCK_REASONS` from `@markov/engine/types`. Finding: `apps/web/src/app/sheet/page.tsx` hand-types `reason: "OverTxCap"` |
| Hex in `apps/web/src` | EXECUTED | `design.test.ts` walk of `src/**/*.ts,tsx,css` — pass. Hex remains in `design-tokens.json` and `design/README.md` |
| Fan-out refusal does not halt | EXECUTED | `runStrategyVaultDemo` + test: A+B `ActionExecuted`, C `ActionRefused OverTxCap` |
| Redteam covers 11 reasons | EXECUTED | in-process API sweep, **not** an on-chain schedule |
| Telegram `/revoke` then operator `Revoked` | EXECUTED | CLI `handleCommand("/revoke mdt_0041", 8619705568)` → `Revoked`; `POST /agents/momentum/tick` → `ActionRefused Revoked`. **No Solana sigs** (engine mandate) |
| Refusal-burst alert | INSPECTED | UI-only `localStorage` on `/bot`. **No bot/API alert implementation** |
| `TELEGRAM_BOT_TOKEN` | EXECUTED | env **SET**; not in `git ls-files`. `.env.example` has empty assignment |
| x402 facilitator | BLOCKED | no config/FACTS pin; live litepaper claims “live Solana facilitator” |
| On-chain spend under budget | EXECUTED | four-beat `ActionExecuted` (spend+swap) e.g. `4Soc5aiJ…` / this-run `2vPENJVo…` |
| On-chain `OverSpendCap` | EXECUTED | **never observed** in 26 program signatures |
| Local strategy-vault (engine) | EXECUTED | `POST /demo/strategy-vault` A+B execute, C OverTxCap (`mdt_0039`–`mdt_0041`) |
| Local four-beat overlay on chain | EXECUTED | `POST /demo/four-beat` this run submitted a **new** public-devnet four-beat (sigs from 15:17:37Z) |
| Six MarkovFyi Apache repos | EXECUTED | **false** — 3 product repos + `.github`, MIT |
| `gitleaks`/`trufflehog` full history | BLOCKED | binaries not installed |

### Env (names only)

SET: `API_URL`, `BOT_ACTOR`, `INDEXER_SQLITE`, `MARKOV_LEDGER`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DOCS_URL`, `PORT`, `TELEGRAM_ALLOWED_CHAT_IDS`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `WEB_ORIGIN`  
UNSET: `DATABASE_URL`, `HOST`, `MARKOV_API_SECRET`, `SOLANA_RPC_URL`, `SOLANA_WS_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_ALLOW_FIRST_CHAT`  
`.env` file: PRESENT (gitignored)

---

## 3. What's left

Sized S/M/L. Sessions from `docs/markov-mvp-v2.md` / historical S-labels — S0–S10 as **named sessions are not in SESSION_LOG** (see J).

| Gap | Size | Session / bucket |
|---|---|---|
| Host Float + API on `markov.fyi` (Vercel + Railway/Render), `MARKOV_API_SECRET`, `WEB_ORIGIN`, `HOST=0.0.0.0` | L | Hosting / S9 |
| Public 6-beat on hosted Float + Telegram against a **chain-bound** throwaway (two explorer sigs) | L | MVP v2 §7 |
| Emit all 11 BlockReasons **on-chain** (redteam house operator, not engine ledger) | L | F / litepaper claim |
| Pin x402 facilitator name+version + `X402_SETTLE_MINT`; document USDC-d vs canonical USDC | M | `F-X402-SETTLE-MINT` / H |
| Hosted indexer or Postgres; stop relying on gitignored `ledger.json` | M | D |
| On-chain house operator ticks (WIP uncommitted in working tree) | M | F |
| Indexer consume program logs without wiping rows (WIP uncommitted) | M | D |
| Dedicated engine test: `owner_withdraw` while Paused; emergency cannot withdraw | S | A4 / D1 |
| Rust `#[test]` / `anchor test` for program gates | L | A2 |
| Publish `strategy_id` on four-beat creates so receipt **events** carry Some | S | B4 |
| Three distinct operator pubkeys if the grant requires them (today one `op_dca`) | M | F / Decision 0 |
| Split or sync MarkovFyi remotes; Apache-2.0; drop MIT descriptions | M | J / Decision 0 |
| Replace `hello@markovhq.net` or verify inbox; confirm `security@markov.fyi` | S | I / contact |
| Put application + litepaper v0.6 markdown in repo | S | L |
| Install gitleaks; scan all remotes’ full history | S | J |
| Typecheck-clean the uncommitted tick/indexer WIP or revert it | S | hygiene |
| Burst-alert actually fires (not localStorage) | S | G |
| `markov.fyi/docs` → Docusaurus | S | I / S9 |

---

## 4. Drift

| Topic | Spec | Code / live | Notes |
|---|---|---|---|
| Litepaper version | In-repo FACTS: v0.4. Missing `markov-litepaper-v0.6.md` | Live site **v0.6** | FACTS stale vs production marketing |
| Gate order (MVP v2 / SPEC) | state → expiry → operator → program → token → per-tx → daily → spend → slippage → CPI | Engine `MandateEngine.gate` matches SPEC table (spend returns before notional) | **INSPECTED** |
| Rust `gate_swap` slippage | SPEC/engine: `minOut > expected` (plus a dead `expected < minAllowed` in TS) | Also `min_out < floor` → `SlippageExceeded` | Extra on-chain refusal vs engine |
| BlockReason IDL enum order | SPEC lists Paused first | Program enum starts `OverTxCap` | Order of variants, not evaluation order |
| “Marketplace driven by `strategy_stats`” | Audit E | Cards from API `publishedStrategies()` + engine receipts | Indexer views exist locally; UI does not read them |
| Three house operators | Names `markov-steady` / `momentum` / `redteam` | On-chain caller is always `AFmFYWsn7hijB54y45Tvs8XQxuy1uG9MRQXDqThKXXBs` (`keys/op_dca.json`) | Keys `op_yield` / `op_dip` exist, unused as house IDs |
| x402 | Conformant facilitator | Engine `spend` + data-api 402 stub; chain `proposeSpend` to treasury ATA | Not a facilitator |
| `unpause` D1 | Owner-only | Engine throw; program `OwnerOnly { has_one = owner }` | Matches. Emergency failure is constraint error, not `ActionRefused` |
| `owner_withdraw` any state | Required | Program has **no** state require; engine none | Matches. Paused case untested |
| Six products / org | Grant hygiene | One Apache monorepo `kunaldrall29/markov`; MarkovFyi MIT stubs | Decision 0 |
| Hex-only token file | Audit E | `src/` clean; `design/README.md` still documents hex | Test scope is `src/` only |
| Sheet demo BlockReason | Enum import | `"OverTxCap"` string in `sheet/page.tsx` | Finding, not production marketplace |

---

## 5. Decision queue

1. **Decision 0 — canonical set (markovhq.com / @markovfyi / MarkovFyi)**  
   **Context:** Marketing is `markovhq.com` (Vercel) with GitHub → `MarkovFyi`. Product git is `kunaldrall29/markov` Apache-2.0. Org repos MIT, 3/6, descriptions still say “localnet IDs only”.  
   **Options:** (a) leave split; (b) make `kunaldrall29/markov` the only canonical code and treat org as mirrors; (c) push six Apache repos and retire kunal personal remote.  
   **Recommendation:** (b) for Phase 0 grant: cite the monorepo + markovhq.com; do not claim six org repos.  
   **BLOCKING:** **yes** if the application says “six repos public under MarkovFyi with Apache-2.0”.

2. **Wedge A in litepaper + site**  
   **Context:** Strategy vaults section **is** on markovhq.com (“Vault returns. Without the vault.”) and litepaper §4.  
   **Options:** n/a — present.  
   **Recommendation:** keep; do not claim hosted Float in the same breath.  
   **BLOCKING:** no for “section present”; **yes** if FAQ “Is Float live? Yes, on Solana devnet” is in the submission.

3. **x402 facilitator + settle mint**  
   **Context:** `F-X402-SETTLE-MINT` open. No env. Live v0.6 claims a live facilitator.  
   **Options:** (a) pin a named facilitator + mint and implement; (b) rewrite litepaper/FAQ to “in-program spend budget / USDC-d stub”; (c) drop x402-native badge until (a).  
   **Recommendation:** (b) or (c) before any grant PDF; (a) is a build.  
   **BLOCKING:** **yes** while v0.6 remains as-is.

4. **Adoption-gate number [50/100]**  
   **Context:** Application markdown missing. Litepaper HTML has no “50”/“100” KPI gate.  
   **Options:** locate the application; pick one number; sync milestones.  
   **Recommendation:** do not invent.  
   **BLOCKING:** **yes** until the application file is in hand and numbers match.

5. **Contact email domain**  
   **Context:** Site `hello@markovhq.net`. `SECURITY.md` `security@markov.fyi`. Inbox not verified.  
   **Options:** verify `.net`; switch to `.fyi`; publish both.  
   **Recommendation:** one domain, verified, everywhere.  
   **BLOCKING:** **yes** if the application still uses unverified `.net` as the only contact.

6. **FACTS still open**  
   - `F-X402-SETTLE-MINT` — open, blocking for facilitator claim  
   - `F-CANONICAL-DOMAIN` — open; `markov.fyi` 301s to markovhq.com; product hosts 404  
   - `security@markov.fyi` mailbox — unpublished verification  
   **BLOCKING:** domain+facilitator yes for “hosted on devnet” wording.

7. **Discovered: public vs engine HUD**  
   **Context:** All 11 reasons exist in gitignored `data/ledger.json`. Chain has 2.  
   **Options:** never cite ledger as “public”; run redteam on-chain; or change copy.  
   **Recommendation:** change copy until chain has 11.  
   **BLOCKING:** **yes** for litepaper sentence on eleven public types.

8. **Discovered: one operator key for three house names**  
   **BLOCKING:** no unless the application lists three pubkeys.

---

## 6. Placeholder values

| Placeholder | Value | Notes |
|---|---|---|
| `<PROGRAM_ID>` | `5o8EAwdHyQ31Nmt6tUDm1y6PNDt5STmVvA6CX3E6WJPm` | Slot 489249058 |
| `<FLOAT_URL>` | **NONE PUBLIC** | Local only: `http://127.0.0.1:3000`. Do not use `https://float-web.vercel.app` |
| `<FIRST_RECEIPT_DATE>` | **2026-08-28T06:53:12Z** | First parsed mandate **event** (MandateCreated `5No1AUkX…`). Program deploy tx `4DucDFEb…` is 2026-08-27T14:21:37Z and is **not** a receipt |
| `<RECEIPTS_TO_DATE>` (chain events) | **24 parsed events** on **26** program signatures (this scan, including this-run four-beat). ActionExecuted 6, ActionRefused 4 | Do **not** use engine 226 |
| Distinct BlockReason on chain | **2** / 11 | `OverTxCap`, `Revoked`. Missing: Paused, Expired, Unauthorized, ProgramNotAllowed, TokenNotAllowed, OverDailyCap, OverSpendCap, OverSpendDailyCap, SlippageExceeded |
| House operator **pubkeys** (on-chain) | `AFmFYWsn7hijB54y45Tvs8XQxuy1uG9MRQXDqThKXXBs` | Only operator seen in events. Emergency `6rkSFPh6HWYfT9dMhgiHQ7wV8Fxs7rK1RhgMmKJUFoQz`. Owner `526oKwSqS7mGTBRbJLFqXwZxygLvGZicd9RGYRrWafTq` |
| House operator **names** (engine) | `markov-steady`, `markov-momentum`, `markov-redteam` | Not Solana pubkeys |
| demo_swap | `3HwcGXdsbfaAov2rYhDtnyeeEbuFVXUaT5GASTCjUUSK` | |
| demo_yield | `GsE3vpoBb26vZWbPBbtMACwVem2qgw7whouTLwAAhyzC` | |
| USDC-d mint | `6eDVRpGLcBeYfazqsUN9tyeW7NEKjgE3TSgs7yz1YmvC` | |
| Momentum `strategy_id` | `b7148375f60fe4a027ce664cd47c9982f9c6005868dc7ee148dc53c8ad976245` | On account `4YQ5Xm7q…` |

### Chain four-beat (this audit, 15:17Z) — analog of beats 3–5, not the hosted 6-beat

| Beat | Sig |
|---|---|
| MandateCreated | `jgpuxnV7oTXa9QZAA5FV1MVHJEgvFue3x3NSZ7WyqKS7aHjz38nciXHsjtbe4yRPkmMgUgDKFJykRWq6Aqp77eg` |
| MandateFunded | `2jVtQy1QPq7e9twkpFsia6kerWTxgxjxzDcWiju1Ph6HFFeNL8zQCJ3QecVGR3uviNnxqUkuwWN59qbQnCiPKSt` |
| ActionExecuted (under policy, ×3) | `2vPENJVoyPqftbBopUimd8MVvMWVnCJMyqdqhFyUcUM6kcBM9UfHFZddmGrRmocksj6rvKLh9SVuexFSa5BVvxaD` · `2qsiPkiAPs6ot3Gz7k4C8q6KnSNF34H3EPGfSKSdbqLDyyN25X6NJBWxxLQQ4DFRQyVXJ9hxuwmL9MPaNqfuq4ot` · `47JCst33pU1K3Wyp7HQd9Gzy5rNFJvYGpkeszcfGAokZKzJJvtgbra5QoXo8TmyNPKhfKojnWk8bVygovFUHtqBr` |
| OverTxCap | `2LmsD3mxuDMfo3krnV3GCuc51SfSaQ9HKFLsm6nYZXrKvrSofL5TgeAnKNPLgSMATcDsd3KsoECzBmGRvbbhGKiV` |
| Revoked | `4VWP5QBEUx5vwYUsRbfnZqokckxXHtrb8NGyZZYmVNdgL4b17PjEyTZiaiYh9dMYyfMt7SE6xwu1NXBfCkVjx3Wu` |
| ActionRefused Revoked | `4QToK8k9wUrF7V13Cy9uSWk5MeazSoqV29av8B1TQBXiAAkf3ZuKqudoY1DCkq2wF2CgLwSt1eMm2bqCWH9FnBKW` |
| OwnerWithdrew | `4wHTuDTK9zSEzQPXPMSLTxPsZiMufY5AWEM7hcX4V5YadKwssJtJef41cuhSVjgk6Vq8DcUcWq7yHEppNuMTbvf5` |

Explorer prefix: `https://solscan.io/tx/<sig>?cluster=devnet`

---

## 7. FACTS appendix

Appended to `/workspace/docs/FACTS.md` (this run). Stale `~/markov/*/docs/FACTS.md` clones were **not** rewritten.

### A–L detail notes

**A.** No Anchor/Rust tests. Engine holds the 11 negative tests. Program `owner_withdraw` does not inspect `state` (good). `OwnerOnly` gates unpause.

**B.** `getSignaturesForAddress` on mandate program: 26 sigs. First receipt-class event 2026-08-28T06:53:12Z. Operators in events: only `AFmFYW…`. Last operator activity this scan: 2026-08-28T15:17:41Z (this-run four-beat). Redteam coverage **on chain: 0 dedicated**; engine redteam last `markov-redteam` ts 2026-08-27T19:21:18Z (ledger, not chain). Steady: **0** engine actions.

**C.** Template schema matches a v0 object (version `"0"`, allowlists, caps, execution_bounds, x402_budget, fee_terms, expiry). Master prompt §4 **file missing** — cannot certify 1:1 with that document.

**D.** Indexer sqlite (local, stale vs post-demo ledger): tables `operators, mandates, receipts, strategies`; views `strategy_stats, operator_stats`. `operators` count **0**. Receipts 226 vs chain ~24 events — **gap is engine-only HUD**. Duplicate sig `3mGrXq5v…` **twice** (create+fund same tx) — idempotency not unique on `sig`. Process down; no Supabase. Re-run sync **not executed** (service down).

**E.** Hosted subscribe round-trip **BLOCKED** (no `<FLOAT_URL>`, no browser wallet in this VM). Prior chain subscribe account `4YQ5Xm7q…` exists (Revoked, nonce 0). Diff UI: `TemplateDiff` on `/create` INSPECTED. Console refusal badge: engine/API yes; hosted no.

**F.** Last 24h engine names: `markov-momentum` yes; `markov-redteam` ~20h before 15:20Z (borderline); `markov-steady` **no**. Fan-out test exists (engine). No on-chain N-tx fan-out. Agents process `:8791` down.

**G.** Bot health + CLI revoke executed (engine). Burst config is a webpage. Token env-only (this repo). Org-wide history scan BLOCKED.

**H.** Facilitator **unset**. Settle mint **unset**. SPEC documents engine `x402` string; on-chain allowlist is mandate program id (AGENTS.md). Spend-within-budget on chain yes; `OverSpendCap` on chain **no**.

**I.** Strategy Vaults: yes. GitHub MarkovFyi: yes. kunaldrall29: zero on markovhq.com HTML. Litepaper **v0.6**. x402-native badge: yes (`Built on Solana · x402-native`). FAQ JSON-LD: **4** questions (Is Float live?; Who can withdraw?; How is this different from a vault?; What's a strategy?). Contact `hello@markovhq.net`.

**J.** SESSION_LOG has dated work logs, **not** S0–S10. Explicit S0 (2026-08-24 docs). S9 mentioned as remaining `markov.fyi/docs` 404. **S1–S8, S10 as session headers: missing.** Open FACTS: `F-X402-SETTLE-MINT`, `F-CANONICAL-DOMAIN`, unverified `security@markov.fyi`.

**K.** Hosted 6-beat: **fail**. Loopback engine beats 1–4 analog: pass. Chain four-beat (operator execute / OverTxCap / revoke / withdraw): pass this run. Telegram chain revoke: **not** this run.

**L.** See claim table below. Any UNVERIFIED claim in a **submission document** = NO-GO. Live litepaper/FAQ already contain UNVERIFIED sentences.

### L — claim board (live litepaper v0.6 + FAQ, not the missing application.md)

| Claim | Verdict | Evidence |
|---|---|---|
| Phase 0 live on Solana devnet (program) | VERIFIED | program show + dump cmp |
| Phase 0 / Float hosted on devnet | UNVERIFIED | product hosts 404; FAQ says yes |
| Every action and refusal emits an on-chain receipt | PARTIAL | Events exist for execute/refuse; engine-only HUD still emits most receipts |
| All eleven refusal types triggered in public | UNVERIFIED | chain 2/11 |
| Receipts public since `<FIRST_RECEIPT_DATE>` | VERIFIED **if** date = 2026-08-28 (chain). Engine 2026-08-24 is **not** public chain |
| x402 settling via live facilitator | UNVERIFIED | no pin; spend is in-program |
| Three house operators | PARTIAL | three **names** in API; one **pubkey** on chain; steady has 0 engine actions |
| Strategy vaults (per-subscriber caps) | VERIFIED (engine) | strategy-vault test + local POST; **not** hosted |
| Owner-only withdraw | VERIFIED | engine tests + program accounts |
| Float marketplace + console + kill switch + Telegram agent shipped | PARTIAL | code + local processes; not hosted; Telegram token SET locally |

---

## Working-tree note (not a fix)

Uncommitted at audit time: `apps/api/src/chain.ts`, `apps/api/src/index.ts`, indexer chain sync, Float tick copy, `scripts/float-chain-tick.ts`. Typecheck failures are in that WIP. **Do not treat as shipped.**
