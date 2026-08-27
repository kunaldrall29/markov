# Agents (`apps/agents`)

House operators: `markov-steady`, `markov-momentum`, `markov-redteam`. They tick through `apps/api` execute (same receipts as anyone else). They do not call venue programs with an operator key. Aliases `dca`/`dip`/`yield` still map to momentum/steady.

```bash
bun run --filter @markov/agents start momentum mdt_0001
bun run --filter @markov/agents start steady mdt_0001 --over-cap
```

Long-running health: `PORT=8791 bun apps/agents/src/index.ts`. Optional `CADENCE_MS` + `MANDATE_ADDRESS` loop. `AGENT_NAME=steady|momentum|redteam`.

x402 quotes: `apps/data-api`.
