# FACTS.md

Claims ledger. If a number is not sourced and dated here, it does not go on a slide, the site, or a submission.

Last refreshed: 2026-08-24.

## Verified in this workspace

| Claim | Status | Source / date |
|---|---|---|
| GitHub repository `kunaldrall29/markov` | Verified | `git remote` 2026-08-24 |
| Marketing site live at https://markovhq.com | Verified as live per `AGENTS.md` / product canon | 2026-08-24 — re-check if citing externally |
| Litepaper version for protocol claims | v0.4 | Internal canon; PDF/site path not hosted in this repo |
| Owner-only withdraw; operator has no withdraw path | True of `packages/engine` | `MandateEngine.ownerWithdraw` + tests, 2026-08-24 |
| Action and refusal receipts with machine-readable `BlockReason` | True of engine | `ActionRefused.reason`, 2026-08-24 |
| Emergency key: pause and revoke only; unpause owner-only | True of engine | `unpause` throws if caller ≠ owner; tests, 2026-08-24 |
| First-party agents use the public execute path | True of `apps/api` + `apps/agents` | 2026-08-24 |
| No token in this prototype | True | repo contains no mint/token program for Markov |
| Mandate program deployed | **No** | `programs/mandate` has no `src/lib.rs`; no cluster IDs |
| `Anchor.toml` program pubkeys | Local keypair addresses only | **Not** verified on devnet/mainnet as of 2026-08-24 |
| markov.fyi docs/litepaper/Float URLs | **Not live** in this refresh | Intended site IA; GitHub is canonical until S9 |
| GitHub org `MarkovFyi` | **Not verified** | This repo is `kunaldrall29/markov` |
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

Record versions here only after you have run them in this environment. Placeholders until a session verifies: Anchor 0.31.x (see `Anchor.toml`), Solana CLI, `bun` from `package.json` `packageManager`.
