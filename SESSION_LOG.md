# Session log

Handoff file. Newest entry at the top. Facts, not narrative.

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
