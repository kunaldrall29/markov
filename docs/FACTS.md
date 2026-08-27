# FACTS.md

Claims ledger. If a number is not sourced and dated here, it does not go on a slide, the site, or a submission.

Last refreshed: 2026-08-27 (production/security pass in source; programs not redeployed).

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
| Mandate program on public Solana devnet | Yes — account executable, `solana program dump` matches `target/deploy/mandate.so` | `5o8EAwdHyQ31Nmt6tUDm1y6PNDt5STmVvA6CX3E6WJPm` on `api.devnet.solana.com` 2026-08-27; tx `4DucDFEbSPNCcBaggW4QKeMfwdkcwVEYSsud33mzXdzKSYuktQP35d2o5vNS6aCiGqj1uV1Nt7JGMoBNH9AQEUAZ` |
| CPI vault pinning in program **source** | Yes in `programs/{mandate,demo_swap,demo_yield}` | 2026-08-27. Live public-devnet mandate bytecode is the **pre-pin** dump that matched `target/deploy/mandate.so` at deploy time. Do not treat the live binary as this source until upgrade |
| demo_swap / demo_yield on public Solana devnet | No account (`getAccountInfo` null) | 2026-08-27. Deployer `2fpQvTynG9cnCXUqsrJ8CvpJZsNykehMdSv4nkJVStGg` has 2.247 SOL left after mandate rent 2.750. Need ~3 more SOL on that pubkey, then retry venue deploy |
| Telegram Float bot | Live on Telegram. `getMe` username `markov_float_bot`. Phone round-trip 2026-08-27: `/start` and `/help` return the emergency-bot copy; `/link` and `/status` without an id return mandate-id required. Token in gitignored `.env` only | Photo of `t.me/markov_float_bot` 2026-08-27. Do not write the token in this file. |
| Mandate + venues exercised on local validator | Yes — four-beat: under-policy execute, `OverTxCap` refusal tx, `Revoked` refusal tx, owner withdraw | `bun scripts/four-beat-devnet.ts` vs `solana-test-validator` 2026-08-24. Public explorer will not show local sigs. |
| `Anchor.toml` program pubkeys | Local keypair addresses | mandate `5o8EAwdHyQ31Nmt6tUDm1y6PNDt5STmVvA6CX3E6WJPm`, demo_swap `3HwcGXdsbfaAov2rYhDtnyeeEbuFVXUaT5GASTCjUUSK`, demo_yield `GsE3vpoBb26vZWbPBbtMACwVem2qgw7whouTLwAAhyzC` |
| markov.fyi docs/litepaper/Float URLs | **Not live** in this refresh | Intended site IA; GitHub is canonical until S9 |
| GitHub org `MarkovFyi` | Exists; this product tree is `kunaldrall29/markov` | `gh api orgs/MarkovFyi` 2026-08-25 |
| `security@markov.fyi` mailbox | Published in `SECURITY.md`; inbox not verified here | Treat as intended contact |

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
