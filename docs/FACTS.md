# FACTS.md

Claims ledger. If a number is not sourced and dated here, it does not go on a slide, the site, or a submission.

Last refreshed: 2026-08-28 (public-devnet mandate upgrade + venue deploy after 10 SOL).

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
| Float wallet auth | Per-request ed25519 (`x-actor` + `x-owner-ts` + `x-owner-sig`). Loopback unsigned `owner_demo` remains. Mainnet gated by `MARKOV_MAINNET=1` | API tests + live curl 2026-08-27: spoofed `body.owner` HTTP 400; signed create owned by pubkey; replay 401; proxy unsigned 401 |
| Lighthouse accessibility | Marketplace 100, mandate console 100 (mobile preset) | `npx lighthouse@12.8.2` vs `http://127.0.0.1:3000` and `/m/mdt_0035` 2026-08-27 |
| Telegram Float bot | Live on Telegram. `getMe` username `markov_float_bot`. Phone round-trip 2026-08-27: `/start` and `/help` return the emergency-bot copy; `/link` and `/status` without an id return mandate-id required. Token in gitignored `.env` only | Photo of `t.me/markov_float_bot` 2026-08-27. Do not write the token in this file. |
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
