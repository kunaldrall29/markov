# Security

## Status

Devnet software, pre-audit. No mainnet deployment exists. Do not use with real value. A scoped external review and audit precede any guarded mainnet launch (Phase 1); until then, every deployment is disposable.

This repository's live owner HUD is the TypeScript mandate engine (`packages/engine`). Wallet-connected Float mutations confirm on the Anchor programs under `programs/` before that HUD updates. The mandate, `demo_swap`, and `demo_yield` programs are on public Solana devnet (see `docs/FACTS.md`). Do not set `MARKOV_MAINNET=1` until an external audit lands.

## Authority model

Three keys, asymmetric by construction:

- **Owner** — the only authority that can withdraw, amend policy, unpause, or set the emergency key. `owner_withdraw` succeeds in every mandate state, including Revoked.
- **Operator** — may propose actions that pass the policy gate stack: allowlisted venues, allowlisted tokens, capped sizes, budgeted spend. There is no code path from operator authority to withdrawal or to a non-allowlisted program.
- **Emergency key** (held by the Float bot or any watcher the owner appoints) — may pause and revoke. Nothing else. It cannot unpause: restoring operator authority is not a protective action, so a fully compromised emergency key can only over-protect.

## The emergency-powers principle

Every administrative or emergency capability in the system is strictly protective of owners: it may restrict operator authority; it may never delay, gate, or restrict an owner's withdrawal. Any proposed mechanism that violates this principle is rejected regardless of what it protects against.

## Enforcement invariants

1. Vault funds move only via allowlisted-venue CPI or to the owner.
2. Policy checks fail closed; a refused action emits `ActionRefused` (engine: `ActionRefused`) and mutates no spend counters.
3. Every execute/spend path emits exactly one receipt event — action or refusal.
4. A stolen operator key inherits exactly the operator's bounded authority until revoked; owner custody is unaffected.
5. CPI into `demo_swap` / `demo_yield` must pin pool token accounts to the pool's recorded vaults. A malicious operator must not be able to substitute an arbitrary `pool_source` / `pool_dest` / `pool_vault`.

The full threat model (rug, rogue execution, spam, wash-delegation, abandonment, venue failure, protocol failure) is in the litepaper, section 10.

## HTTP, wallet, and Telegram (Phase 0)

Float mutations are owner-signed. The browser wallet (Phantom or Solflare) proves `x-actor` with `x-owner-ts` and `x-owner-sig` over:

`Float ${METHOD} ${path} ${sha256(body)} ${pubkey} at ${unix} on ${cluster}`

Skew is 300s on localnet/devnet and 60s on mainnet. Signatures are single-use inside that window. `POST /mandates` sets owner to the verified pubkey and ignores a spoofed `body.owner`.

- Local demo: bind `127.0.0.1` (default). Unsigned `x-actor` (including `owner_demo`) is allowed only on that loopback bind, and **not** when `X-Forwarded-For` / `X-Real-IP` / `Forwarded` is present.
- Any public or proxied deploy: wallet signature **or** `MARKOV_API_SECRET` as `x-api-key` (bot / operator clients). `HOST=0.0.0.0` without a wallet or secret refuses mutations. Set `MARKOV_PUBLIC=1` or a non-loopback `WEB_ORIGIN` to fail closed even when the process binds `127.0.0.1` behind a proxy that strips forwarded-client headers.
- Engine demo routes (four-beat, strategy-vault, fan-out, ticks, redteam sweep) are loopback-only and off on mainnet. They execute as the mandate operator and must not run on a shared public API.
- `MARKOV_CLUSTER=mainnet-beta` refuses unsigned mutations and will not boot unless `MARKOV_MAINNET=1` after audit. Engine demo routes (four-beat, strategy-vault, fan-out, ticks, redteam sweep) are off on mainnet.
- Telegram pause/revoke is gated by `TELEGRAM_ALLOWED_CHAT_IDS` (or `data/telegram-allow.json`). `/whoami` prints the chat id. First-chat auto-lock is opt-in (`TELEGRAM_ALLOW_FIRST_CHAT=1`) and must not be used on a public bot.
- `/health` returns `rpcHost` only — never the full RPC URL (Helius keys live in the URL). The wallet adapter connection uses a public RPC URL and will not forward a URL that contains `api-key`.

Treat a public HTTP API without wallet signatures or `MARKOV_API_SECRET` as fail-closed.

## Mainnet

No mainnet deployment exists. Do not set `MARKOV_MAINNET=1` until an external audit lands. Owner withdraw remains ungated by mandate state on-chain and in the engine. CPI into `demo_swap` / `demo_yield` must pin pool vaults. Live public-devnet bytecode may lag this source until upgrade. Wallet-connected Float does not update engine state until the Solana transaction confirms (`POST /chain/confirm`). Unsigned `owner_demo` remains loopback-only.

## Reporting a vulnerability

Email **hello@markovhq.net** with a description, reproduction steps, and impact. Please do not open public issues for security reports. We acknowledge within 72 hours and coordinate disclosure timing with you; no formal bounty program exists yet — this file will be updated when one does. Good-faith research against local and devnet deployments is welcome.
