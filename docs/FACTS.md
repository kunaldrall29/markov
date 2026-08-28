# FACTS.md

Claims ledger. If a number is not sourced and dated here, it does not go on a slide, the site, or a submission.

Last refreshed: 2026-08-28 (Phase 0 MVP status audit). Full write-up: `STATUS.md` / `~/markov/STATUS.md`.

## 2026-08-28 — MVP status audit (EXECUTED)

| Claim | Status | Source / date |
|---|---|---|
| Verdict: “MVP complete and hosted on devnet” | **NO-GO** | Audit 2026-08-28 ~15:20 UTC. Blocking: no public Float URL; on-chain BlockReasons 2/11; no x402 facilitator pin; MarkovFyi ≠ six Apache repos; grant markdown files absent |
| Mandate program public devnet | Yes | `solana program show` `5o8EAwdHyQ31Nmt6tUDm1y6PNDt5STmVvA6CX3E6WJPm` slot **489249058**, dump `cmp -n 403424` = `target/deploy/mandate.so` |
| Chain distinct BlockReasons | **2** (`OverTxCap`, `Revoked`) | EventParser, all 26 mandate-program signatures. Missing 9 of 11 |
| `<FIRST_RECEIPT_DATE>` (chain events) | 2026-08-28T06:53:12Z | First `MandateCreated` `5No1AUkXpFquHBumw8XwRVp8xnP2ZxrSpYcmnh7BK1aCMHVP1nTnnQVKuhsKYf4WiJX3yps2JamSuaymyrAT4Vmd` |
| `<FLOAT_URL>` public | **None** | `app.markov.fyi` / `float.markov.fyi` / `api.markov.fyi` HTTP 404. Local `:3000` 200 only |
| Litepaper on markovhq.com | **v0.6** (page title + body). Previous v0.4 mentioned | `GET https://markovhq.com/litepaper` 200. In-repo FACTS had said v0.4 |
| FAQ “Is Float live? Yes, on Solana devnet” | **UNVERIFIED** as hosted product | markovhq.com JSON-LD FAQ. Product hosts 404 |
| “all eleven refusal types in public” (litepaper v0.6) | **UNVERIFIED** | Chain 2/11. Engine ledger has 11 (not public chain) |
| “live Solana facilitator” (litepaper v0.6) | **UNVERIFIED** | `F-X402-SETTLE-MINT` still open; env unset |
| On-chain `strategy_id` on a mandate account | Yes | PDA `4YQ5Xm7qxxC6UjDHPSh8F2Md5dorb8hsKbcWpfrM21X4` = momentum hash `b7148375f60f…`. No ActionExecuted event parsed with Some(strategy_id) |
| House operator on-chain pubkey | `AFmFYWsn7hijB54y45Tvs8XQxuy1uG9MRQXDqThKXXBs` | All execute/refuse events. Engine names are not pubkeys |
| markovhq.com GitHub | `https://github.com/MarkovFyi` | zero `kunaldrall29` in HTML. Contact `hello@markovhq.net` |
| MarkovFyi public product repos | 3 + `.github`, **MIT** | `gh repo list MarkovFyi`. Not six Apache-2.0 |
| `kunaldrall29/markov` | Public Apache-2.0 | `gh repo view` |
| Supabase | **Not configured** | `DATABASE_URL` UNSET, `SUPABASE_SERVICE_ROLE_KEY` UNSET |
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
| `F-X402-SETTLE-MINT` | **Open** | Facilitators typically settle canonical devnet USDC, not `USDC-d`. Confirm when a facilitator is pinned. Blocking for live x402 spend on public devnet, not for the local engine spend stub |
| `F-CANONICAL-DOMAIN` | **Open** | Decision 0. `markov.fyi/docs` 404; local Docusaurus `:3001`. Do not invent a canonical host |

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
