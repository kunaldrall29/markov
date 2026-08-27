# Session log

Handoff file. Newest entry at the top. Facts, not narrative.

## 2026-08-27 — MVP v2 start (strategy vaults, no program deploy)

- Goal: land MVP v2 as source of truth in this tree: PolicyTemplate v0, `strategy_id` on engine/program source, house operators, Float strategy marketplace, fan-out, redteam sweep, indexer views. Do not deploy or upgrade on-chain programs.
- Done: `docs/markov-mvp-v2.md` + three mermaid diagrams. SPEC/README/AGENTS freeze. Engine receipts copy `strategyId`. Program `Mandate.strategy_id` + receipt events (source only; live devnet bytecode still pre-pin / pre-strategy_id). SDK `createMandateFromTemplate` tighten-only + hash stability tests. API: `GET /strategies`, subscribe via `POST /mandates` `{ strategyId, overrides }`, fan-out, `POST /demo/strategy-vault` (A+B execute size 60, C cap 40 → OverTxCap), `POST /agents/redteam/sweep` (all 11 BlockReasons). Indexer `0002_strategy.sql` + `strategy_stats` / `operator_stats` views. Float cards are strategies; subscribe/tighten; `/s/[id]`, `/o/[id]`, `/kill`. Bot `/strategies`. House agents `steady|momentum|redteam`.
- Verified this session: `bun test packages apps` 56 pass; `bun run typecheck` 0; `@markov/web` build 0. Live API vault: mdt_0030/0031 `ActionExecuted` size 60, mdt_0032 `ActionRefused OverTxCap` asked 60, vault still 200 USDC-d, `per-tx 40`, same `strategy_id`. Loosen override HTTP 400. Redteam stats refusals 11. Bot `/strategies` lists house cards. No program deploy.
- Not done: no `anchor build` / no program deploy. `F-X402-SETTLE-MINT` and `F-CANONICAL-DOMAIN` still open. Public-devnet mandate binary unchanged. Venues still undeployed.
- Next: Kunal — `TELEGRAM_ALLOWED_CHAT_IDS`; ~3 SOL on deployer **after** vault-pin + `strategy_id` bytecode is what ships; mandate upgrade buffer SOL; hosting + `MARKOV_API_SECRET` if public HTTP.

## 2026-08-27 — production/security pass (no program deploy)

- Goal: production-ready check and full security review before any further on-chain deploy; polish Float UI.
- Done: CPI vault pinning in mandate / demo_swap / demo_yield source; HTTP mutations fail closed behind proxy or `HOST=0.0.0.0` without `MARKOV_API_SECRET`; `/health` returns `rpcHost` only; Telegram `/pause` `/revoke` require allowlist (`/whoami`); services default bind `127.0.0.1`; Float skip link, `error`/`not-found`, confirm revoke/withdraw, operator-matched tick, focus-visible. `bun test` 46 pass. `bun run typecheck` 0. `@markov/web` build 0.
- Not done: no program deploy or upgrade. Public-devnet mandate bytecode is still the pre-pin binary. Venues still undeployed.
- Next: Kunal — `TELEGRAM_ALLOWED_CHAT_IDS` from `/whoami`; ~3 SOL on deployer for venues **after** this source is the bytecode that ships; mandate upgrade needs a new `.so` + buffer SOL.

## Template

```
## YYYY-MM-DD — session title

- Goal
- Done
- Not done / blocked
- Commands that work
- Docs touched
- Next
```

## 2026-08-27 — Telegram round-trip on phone

- Goal: confirm `t.me/markov_float_bot` answers on a real device.
- Done: `/start` and `/help` returned the emergency-bot copy; `/link` and `/status` without an id returned mandate-id required. Matches `apps/bot/src/commands.ts`. Health still `tokenSet:true`.
- Not done: `/status <id>` not shown in the photo. Venues still undeployed.

---

## 2026-08-27 — Telegram bot token accepted

- Goal: attach `t.me/markov_float_bot` with a token Telegram accepts.
- Done: `getMe` ok username `markov_float_bot` id 8751826628; `setMyCommands` help/status/pause/revoke/link; `http://127.0.0.1:8789/health` `tokenSet:true` `username:markov_float_bot`; CLI `/status mdt_0001` → `mdt_0001 state=Revoked`; `/link mdt_0001` → `https://t.me/markov_float_bot?start=mdt_0001`. Bot process polling. Token not committed.
- Not done: no Telegram chat_id yet, so no in-app `/status` round-trip. Venues still undeployed (deployer 2.247 SOL).
- Next: open `t.me/markov_float_bot` and send `/help`. ~3 more SOL on deployer for venue programs.

---

## 2026-08-27 — public-devnet mandate + Telegram token

- Goal: use the 5 SOL airdrop and the Float bot token.
- Done: deployer `2fpQvTynG9cnCXUqsrJ8CvpJZsNykehMdSv4nkJVStGg` held 5.000 SOL; mandate `5o8EAwdHyQ31Nmt6tUDm1y6PNDt5STmVvA6CX3E6WJPm` deployed on `api.devnet.solana.com`; dump matches `target/deploy/mandate.so`; tx `4DucDFEbSPNCcBaggW4QKeMfwdkcwVEYSsud33mzXdzKSYuktQP35d2o5vNS6aCiGqj1uV1Nt7JGMoBNH9AQEUAZ`. Token stored in gitignored `.env` with `TELEGRAM_BOT_USERNAME=markov_float_bot`.
- Not done: `demo_swap` / `demo_yield` still null on public devnet (deployer 2.247 SOL left). Telegram `getMe` HTTP 401 Unauthorized. Token not committed.
- Commands: `solana program deploy target/deploy/mandate.so --program-id keys/mandate.json -u https://api.devnet.solana.com -k keys/deployer.json`
- Next: ~3 more SOL on the deployer pubkey; a BotFather token that `getMe` accepts.

---

## 2026-08-27 — Markov devnet MVP status

HEAD `079bd20`. No commits since 2026-08-26. FACTS `c046286`.

BUILT AND VERIFIED
- markov-program: `bun run demo:devnet` exit 0 on `http://127.0.0.1:8899` (mandate `DEp8YvRGXXq4Suzr7Dr5qZFsGaQbnKurjxtA9MwXQ6C5`; OverTxCap then Revoked). `solana program dump` of `5o8EAwdHyQ31Nmt6tUDm1y6PNDt5STmVvA6CX3E6WJPm`, `3HwcGXdsbfaAov2rYhDtnyeeEbuFVXUaT5GASTCjUUSK`, `GsE3vpoBb26vZWbPBbtMACwVem2qgw7whouTLwAAhyzC` `cmp` equal to `target/deploy/{mandate,demo_swap,demo_yield}.so`.
- markov-sdk: `bun test packages apps` 35 pass 0 fail; typecheck `@markov/sdk` `@markov/engine` `@markovfyi/operator` `@markov/rpc` exit 0.
- float-web: web tests pass; `bun run --filter @markov/web typecheck` 0; `bun run --filter @markov/web build` 0. api four-beat test pass. indexer sqlite test pass.
- float-agents: data-api tests pass; typecheck `@markov/agents` `@markov/data-api` 0.
- float-bot: bot tests pass; typecheck 0. `handleCommand("/status mdt_0001")` → `mdt_0001 state=Revoked`.
- markov-site: site tests pass; typecheck 0; `bun run --filter @markov/site build` 0.

LIVE
- `http://127.0.0.1:8787/health` 200 `ok:true` `rpc:http://127.0.0.1:8899`
- `http://127.0.0.1:8788/health` 200; `GET /price/DEMO` 402
- `http://127.0.0.1:8789/health` 200 `tokenSet:false`
- `http://127.0.0.1:8790/health` 200; `POST /sync` `{"pulled":88}`
- `http://127.0.0.1:3000/` 200 title `Float — Markov`
- `http://127.0.0.1:3001/docs` 200 Docusaurus
- `https://markovhq.com` 200 title `Markov — Give an agent your capital. Keep the keys.`
- `https://markov.fyi` 200 same etag as markovhq.com
- `https://markov.fyi/litepaper` 200 title `Litepaper — Markov` v0.4
- local `:8899` program IDs executable; bytecode = `target/deploy/*.so`

BUILT, NOT VERIFIED
- `bun run typecheck` exit 2: `@markov/api` `@markov/indexer` TS2307 `node:fs`/`node:path` (api also TS5097 `.ts` import).
- `anchor build` not run. No `#[test]` in `programs/`.
- `GET :8789/status` 404. Telegram `/status` not sent (`tokenSet:false`).
- Public `getAccountInfo` for the three `Anchor.toml` IDs on `https://api.devnet.solana.com`: null.
- `https://float.markov.fyi` 404; `https://data.markov.fyi` 404; `https://docs.markov.fyi` 404.
- `https://float-web.vercel.app` 200 title `Float` h1 `Your Place on the Water,Always Waiting.` (not this repo).
- `:8791` connection refused.

IN PROGRESS
S9. Done: `https://markov.fyi/litepaper` 200 v0.4; local Docusaurus `:3001/docs` 200. Remaining: `https://markov.fyi/docs` 404; `DEMO.md` absent; `scripts/README.md` absent. MAP S7 paths `docs/indexer.md`, `docs/policy-presets.md`, `docs/data-api.md` absent.

NOT STARTED
Phase 1–3 in `docs/PITCH.md` (audit/mainnet, copilot, launch radar, scores/bonds/credit). MAP has no S1.

BLOCKED / NEEDS KUNAL
- Public deploy: deployer `2fpQvTynG9cnCXUqsrJ8CvpJZsNykehMdSv4nkJVStGg` `getBalance` 0 on `https://api.devnet.solana.com`. Need SOL on that account. Unblocks program accounts at `Anchor.toml` IDs on public devnet.
- Telegram: `TELEGRAM_BOT_TOKEN` unset. Need the bot token. Unblocks Telegram `/status`.

RISKS
- `Anchor.toml` IDs `getAccountInfo` null on `https://api.devnet.solana.com`; deployer lamports 0.
- `bun run typecheck` exit 2 (`@markov/api`, `@markov/indexer`).
- `docs/FACTS.md` (2026-08-26) `markov.fyi docs/litepaper/Float URLs | Not live` vs `https://markov.fyi/litepaper` HTTP 200 v0.4. `c046286` FACTS rows (six products; tree is `kunaldrall29/markov`) match `git remote` and `docs/MAP.md`.

---

## 2026-08-26 — mobile layout

- Goal: make Float and Docusaurus usable on a phone.
- Done: Float nav/receipts wrap at 760px; 44px tap targets; docs tables scroll; viewport meta.
- Not done: markovhq.com (out of this repo).
- Commands: `bun test` · `bun run dev`
- Next: keep shipping in this tree.

---

## 2026-08-26 — Docusaurus protocol docs

- Goal: replace the homemade HTML docs host with a free docs framework in this repo.
- Done: Docusaurus 3 in `apps/site` on `:3001`; same IA as before; Mintlify hosting deferred (needs an account).
- Not done: Mintlify dashboard / `.mintlify.app` deploy.
- Commands: `bun run --filter @markov/site dev` · `bun run --filter @markov/site build`
- Next: keep shipping in this tree.

---

## 2026-08-26 — six products in this repo

- Goal: stop deferring to MarkovFyi remotes; build program, SDK, Float, agents, bot, and docs here.
- Done: `apps/site` docs IA from SPEC/gates; per-app READMEs; operator README + `docs/soft-gates.md`; `bun run dev` starts docs `:3001`; Float nav Docs link.
- Not done: Helius, Telegram token, public-devnet faucet.
- Commands: `bun install` · `bun test` · `bun run demo` · `bun run dev`
- Next: keep shipping in this tree.

---

## 2026-08-24 — documentation pack (now + S0)

- Goal: land the documentation map and every **now** doc from live code; do not write S2–S9 docs.
- Done:
  - `docs/MAP.md` — six-product map onto this monorepo
  - `programs/mandate/README.md` — protocol README (engine live; program scaffold)
  - `SPEC.md` — accounts, instructions, gates, BlockReason, from `packages/engine`
  - `SECURITY.md` — three-key model, emergency-powers principle, disclosure
  - `packages/sdk/SKILL.md` — operator skill against `MarkovClient`
  - `llms.txt` — machine summary; unverified markov.fyi URLs not claimed live
  - `CLAUDE.md`, this log
  - Negative tests: `TokenNotAllowed`; unpause owner-only
- Not done: Anchor `programs/mandate/src/lib.rs`, devnet deploy, `@markovfyi/operator`, explorer links
- Commands: `bun install` · `bun test` · `bun run demo` · `bun run dev`
- Next: S2 gates.md from engine.gate table if you want it split out; otherwise mandate program port
