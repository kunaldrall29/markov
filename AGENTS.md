# Markov

## Cursor Cloud specific instructions

- Marketing landing page is live at https://markovhq.com. Do not rebuild, restyle, or change it. Protocol docs are Docusaurus in `apps/site` (`http://127.0.0.1:3001`).
- Product canon: `docs/PITCH.md`. Numbers: `docs/FACTS.md`. Semantics: `SPEC.md`. Security: `SECURITY.md`. Doc map: `docs/MAP.md`. Operator skill: `packages/sdk/SKILL.md`. Litepaper for protocol claims: v0.4.
- This repository is the six products (`programs/`, `packages/`, `apps/web`, `apps/agents`, `apps/bot`, `apps/site`). Do not split the tree. Do not wait on MarkovFyi remotes.
- Start with `bun run dev` (API `http://127.0.0.1:8787`, Float `http://127.0.0.1:3000`, docs `http://127.0.0.1:3001`). Extra services: `bun run dev:services`. Hello path: `bun run demo` or Float **Run four-beat demo** / **Run strategy-vault demo**. Climax is a live refusal (`OverTxCap` / `Revoked`).
- RPC: `SOLANA_RPC_URL` / `SOLANA_WS_URL` (Helius). Fallback constant only: `https://api.devnet.solana.com`.
- Indexer uses local sqlite (`data/indexer.sqlite`). `DATABASE_URL` is reserved for later Postgres. `SUPABASE_SERVICE_ROLE_KEY` is server-side only, never in `apps/web`.
- Ledger persists to `data/ledger.json` (gitignored). Delete it to reset.
- Float prototype uses demo owner `owner_demo`. No browser wallet is required.
- Bot is pause/revoke only (`bot_emergency`). Telegram is optional via `TELEGRAM_BOT_TOKEN`. A compromised bot can only protect the owner.
- Phase 0 freeze: no copilot, launch radar, pooled mandates, score/credit, token, or landing-page work. Stub venues (`demo_swap`, `demo_yield`) are intentional. House operators: `markov-steady`, `markov-momentum`, `markov-redteam`. Strategy cards, not operator cards.
- Refusals are **successful transactions**. Look for `ActionRefused` / `GuardedResult.status === "blocked"`, not `err`.
- Never call `demo_swap` / `demo_yield` with the operator key. Operator flow goes through `@markovfyi/operator`.
- SBF cargo is 1.79: keep `blake3` **1.5.5** in `Cargo.lock`. `anchor build` must use rustup’s cargo proxy (`/usr/local/cargo/bin/cargo`), not `rustup which cargo`.
- Devnet airdrop is flaky. `scripts/fund-devnet.ts` sprays ephemeral wallets and consolidates. Retry `bun run devnet:setup`.
- On-chain x402 allowlist entry is the **mandate program pubkey**, not the engine string `"x402"`.
- `data/devnet.json` is pubkeys only (committed). `keys/` is gitignored — never commit secrets.
- `bun run demo` is in-process engine four-beat. `bun run demo:devnet` is live Solana (RPC from `data/devnet.json`).
- Anchor `EventParser` names events in camelCase (`actionRefused`). Compare case-insensitively or refusals look like executes.
- Do not commit `data/devnet.json` with `rpc` pointing at localhost. That file is pubkeys for public devnet.
- Git: author and committer are `kunaldrall29 <kunaldrall29@gmail.com>` only. Never add `Co-authored-by`. Never credit a tool, model, or builder in commits, tags, or pull request text.
