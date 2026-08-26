# data-api (`apps/data-api`)

x402 quote surface. Stubs fake liquidity, never enforcement. Unpaid GET is 402. POST spends on the mandate then returns a quote.

```bash
bun run --filter @markov/data-api dev
```

http://127.0.0.1:8788/health  
http://127.0.0.1:8788/price/DEMO → 402
