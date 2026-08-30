# Session log

Handoff file. Newest entry at the top. Facts, not narrative.

## 2026-08-30 — D-08–D-11, Float `/receipts`, security review

- Goal: record owner decisions without deleting checks; ship the receipts feed; write a devnet security review; re-verify.
- Done: audit statuses OK/FAIL/DEFERRED. D-08 grant pointer DEFERRED never; D-09 org/licence/six-repo DEFERRED until grant acceptance; D-10 email OK; D-11 canonical `https://float.markovhq.com/receipts`. Domain split in FACTS. Float `/receipts` page (data-api, 429 backoff, badges, explorer, nav). Handoff `docs/handoff/DNS.md` + `markovhq-links.md`. `docs/audit/SECURITY-REVIEW.md`. Rust tests 20. `bun test` 130. `gitleaks` 81 commits clean. Local `/receipts` 41/20/11.
- Not done / blocked: Vercel prod deploy of `float-web` / `markov-docs` — `VERCEL_TOKEN` is `kunaldrall29` with **zero teams**, cannot write `lemmalabs`. `float.markovhq.com/receipts` still 404. data-api `chainReady` false (indexer 429). Org transfer. Telegram phone capture.
- Commands: `bun scripts/mvp-status-audit.ts` → NO-GO 13/2/4; `cargo test --manifest-path programs/mandate/Cargo.toml --features no-entrypoint`; `bun test packages apps scripts`.
- Next: Kunal deploys `npx vercel deploy --prod --yes --scope lemmalabs1` from this branch; attach docs/api/app per `docs/handoff/DNS.md`; Helius on Railway indexer.

## 2026-08-29 — hosted four-beat + bot revoke

- Goal: prove Float/Railway → devnet → public receipts; hosted emergency revoke with a chain signature; keep STATUS fail-closed.
- Done: `.dockerignore` ships `data/house-operators.json`. Hosted `POST /mandates` builds chain txs. `bun run demo:hosted` against `https://api-production-d2e8.up.railway.app`: create/fund `4KShUHkk…`, allow `y3sjiYKv…`, OverTxCap `JA4G4Bub…` (indexed). `railway run -s bot -- bun scripts/hosted-bot-revoke.ts mdt_0001` → revoke `5C1eSYTw…` then Revoked `42eduXDh…`. Three house ticks this hour. Audit confirms 11 FACTS refusal sigs on chain; prints **NO-GO** (grant stub + `F-CANONICAL-DOMAIN`). Float prod redeployed (`float.markovhq.com`); engine-demo buttons loopback-only. `EMERGENCY_KEY_JSON` SET on Railway api (stdin, not in git).
- Not done: org transfer; Vercel GitHub App; docs/api/app TLS; litepaper v0.6.1; grant application; Telegram phone capture; marketing-site receipts path 404.
- Commands: `bun run demo:hosted`; `railway run -s bot -- bun scripts/hosted-bot-revoke.ts mdt_0001`; `bun scripts/chain-sprint.ts ticks`; `bun scripts/mvp-status-audit.ts`.
- Next: DNS owner attaches docs/api/app; real grant markdown; phone `/revoke` screenshot.

## 2026-08-29 — on-chain 11 reasons + hosted feed

- Goal: C2–C4 on public devnet; redeploy Railway indexer so `/v1/receipts` is not empty.
- Done: `bun scripts/chain-sprint.ts ticks|fanout|redteam`. Three house ticks, fan-out A/B execute + C OverTxCap (same momentum `strategy_id`), all 11 BlockReasons as real sigs (FACTS table). Fast-forwarded `origin/main`. Railway indexer+api+data-api uploaded. Hosted stats `total:19` with 11 `by_reason` keys. API `/health` `chainReady:true`.
- Not done: org transfer; Vercel GitHub App; docs/api/app TLS; litepaper v0.6.1; grant application; Telegram phone capture; STATUS remains NO-GO (`F-CANONICAL-DOMAIN` open).
- Commands: `bun scripts/chain-sprint.ts ticks`; `bun scripts/chain-sprint.ts fanout`; `bun scripts/chain-sprint.ts redteam`; `curl https://data-api-production-5ac5.up.railway.app/v1/receipts/stats`.
- Next: attach canonical TLS at the DNS owner; Helius WS; `EMERGENCY_KEY_JSON` on Railway bot; grant application markdown.

## 2026-08-29 — MVP v2.2 spec + wiring

- Goal: apply v2.2 spec corrections; close hosted/devnet gaps that this agent can touch. Fail closed. Local ledger is not proof.
- Done: SPEC/MAP/MVP v2.2 Railway Postgres + chain-native indexer + docs as fourth surface + domains Decision 0 + x402 M2. Indexer no longer syncs the API ledger; backfill+WS; unique `(sig, event_index)`; replay test. API `chainReady` from RPC. CORS markovhq.com. Three house operators registered on devnet (distinct pubkeys). 11+3 Rust tests green. Favicon. Bun 1.4.0 on Vercel. Telegram loopback does not steal `getUpdates`. gitleaks git history clean. Grant pack stub. Contact `hello@markovhq.net`.
- Not done / blocked: org transfer 403; empty `main`; Vercel GitHub App; docs/api/app custom TLS (`domain_not_owned` on lemmalabs); 11 on-chain BlockReasons still 2; hosted four-beat recording; litepaper v0.6.1 on markovhq.com; grant application markdown; Helius UNSET; STATUS remains NO-GO.
- Commands: `bun test packages apps` 113 pass; `cargo test --manifest-path programs/mandate/Cargo.toml --features no-entrypoint` 15 pass; local indexer backfill 35 sigs / 15 receipts / `chainReady true` lag 1; `gitleaks detect` 68 commits no leaks; `bun scripts/mvp-status-audit.ts` expected NO-GO.
- Next: DNS at markovhq.com registrar (docs CNAME to markov-docs, api CNAME to Railway data-api, app 301); Helius on Railway indexer; redeploy api+indexer; redteam 11 reasons on chain; FF `main` once this tree is the production branch.

## 2026-08-29 — Vercel deploy as kunaldrall29


- Goal: production-deploy Float + protocol docs from `kunaldrall29/markov` using a Vercel token for user `kunaldrall29` (team `lemmalabs`). Do not git-link `kunal-drall/markov`.
- Done: CLI `whoami` = `kunaldrall29`. Created `float-web` + `markov-docs` on `lemmalabs1`. Root dirs `apps/web` / `apps/site`. Production READY: `https://float-web-three.vercel.app`, `https://markov-docs-black.vercel.app`. Hosted receipts still empty Railway feed. Token used via env only, not committed.
- Not done: `vercel git connect https://github.com/kunaldrall29/markov` still fails (GitHub App). Auto-deploy on push not enabled.
- Commands: `vercel deploy --prod --yes --scope lemmalabs1` from repo root after `vercel link --project float-web` / `markov-docs`.
- Next: install Vercel GitHub App on this `kunaldrall29` / `lemmalabs` team for git autodeploy; production branch must not be empty `main`.

## 2026-08-28 — Railway backends + Postgres

- Goal: host api, indexer, data-api, bot, agents and Postgres on Railway project `markov`. Public receipts via data-api. No secrets in git.
- Done: CLI login as kunal drall. Project `markov` + Postgres 18. dockerfilePath set on each service (CLI 5.x ignores `railway.toml`). All five `/health` 200. Hosted `GET https://data-api-production-5ac5.up.railway.app/v1/receipts` 200 empty. Indexer applies `postgres_boot.sql` on boot and reuses one SQL client. Telegram username `markov_float_bot` (`tokenSet: true`). `MARKOV_API_SECRET` SET on Railway, not committed.
- Not done: hosted API ledger is empty (`mandates:0` `receipts:0`). `programs` loaded from `data/devnet.json`; `chainReady` still false. Docs `RECEIPTS_API_URL` still local unless Vercel is updated. Local `.env` `DATABASE_URL` UNSET.
- Commands: `curl https://api-production-d2e8.up.railway.app/health`; `curl https://data-api-production-5ac5.up.railway.app/v1/receipts`; `curl https://data-api-production-5ac5.up.railway.app/v1/receipts/stats`.
- Next: set docs build `RECEIPTS_API_URL` to the hosted data-api; copy engine receipts onto hosted API if a public feed is wanted.

## 2026-08-28 — public receipts feed

- Goal: make ActionExecuted / ActionRefused publicly readable (SPEC Public Receipt Read Model) via data-api + Live receipts page. No websockets, charts, auth, or per-operator pages.
- Done: `public_receipts` view (SQLite in indexer; Postgres SQL for Supabase). `GET /v1/receipts` + `GET /v1/receipts/stats` (no auth, 60/min/IP, CORS markov.fyi + localhost). Docs nav **Live receipts** polls 5s / 15s. `bun test packages apps` 107 pass. Site build 0. Local data-api `:8788` 200. Float-agents `momentum` on `mdt_0043`: allow spend+swap, refuse `OverTxCap`. Four-beat overlay `mdt_0044` with explorer sigs (allow `3WFxpqWu…`, OverTxCap `yNgf4hfo…`). reason=OverTxCap only that code; invalid reason 400; 61st req 429 Retry-After 60. Page at 390px cards + desktop table.
- Not done / blocked: `DATABASE_URL` UNSET — cannot apply `0003_public_receipts.postgres.sql` to hosted Supabase `markov-devnet`. Railway MCP unavailable. No public `RECEIPTS_API_URL` yet (local `http://127.0.0.1:8788`).
- Commands: `PORT=0 bun apps/agents/src/index.ts momentum mdt_0043`; `PORT=0 bun apps/agents/src/index.ts momentum mdt_0043 --over-cap`; `curl -X POST http://127.0.0.1:8790/sync`; `curl http://127.0.0.1:8788/v1/receipts`; `curl -X POST http://127.0.0.1:8787/demo/four-beat`.
- Docs: `SPEC.md` Public Receipt Read Model; `BACKLOG.md`; `apps/site/docs/data-api.md`.
- Next: set `DATABASE_URL` (Supabase markov-devnet), apply postgres migration, host data-api, point `RECEIPTS_API_URL` at that URL, deploy docs.

## 2026-08-28 — wallet-signed Float path on public devnet

- Goal: subscribe / pause / revoke / withdraw from Float confirm on the live mandate program without the API holding the owner's secret.
- Done: `OwnerClient` unsigned builders; `POST /mandates` returns `mode: chain` + tx for wallet actors; `POST /chain/confirm` after sig; `POST /chain/faucet` demo USDC-d; emergency bot still signs pause/revoke on-chain when `mandate.chain` is set. Loopback `owner_demo` unchanged. `bun test packages apps` 94 pass. `bun run typecheck` 0. Live `bun scripts/float-chain-subscribe.ts`: `mdt_0038` PDA `4YQ5Xm7qxxC6UjDHPSh8F2Md5dorb8hsKbcWpfrM21X4` create `3mGrXq5vfaGU…` pause `623dpkC8G2iN…` withdraw `Nt7YSyWmDN8d…` revoke `5uBLfQ6TuaUC…` state Revoked. Float console shows on-chain link + explorer receipts.
- Not done: Phantom not installed in this VM (script used `keys/owner.json` as the owner signer). Hosting still needs Kunal. Indexer still polls the API, not Geyser.
- Next: hosting + domain/x402; `MARKOV_MAINNET=1` only after audit.

## 2026-08-28 — Telegram /whoami allowlist

- Goal: take the phone `/whoami` chat id and allow that chat to `/pause` and `/revoke`.
- Done: `TELEGRAM_ALLOWED_CHAT_IDS=8619705568` in gitignored `.env`; `data/telegram-allow.json` (gitignored). Bot restarted on `:8789`. Phone round-trip on `mdt_0037`: `/status` Active, `/pause` Paused, `/revoke` without id refused, `/revoke mdt_0037` Revoked. Ledger `Paused`/`Revoked` by `bot_emergency` (1787906462 / 1787906481). `allow.ts` resolves `TELEGRAM_ALLOW_FILE` at call time.
- Not done: hosted public Float still needs `MARKOV_API_SECRET` / `WEB_ORIGIN`. Engine UI is not yet the on-chain subscribe path.
- Next: hosting + domain/x402 decisions. `MARKOV_MAINNET=1` only after audit.

## 2026-08-28 — 10 SOL: public-devnet upgrade + venues

- Goal: use the 10 SOL Kunal sent to upgrade mandate to vault-pin / `strategy_id` bytecode and deploy demo venues on `api.devnet.solana.com`.
- Done: helpers funded 0.5 SOL each (owner, emergency, op_dca, treasury). `solana program extend` mandate +10240 (loader refuses smaller extends). Mandate upgrade tx `2baq433jFmgRW2wEHnsQHRCBtFYMCLzj1debKMWrNX4nouutR2QK8JqfpGdp3VAHVuSAnNL28dbXRtk6eC2UhBHh`. demo_swap tx `53e46CWYimVS57tvwf6kDzyBmu7XQvV1EUX8FpS98oFSxY1nRp9mCo6vqrDC1TDaD5CbnVKvLaDrMR1gB7fzj3Fy`. demo_yield tx `37gMPSBVcTGDpiBTUrXvjfqJNdCncPCmgx9CunarcqsD3XzWio6b4g9Wbx28E9B5Y4guWghiEFw6tav8My5VSdu8`. Dumps `cmp` equal to `target/deploy/*.so` (mandate pad 1696 zero bytes). Mints + pools initialized; `data/devnet.json` public RPC. Copied generated mandate IDL (event `strategy_id`). `MARKOV_SKIP_DEPLOY` / `MARKOV_SKIP_FUND` on `scripts/devnet-setup.ts`. Four-beat on public explorer: mandate `8wEAR5oSYzKrRtLki8H7E87TcHaDYbzuFT7L2cjnPnJo`; OverTxCap `3ajx6eZ67oJGGsL5TUzHvhLGrW3wBaXXng7kYxxzu7DGQmL7B3jJ1tBrDZxjGMudS6pex1yF3rD9b2rj4gtkq6cR`; Revoked `3vZt8w1yzn799rFrBW8yMNqARnV29K6TzhX7P1FN7puAQJhF7MM2wSBg9vfmSzLTpDTZTiXaAQyqHYTd7br7mwcU`; owner withdraw `342HP72T7G5Lb9hUeorot91PEigQoncuw9o7x1ThXtv3nYuMryCfDxY53cCwPKMbXbG6s64RWxvGUtUeU8AoZK8q`.
- Not done: markovhq.com unchanged. No mainnet. Do not paste failed-buffer seed phrases.
- Commands: `solana program extend 5o8EAwdHyQ31Nmt6tUDm1y6PNDt5STmVvA6CX3E6WJPm 10240 -u https://api.devnet.solana.com -k keys/deployer.json`; `solana program deploy target/deploy/{mandate,demo_swap,demo_yield}.so --program-id keys/<name>.json`; `MARKOV_RPC=https://api.devnet.solana.com MARKOV_SKIP_DEPLOY=1 MARKOV_SKIP_FUND=1 bun scripts/devnet-setup.ts`.
- Next: hosting + `MARKOV_API_SECRET` if public HTTP; `F-CANONICAL-DOMAIN` / `F-X402-SETTLE-MINT`; `MARKOV_MAINNET=1` only after audit.

## 2026-08-27 — wallet adapter, mobile, mainnet gate

- Goal: production-ready Float — mobile layout, Phantom/Solflare, signed mutations, live on public devnet, Lighthouse, program deploy, security review. No optimistic UI. Commits authored as kunaldrall29 only.
- Done: per-request owner proof (`Float METHOD path bodyHash pubkey at ts on cluster`); replay cache; mainnet unsigned fail-closed; `MARKOV_PUBLIC` / public `WEB_ORIGIN` fail-closed on loopback; engine demos loopback-only; `POST /mandates` ignores spoofed `body.owner`; Float custom Connect (no adapter purple CSS); kill rows / OG poster / safe-area; heading order h1→h2. Advanced security review: demo tick/fan-out and proxied-loopback trust tightened. Lighthouse a11y 100 marketplace + console. `anchor build` mandate.so 403424 bytes. Live curl: spoof 400, signed create, replay 401.
- Not done: public-devnet mandate upgrade blocked — 2.809 SOL + fee required, deployer 2.247 SOL, faucet 429. Venues still undeployed. markovhq.com is a different live property (link only; not in this repo). Browser wallets are not installed in this VM, so Connect shows Install Phantom / Solflare.
- Next: Kunal — ~0.57+ SOL on `2fpQvTynG9cnCXUqsrJ8CvpJZsNykehMdSv4nkJVStGg` then `solana program deploy target/deploy/mandate.so`; more SOL for venues; `TELEGRAM_ALLOWED_CHAT_IDS`; `MARKOV_MAINNET=1` only after audit.

## 2026-08-27 — Float authority-light UI

- Goal: design Float (not markovhq.com) around the refusal receipt, then implement it in `apps/web`. Tokens are the contract. No wallet adapter. No program deploy.
- Palette: base `#0a0a0b` · surface `#111318` · text `#e6eaee` · muted `#9aa3ad` · edge `#1e242c` · authority `#8ec8d8` (ice lamp, Active only) · action-ok `#9aada3` · refusal `#7c8eb0`. Type: Fraunces / IBM Plex Sans / IBM Plex Mono tabular.
- Done: `apps/web/design-tokens.json` is the only hex source. `BLOCK_REASONS` from `@markov/engine/types` drives badges. Copy in `copy.ts`. Screens: marketplace live stream, `/s/[id]`, subscribe template→caps→diff→fund, console, `/kill`, `/o/[id]` + OG 1200×630, `/bot`, `/sheet`. `GET /mandates/:id` returns `hud` (`pnl`, `capProximity`). `withdrawDisabled` ignores mandate state. Receipt arrival is the only motion (`prefers-reduced-motion` instant).
- Verified: `bun test packages apps` 62 pass (hex lint, 11 reasons, withdraw never gated by Paused/Revoked). `@markov/web` typecheck 0, build 0. API: tighten subscribe `mdt_0033`; loosen HTTP 400 `overrides may only lower per-tx cap`; OverTxCap then `Revoked`; `OwnerWithdrew` 79.98 USDC-d after revoke. UI: `/m/mdt_0034` Revoked with Withdraw enabled. OG `image/png` 1200×630.
- Not done: no browser wallet. No program deploy. Lighthouse not run. Live public-devnet bytecode still pre-`strategy_id`.
- Next: same Kunal list as MVP v2.

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
