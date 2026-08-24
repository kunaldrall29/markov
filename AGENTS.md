# Markov

## Cursor Cloud specific instructions

- Marketing landing page is live at https://markovhq.com. Do not rebuild, restyle, or change it. This repo is the protocol/product workspace (mandate engine + Float), not the site repo.
- Product canon: `docs/PITCH.md`. Numbers: `docs/FACTS.md`. Semantics: `SPEC.md`. Security: `SECURITY.md`. Doc map: `docs/MAP.md`. Operator skill: `packages/sdk/SKILL.md`. Litepaper for protocol claims: v0.4.
- Runtime is Bun (`$HOME/.bun/bin` if it is not on PATH). Install with `bun install`. Do not add npm/yarn lockfiles.
- Start with `bun run dev` (API `http://127.0.0.1:8787`, Float `http://127.0.0.1:3000`). Hello path: `bun run demo` (in-process four-beat) or Float **Run four-beat demo**. Climax is a live refusal `blocked: over_cap`.
- Ledger persists to `data/ledger.json` (gitignored). Delete it to reset.
- Float prototype uses demo owner `owner_demo`. No browser wallet is required.
- Bot is pause/revoke only (`bot_emergency`). Telegram is optional via `TELEGRAM_BOT_TOKEN`. A compromised bot can only protect the owner.
- Phase 0 freeze: no copilot, launch radar, pooled mandates, score/credit, token, or landing-page work. Stub venues (`demo_swap`, `demo_yield`) are intentional. First-party agents: DCA, dip-buyer, yield rotation.
