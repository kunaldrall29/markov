# Agents (`apps/agents`)

First-party operators: DCA, dip, yield. They tick through `apps/api` execute (same receipts as anyone else). They do not call venue programs with an operator key.

```bash
bun run --filter @markov/agents start dca mdt_0001
bun run --filter @markov/agents start dca mdt_0001 --over-cap
```

Long-running health: `PORT=8791 bun apps/agents/src/index.ts`. Optional `CADENCE_MS` + `MANDATE_ADDRESS` loop.

x402 quotes: `apps/data-api`.
