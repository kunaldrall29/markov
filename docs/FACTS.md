# FACTS.md

Claims ledger. If a number is not sourced and dated here, it does not go on a slide, the site, or a submission.

Last refreshed: 2026-08-30 (D-08–D-11, domain split, Float `/receipts`).

## 2026-08-30 — owner decisions D-08–D-11 and domain split

| Claim | Status | Source / date |
|---|---|---|
| **D-08** | Grant application is not committed to this repo | Pack lives outside the code repo by design. `docs/grant/APPLICATION.md` is a pointer. Audit: **DEFERRED**, reactivates **Never**. Do not FAIL the audit for its absence. |
| **D-09** | Org transfer to MarkovFyi deferred until the grant is accepted | Org / licence / six-repo checks stay in the audit as **DEFERRED**. Reactivates: grant acceptance. Live tree remains `kunaldrall29/markov`. |
| **D-10** | Contact email is `hello@markovhq.net` | Deliberately a separate domain from `markovhq.com`. Inbox still unverified; do not re-flag the domain split. |
| **D-11** | Public receipts feed canonical path | `https://float.markovhq.com/receipts`. The marketing site is not the product feed. |
| `F-EMAIL-DOMAIN` | **Closed** | Resolved by D-10. `hello@markovhq.net` is intentional. |
| `F-DOMAIN-FLOAT` | **Closed** | `https://float.markovhq.com` live HTTPS on Vercel `float-web` / `lemmalabs`. |
| `F-DOMAIN-RECEIPTS` | **Closed** | Resolved by D-11. Canonical UI is Float `/receipts`. |
| `F-DOMAIN-SUBDOMAINS` | **Open** | `docs.markovhq.com` / `api.markovhq.com` / `app.markovhq.com` pending DNS + Vercel team ownership. Owner: Kunal. Not a code task. See `docs/handoff/DNS.md`. |
| `F-CANONICAL-DOMAIN` | **Closed** | Parent split 2026-08-30 into F-DOMAIN-FLOAT / F-DOMAIN-RECEIPTS / F-DOMAIN-SUBDOMAINS. Only the human-owned subdomain piece stays open. |
| `F-X402-SETTLE-MINT` | **deferred-M2** | Unchanged |

## 2026-08-29 — MVP v2.2

| Claim | Status | Source / date |
|---|---|---|
| Data layer | Railway Postgres via `DATABASE_URL` | `apps/indexer/migrations/postgres_boot.sql` includes `public_receipts` + `waitlist`. Supabase unused. |
| Indexer | Chain-native (program logs). API-ledger `POST /sync` removed | Hosted `https://indexer-production-00ef.up.railway.app/health` 2026-08-29. Public feed `GET https://data-api-production-5ac5.up.railway.app/v1/receipts/stats` `{total:19, allowed:7, blocked:12}` with **11** `by_reason` keys |
| `DOMAIN_CANONICAL` | `markovhq.com` | Decision 0. Handle `@markovfyi` |
| `FLOAT_URL` | `https://float.markovhq.com` | HTTP 200 title `Float — Markov` 2026-08-29. Vercel project `float-web` on `lemmalabs`. Interim alias `https://float-web-three.vercel.app` |
| `DOCS_URL` | `https://docs.markovhq.com` intended | TLS handshake fails. Live alias `https://markov-docs-black.vercel.app`. `vercel domains add` on `lemmalabs1` → `domain_not_owned` |
| `RECEIPTS_API_URL` | intended `https://api.markovhq.com` | TLS fails. Live `https://data-api-production-5ac5.up.railway.app`. Did not leave a pending Railway custom domain |
| `app.markovhq.com` 301 → float | **No** | DNS exists; HTTPS fails; lemmalabs cannot attach (`domain_not_owned`) |
| `markov.fyi` apex 301 | Yes | `https://markov.fyi/` → `https://markovhq.com/` |
| `markov.fyi` wildcard product hosts | **No** | `float.markov.fyi` / `docs.markov.fyi` / `api.markov.fyi` / `app.markov.fyi` → Vercel `DEPLOYMENT_NOT_FOUND` |
| `F-CANONICAL-DOMAIN` | **Closed** (split 2026-08-30) | See F-DOMAIN-FLOAT / F-DOMAIN-RECEIPTS / F-DOMAIN-SUBDOMAINS |
| `F-X402-SETTLE-MINT` | **deferred-M2** | Not MVP-blocking. In-program spend caps remain |
| House operators on-chain (distinct) | Yes | Pubkeys in `data/house-operators.json`. Fresh ticks 2026-08-29: steady deposit `3hYm2kvEFWDogpt3Y7kNPkVNDvgZo6YbTqy9wPuHCBcx7zFsQTBjad7ubBE93feNjKCYBANAkLbZkuZcmQAXw3PK`; momentum swap `2bKn6HciKS44iPQ6nMt669wgxFvqkSkGXRYVEc57x3hsec9XtfAZ7uScDN7uxHSCkRna1rq9AHNFXZh5yKvM18mt`; redteam swap `336PTYVwCjNgMzLDeNRrYM6SWu8jhGKitX7tcj4UUY5Q8p8iyhhVjVBdkhZhhS7qF8m6m3zhxJkZ2tb9ZBZeD6jS` |
| Fan-out N txs same `strategy_id` | Yes | Momentum hash `b7148375f60fe4a027ce664cd47c9982f9c6005868dc7ee148dc53c8ad976245`. A-ok `2HNeLwCRLgixjSobZjeow478rG9bBb5SJdD1JnwA3riXLkrJNhgxLdqWgrYGu2jv6d8SBUNxFLV6KcfTVgfV9HUk`; B-ok `3EyUooQerHbaWU6Qz8hCX5Voxqfc7AQQA86RSQ75qs26yZadZ2kgUAcQUTvNyNfi1VvQNo4o5F3LL9qrv7BFNkMA`; C-`OverTxCap` `2w7zzqXwXkgyfxB8d2wjMiw2qgZ4ZkN6Bx82RLNdeTPkCF6kYx8USqsb45iYzv8mVdEPu7d6U5HCMSWs3ECpfkqR` |
| Contact inbox | `hello@markovhq.net` | D-10. Deliberate separate domain. `SECURITY.md` and docs updated. Inbox still unverified |
| `gitleaks` full git history | Clean | gitleaks 8.24.3, 68 commits, no leaks. Working-tree `.env` / `keys/` are gitignored |
| Grant application v2.1 | **D-08 pointer** | Not in this repo by design. `docs/grant/APPLICATION.md` is the pointer. Audit DEFERRED, never reactivates |
| Litepaper v0.6.1 on markovhq.com | **Not this repo** | Live page still v0.6. D1 cannot restyle/publish that property from here |
| A1 org transfer `kunaldrall29/markov` → `MarkovFyi` | **D-09 deferred** | Reactivates on grant acceptance. `gh` 403 transfer. Stale MIT org repos still public |
| A2 `main` | Fast-forwarded 2026-08-29 | `origin/main` is the product tree (no longer the empty initial commit) |
| A3 Vercel git autodeploy | **No** | GitHub App still cannot connect. CLI deploys only |
| Hosted API `chainReady` | RPC probe + `data/devnet.json` | `https://api-production-d2e8.up.railway.app/health` `chainReady:true` 2026-08-29 after redeploy |
| Rust `#[test]` | 20 pass | `cargo test --manifest-path programs/mandate/Cargo.toml --features no-entrypoint` 2026-08-30. Added refuse-Ok, utc_day rollover, owner_withdraw all states, emergency cannot amend/withdraw, typed CPI |
| Telegram poller | Railway owns `getUpdates` | Loopback does not poll unless `TELEGRAM_POLL=1` |
| HELIUS_API_KEY / SOLANA_WS_URL | Public WS on Railway indexer | `wss://api.devnet.solana.com` (429s). Set Helius on Railway for lag |
| C6 Telegram phone capture | **No** | Hosted-bot API revoke **yes** (not phone): revoke `5C1eSYTw5komu2mxkFZEMr87U31U5uWNNAFPYqJ59FQaZrvL2zNTKC9Dw9SttXbtowUzCRBbVEgJ1hXRcw4Uqepb` then Revoked `42eduXDhbq4uEcHHgg43At9X9ReUCLRfSWHnCVURNSHqECiJhVRMtB1KkbzetgHQ6PB8naSzH1D3fgqwY265oamZ`. `EMERGENCY_KEY_JSON` SET on Railway api (not in git). |
| Hosted four-beat (Railway API) | Yes | 2026-08-29T20:31Z `bun run demo:hosted`. Mandate `mdt_0001` PDA `FriqAUtjSTvPSxaFyU6ZF2tt8GEto1oPrBLCyQvM6DjQ`. Create/fund `4KShUHkkFqHXKX58vk9jvYPwVe2MpAc7wex1WyRPeK3HQd111ux1RSsjPh17kvi9wZV2jX3C17vxWovLFrWAmUo4`; allow swap `y3sjiYKvNTj1iq4r2VmBSYop3ZHc1YMhbyvVk8WYwLeG5TCc8NM8RPaMhCmSxVtqy8ZYb14ptYyyB2t44Cg61S3`; OverTxCap `JA4G4BubB8NE4XcuQQatuS7F8mazha8UNcSG9oMUUAZew4LctazpvLjJ1CyriCSbcnZP1c87LGndXRjiuA3mqYW`. Indexed on data-api within 10s. JSON `docs/demo/hosted-four-beat.json`. Canonical UI: `https://float.markovhq.com/receipts` (D-11). Docs alias still serves `/receipts` |
| House ticks (this hour) | Yes | 2026-08-29T20:32Z steady `4MCyFY1LDj4KdJRdzWMzbVN7GiiJFEztAD5gmM2PyjabovvYZsiTmoZH6jYc2sWTes8sfcyVeQRarcN2hwEqRz3q`; momentum `3iHVgqeesxtLL5f83quWtzVoFrV2p8Tq1dXrigbGg1932m9uMxPDqWEWk5ANFZkPi3LRqhJ3Q6nbYebE4f1uoaku`; redteam `5dSyqiNccWw24utPwmisqKJSrNPPb1k8fZgd21z65gMnMZejSHUpANnWionXK8QfvTjZdpwoCKgfQumvmLKtpkeL` |
| MVP audit | **NO-GO** | `bun scripts/mvp-status-audit.ts` 2026-08-29 ~20:33Z. 7 OK / 2 FAIL: grant application stub; `F-CANONICAL-DOMAIN` Open. Chain 11 BlockReasons confirmed from FACTS sigs. |

### On-chain BlockReasons (11/11) — 2026-08-29 `bun scripts/chain-sprint.ts redteam`

| BlockReason | Signature |
|---|---|
| Paused | `4DUZvXKMM7TU4VLHFspxF7fwewAcXCkL5tLB7dZZ4qqrNj4Z87D6duEUyfSqYRngcmmHSgFhJ37LoSjsGFW4rDBW` |
| Revoked | `j1rXt7NBWFCn959HEnpE8dfEeWBbmGi6ykam4iDBfFug13DxXHMJR7Xbd4Zym6uHxTUKhcLTTLACRmafcu2XTZf` |
| Expired | `LCtb5nHDARCNuHDmGM5T4NFGsMnNrLaqBjqd733bvhGpAGh3NG46uwTyNQK3zHCEXXdpdYMeULtibiCSkBmuySc` |
| Unauthorized | `4KRnfoC51QHhfG5e5CqsKNZjMRT45Xf1nLUFEAMuL8i1gFSjFG8BWUfugKrszV7JWbinz4TxYorTcvujbsnMECjG` |
| ProgramNotAllowed | `5WYsaxf5jDFdkN1LMQ9peF8EVxofmEvcHKMC8xZfEFCQb1ehxtcoXVGu32Q3iEAnYAAxey4AnCstmPoqV9wrKtUa` |
| TokenNotAllowed | `39t5zf1zCbUYvE5gkUE3YSSF8jhPzWHYPun6tHnv2RwThMXk7PDJSbiLAXXcT3uSxzCT3s98GbBzUX4GtEfpAa7u` |
| OverTxCap | `eujc35KFxsXBUBZzfcaza2W41jERwqwy2oG6Rxx1bAY3uidZWdoXDYLSRvyDqCAtomNWQDBh8QdFGfUFsdpZC3Y` |
| OverDailyCap | `2o4HvZShnyqEVvLrbxcd9kHechjcUaAvPBtEheW9BqU2SYdRJys8Lh9DK1rn87Y3D6NbCCK7HokRQ9pe4uXw1xtb` |
| OverSpendCap | `3BWrnwFAwZJ4T21UedSqqsNzN9YMa4Lah4hcEXKUseWvkeK6u8zLrh1qBoP6QfRMVqzrBq6j8uWDrkNYEPyzXDEb` |
| OverSpendDailyCap | `48rxsnSqyKLX5HSL6YhMSaeY8Vxb2w4do2RL5eSCQW7wDGy9zpdsHB8DJFRFAKQFWFyqnoSrvvayP61gqzr8buhB` |
| SlippageExceeded | `8ctcEEoD95bS7xnTXtJepaiv3Lr3poryvwZj1CKNrnpPauD8gXKb1MnpV5F9UVDwsoiJYwjKzyvQYCxLrre334P` |

Revoke setup (C6 chain pair, not phone): `5F3zKLXVdCQsafBnHryrLuEexMEmrvc6cFy9EKnaDH3UAWq48gmC6ScTMwXJ9bsoFND3pVNVW83GnSjp1B97h4Lv` then Revoked `j1rXt7NBWFCn959HEnpE8dfEeWBbmGi6ykam4iDBfFug13DxXHMJR7Xbd4Zym6uHxTUKhcLTTLACRmafcu2XTZf`. All 11 also carry redteam `strategy_id` `9b4913d105a73c36981826783959a08eeb8dfd18cb31b5638e2ba4ae25005d49`.

## 2026-08-29 — Vercel (kunaldrall29)


| Claim | Status | Source / date |
|---|---|---|
| Float production | Yes | `https://float-web-three.vercel.app` READY 2026-08-29. Source: this repo `cursor/public-receipts-aeb5` via Vercel CLI on team `lemmalabs` (`kunaldrall29`). `/` `/create` `/kill` `/bot` `/sheet` HTTP 200 |
| Protocol docs production | Yes | `https://markov-docs-black.vercel.app` READY 2026-08-29. `/` `/docs` `/receipts` HTTP 200. JS bakes Railway `https://data-api-production-5ac5.up.railway.app` |
| Git autodeploy from `kunaldrall29/markov` | **No** | Vercel GitHub App still cannot connect that repo (`git connect` failed). CLI upload from this checkout |
| Vercel team for these URLs | `lemmalabs` (`lemmalabs1`) | `vercel whoami` = `kunaldrall29`. Not the `kunal-drall` hobby team `kunals-projects-35d3a237` |

## 2026-08-28 — public receipts

| Claim | Status | Source / date |
|---|---|---|
| `PUBLIC_VIEW` | `public_receipts` | `apps/indexer/migrations/0003_public_receipts.sql` + `.postgres.sql` 2026-08-28 |
| `RECEIPTS_API_URL` | Local `http://127.0.0.1:8788`. Hosted `https://data-api-production-5ac5.up.railway.app` | Hosted `GET /v1/receipts` 200 `{"receipts":[],"next_cursor":null}` 2026-08-28. Docs Vercel build bakes this URL when `VERCEL` is set |
| `GET /v1/receipts` + `/v1/receipts/stats` | Yes, local | 2026-08-28. No auth. 60 req/min/IP → 429 `Retry-After`. Invalid `reason` → 400. CORS localhost + `https://markov.fyi` |
| Live receipts page | Yes, local + hosted docs | Local `http://127.0.0.1:3001/receipts`. Hosted `https://markov-docs-black.vercel.app/receipts` 200 2026-08-29 |
| Float-agents allow + OverTxCap | Yes | `mdt_0043` 2026-08-28. `PORT=0 bun apps/agents/src/index.ts momentum mdt_0043` then `--over-cap` |
| Devnet overlay allow + OverTxCap sigs | Yes | `mdt_0044`. Allow swap `3WFxpqWu8iAUmBcaXE71LaESwezkNpkDeKNot2tGFkLQv3Pvs9GYRSDmDb88nZjnU3CA5Zj6udDZx3bw3arLzxi6`. OverTxCap `yNgf4hfoLSU3wT2GHvHTsUKkBnPwK2SVRRy2Dq1SfQ29DRys5oHHGm9xC7H4X8hupMwYiN7hcST2Fq8AMt9HohZ` |
| Railway project `markov` | Yes | Workspace `kunal drall's Projects`. Postgres 18 + api / indexer / data-api / bot / agents. `HOST=0.0.0.0`. `MARKOV_API_SECRET` SET (generated, not in git). Telegram token SET from gitignored `.env` (`username` `markov_float_bot`) |
| Hosted `public_receipts` | Yes | `postgres_boot.sql` applied on indexer boot. Indexer health `db: sqlite+postgres`. Empty feed until the hosted API has receipts |
| Supabase `markov-devnet` view applied | **No** | Local `DATABASE_URL` UNSET. Hosted DB is Railway Postgres, not Supabase |

## 2026-08-28 — MVP status audit (EXECUTED)

| Claim | Status | Source / date |
|---|---|---|
| Verdict: “MVP complete and hosted on devnet” | **NO-GO** | Audit 2026-08-28 ~15:20 UTC. Blocking: no public Float URL; on-chain BlockReasons 2/11; no x402 facilitator pin; MarkovFyi ≠ six Apache repos; grant markdown files absent |
| Mandate program public devnet | Yes | `solana program show` `5o8EAwdHyQ31Nmt6tUDm1y6PNDt5STmVvA6CX3E6WJPm` slot **489249058**, dump `cmp -n 403424` = `target/deploy/mandate.so` |
| Chain distinct BlockReasons | **2** (`OverTxCap`, `Revoked`) | EventParser, all 26 mandate-program signatures. Missing 9 of 11 |
| `<FIRST_RECEIPT_DATE>` (chain events) | 2026-08-28T06:53:12Z | First `MandateCreated` `5No1AUkXpFquHBumw8XwRVp8xnP2ZxrSpYcmnh7BK1aCMHVP1nTnnQVKuhsKYf4WiJX3yps2JamSuaymyrAT4Vmd` |
| `<FLOAT_URL>` public | Yes (Vercel hobby alias) | `https://float-web-three.vercel.app` 200 2026-08-29. `app.markov.fyi` / `float.markov.fyi` still 404 |
| Litepaper on markovhq.com | **v0.6** (page title + body). Previous v0.4 mentioned | `GET https://markovhq.com/litepaper` 200. In-repo FACTS had said v0.4 |
| FAQ “Is Float live? Yes, on Solana devnet” | **UNVERIFIED** as hosted product | markovhq.com JSON-LD FAQ. Product hosts 404 |
| “all eleven refusal types in public” (litepaper v0.6) | **UNVERIFIED** | Chain 2/11. Engine ledger has 11 (not public chain) |
| “live Solana facilitator” (litepaper v0.6) | **UNVERIFIED** | `F-X402-SETTLE-MINT` still open; env unset |
| On-chain `strategy_id` on a mandate account | Yes | PDA `4YQ5Xm7qxxC6UjDHPSh8F2Md5dorb8hsKbcWpfrM21X4` = momentum hash `b7148375f60f…`. No ActionExecuted event parsed with Some(strategy_id) |
| House operator on-chain pubkey | `AFmFYWsn7hijB54y45Tvs8XQxuy1uG9MRQXDqThKXXBs` | All execute/refuse events. Engine names are not pubkeys |
| markovhq.com GitHub | `https://github.com/MarkovFyi` | zero `kunaldrall29` in HTML. Contact `hello@markovhq.net` |
| MarkovFyi public product repos | 3 + `.github`, **MIT** | `gh repo list MarkovFyi`. Not six Apache-2.0 |
| `kunaldrall29/markov` | Public Apache-2.0 | `gh repo view` |
| Supabase | **Not configured** | Local `DATABASE_URL` UNSET, `SUPABASE_SERVICE_ROLE_KEY` UNSET. Hosted receipts use Railway Postgres |
| Local indexer sqlite | Tables+views exist; process down | `data/indexer.sqlite`; `:8790` down. Duplicate sig `3mGrXq5v…` ×2 |
| `gitleaks` / `trufflehog` | **BLOCKED** | not installed. `.env` not in `git ls-files` |
| `prompt-mvp-build-v2.md` / `markov-superteam-application-v2.md` / `markov-litepaper-v0.6.md` | **Absent** from `/workspace` and `~/markov` | Cannot verify application KPI `[50/100]` |
| Open FACTS (unchanged) | `F-X402-SETTLE-MINT`, `F-CANONICAL-DOMAIN`, `security@markov.fyi` inbox unverified | |

## Verified in this workspace

| Claim | Status | Source / date |
|---|---|---|
| GitHub repository `kunaldrall29/markov` | Verified | `git remote` 2026-08-24 |
| This repo contains all six products as directories | Product decision | Kunal 2026-08-26; `docs/MAP.md` |
| GitHub org `MarkovFyi` public repos | `markov-program`, `markov-sdk`, `float-web`, `.github` (read-only from this agent) | `gh repo list MarkovFyi` 2026-08-25 |
| Marketing site live at https://markovhq.com | Verified as live per `AGENTS.md` / product canon | 2026-08-24 — re-check if citing externally |
| Litepaper version for protocol claims | v0.4 | Internal canon; PDF/site path not hosted in this repo |
| Owner-only withdraw; operator has no withdraw path | True of `packages/engine` | `MandateEngine.ownerWithdraw` + tests, 2026-08-24 |
| Action and refusal receipts with machine-readable `BlockReason` | True of engine | `ActionRefused.reason`, 2026-08-24 |
| Emergency key: pause and revoke only; unpause owner-only | True of engine | `unpause` throws if caller ≠ owner; tests, 2026-08-24 |
| First-party agents use the public execute path | True of `apps/api` + `apps/agents` | 2026-08-24 |
| No token in this prototype | True | repo contains no mint/token program for Markov |
| Mandate program source | Yes | `programs/mandate/src/lib.rs` 2026-08-24 |
| Mandate program on public Solana devnet | Yes — executable, upgrade authority `2fpQvTynG9cnCXUqsrJ8CvpJZsNykehMdSv4nkJVStGg` | `5o8EAwdHyQ31Nmt6tUDm1y6PNDt5STmVvA6CX3E6WJPm` on `api.devnet.solana.com` 2026-08-28. Last slot 489249058. Data length 405120. `solana program dump` first 403424 bytes `cmp` equal to `target/deploy/mandate.so`; remaining 1696 bytes are zero pad from a 10240-byte extend (BPF loader requires ≥10240 additional bytes). Upgrade tx `2baq433jFmgRW2wEHnsQHRCBtFYMCLzj1debKMWrNX4nouutR2QK8JqfpGdp3VAHVuSAnNL28dbXRtk6eC2UhBHh` |
| CPI vault pinning / `strategy_id` in **live** mandate bytecode | Yes | 2026-08-28. Source and dump match after extend + upgrade. Generated IDL events `ActionExecuted` / `ActionRefused` include `strategy_id` (`packages/operator/idl/mandate.json` copied from `target/idl`) |
| demo_swap on public Solana devnet | Yes — executable, authority same deployer | `3HwcGXdsbfaAov2rYhDtnyeeEbuFVXUaT5GASTCjUUSK` dump `cmp` equal to `target/deploy/demo_swap.so` (236832). Deploy tx `53e46CWYimVS57tvwf6kDzyBmu7XQvV1EUX8FpS98oFSxY1nRp9mCo6vqrDC1TDaD5CbnVKvLaDrMR1gB7fzj3Fy` |
| demo_yield on public Solana devnet | Yes — executable, authority same deployer | `GsE3vpoBb26vZWbPBbtMACwVem2qgw7whouTLwAAhyzC` dump `cmp` equal to `target/deploy/demo_yield.so` (237408). Deploy tx `37gMPSBVcTGDpiBTUrXvjfqJNdCncPCmgx9CunarcqsD3XzWio6b4g9Wbx28E9B5Y4guWghiEFw6tav8My5VSdu8` |
| Public-devnet USDC-d / DEMO mints + venue pools | Yes — `data/devnet.json` rpc is `https://api.devnet.solana.com` | 2026-08-28. usdcd `6eDVRpGLcBeYfazqsUN9tyeW7NEKjgE3TSgs7yz1YmvC`, demo `54XpmsacxMvrWPFXrtSjYkconsWm4Xpd7sFPUH1Z4zhd`. Swap pool vaults 1_000_000 USDC-d / 10_000_000 DEMO. Yield vault 1_000_000 USDC-d. `MARKOV_SKIP_DEPLOY=1 MARKOV_SKIP_FUND=1 bun scripts/devnet-setup.ts` |
| 10 SOL received on deployer | Yes | 2026-08-28. Deployer `2fpQvTynG9cnCXUqsrJ8CvpJZsNykehMdSv4nkJVStGg` 2.247 → 12.247 SOL, then helper funding + deploys. Post-init deployer ~6.85 SOL |
| Float wallet → live mandate | Yes — unsigned tx, owner signs, HUD after confirm | 2026-08-28 `bun scripts/float-chain-subscribe.ts`. Engine `mdt_0038` PDA `4YQ5Xm7qxxC6UjDHPSh8F2Md5dorb8hsKbcWpfrM21X4`. Create/fund `3mGrXq5vfaGUWZnhuqLt2Mo4uvktRz5RQc92W6n9HLQPZAFS8rpif9To79nVH4maGN5UxqWKXk7nhNK5khTHx7X5`. Pause `623dpkC8G2iNDYmtsiGWb5tJ4WUh829Bt8vg5L3zPnxDAZYEuo2WMh3g2ESS3otpdTFyRSyzP2dBNw3758aJSqXf`. Withdraw `Nt7YSyWmDN8dLMu3Fu7u4Aq8iDYwLeJ9BtdfZm3spFe7xn5n49VPXg5dRdLhY1W8cXyRvon1FnVv2qnmHCi5Yf4`. Revoke `5uBLfQ6TuaUCkqakWT15sciRW42ffcLs9zPimboDRqXHWe4oawFpJpNjUvaUkvpK4okGXkdtgZ15ufeks4vyWEQS`. Console `/m/mdt_0038` shows on-chain PDA + explorer links |
| Lighthouse accessibility | Marketplace 100, mandate console 100 (mobile preset) | `npx lighthouse@12.8.2` vs `http://127.0.0.1:3000` and `/m/mdt_0035` 2026-08-27 |
| Telegram Float bot | Live on Telegram. `getMe` username `markov_float_bot`. Phone chat `8619705568` allowlisted. Phone round-trip 2026-08-28: `/status mdt_0037` → Active; `/pause mdt_0037` → Paused; `/revoke` without id → mandate-id required; `/revoke mdt_0037` → Revoked. Ledger receipts `Paused` then `Revoked` by `bot_emergency` (ts 1787906462 / 1787906481). Token in gitignored `.env` only | Photo of `t.me/markov_float_bot` kill-switch 2026-08-28. Do not write the token in this file. |
| Mandate + venues exercised on public Solana devnet | Yes — four-beat: fund, under-policy spend+swap, `OverTxCap` refusal tx, `Revoked` refusal tx, owner withdraw | 2026-08-28 `bun scripts/four-beat-devnet.ts` vs `https://api.devnet.solana.com`. Mandate `8wEAR5oSYzKrRtLki8H7E87TcHaDYbzuFT7L2cjnPnJo`. Fund `2iqbzg6sfoxRQB3Jot9KfmLyEdevYaEn4a6cMntqNnXenn2ev2rPtFQ4GpZ2ApZX4kRA91gsh5KWdmyeDB5LHA1T`. OverTxCap `3ajx6eZ67oJGGsL5TUzHvhLGrW3wBaXXng7kYxxzu7DGQmL7B3jJ1tBrDZxjGMudS6pex1yF3rD9b2rj4gtkq6cR`. Revoked swap `3vZt8w1yzn799rFrBW8yMNqARnV29K6TzhX7P1FN7puAQJhF7MM2wSBg9vfmSzLTpDTZTiXaAQyqHYTd7br7mwcU`. Owner withdraw `342HP72T7G5Lb9hUeorot91PEigQoncuw9o7x1ThXtv3nYuMryCfDxY53cCwPKMbXbG6s64RWxvGUtUeU8AoZK8q` |
| Mandate + venues exercised on local validator | Yes — four-beat: under-policy execute, `OverTxCap` refusal tx, `Revoked` refusal tx, owner withdraw | `bun scripts/four-beat-devnet.ts` vs `solana-test-validator` 2026-08-24. Public explorer will not show local sigs. |
| `Anchor.toml` program pubkeys | Local keypair addresses | mandate `5o8EAwdHyQ31Nmt6tUDm1y6PNDt5STmVvA6CX3E6WJPm`, demo_swap `3HwcGXdsbfaAov2rYhDtnyeeEbuFVXUaT5GASTCjUUSK`, demo_yield `GsE3vpoBb26vZWbPBbtMACwVem2qgw7whouTLwAAhyzC` |
| markov.fyi docs/litepaper/Float URLs | **Not live** in this refresh | Intended site IA; GitHub is canonical until S9 |
| GitHub org `MarkovFyi` | Exists; this product tree is `kunaldrall29/markov` | `gh api orgs/MarkovFyi` 2026-08-25 |
| `security@markov.fyi` mailbox | Published in `SECURITY.md`; inbox not verified here | Treat as intended contact |
| `F-X402-SETTLE-MINT` | **deferred-M2** | Facilitator settle mint is grant M2. MVP uses in-program spend caps |
| `F-CANONICAL-DOMAIN` | **Closed** (split 2026-08-30) | See F-DOMAIN-* rows in the 2026-08-30 table |

## External numbers (litepaper appendix — re-verify before public use)

| Claim | Status | Source / note |
|---|---|---|
| x402 on Solana: 35M+ tx, $10M+ volume | Unverified in this repo | Litepaper cites Solana Foundation, mid-2026 — refresh |
| x402 on Base: ~100M agentic tx by Q1 2026; $1+ transfers 49% → 95% | Unverified in this repo | Litepaper cites Chainalysis — refresh |
| Solana circulating stables: $15B+ | Unverified in this repo | Litepaper, reported Aug 2026 — refresh |
| Solana-native agent identity standard | Do not name until confirmed | ERC-8004 is EVM-native |
| Venue program IDs / CPI interfaces | Confirm at deploy | Swap router + lending markets |
| Vault-infra take rates 10–15% of operator fees | Confirm before fee terms | Comparables, not a quote |
| Application-controlled execution (Solana roadmap) | Confirm current name/status | Do not cite stale naming |
| Prediction venues CPI-able on Solana | Confirm before naming | Phase 2+ |
| Telegram Mini App → wallet deep-link | Confirm before non-custodial funding claims | Phantom/Solflare path |

## Toolchain (when you build on-chain)

| Tool | Version | Date |
|---|---|---|
| Anchor CLI | 0.31.1 | 2026-08-24 |
| Solana CLI | 2.1.21 | 2026-08-24 |
| rustc (host) | 1.85.0 | 2026-08-24 |
| bun | 1.4.0 (`package.json` packageManager) | 2026-08-24 |
| `@coral-xyz/anchor` | 0.31.1 | 2026-08-24 |
| blake3 (Cargo.lock pin) | 1.5.5 | required for SBF cargo 1.79 |
