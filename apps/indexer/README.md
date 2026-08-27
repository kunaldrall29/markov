# Indexer (`apps/indexer`)

Receipt index. Local sqlite (`data/indexer.sqlite`). Same SQL in `migrations/` for a later Postgres URL.

```bash
bun run --filter @markov/indexer dev
```

http://127.0.0.1:8790/health  
`POST /sync` pulls strategies, mandates, and receipts from `API_URL`.  
`GET /receipts?mandateId=`  
`GET /strategy_stats` · `GET /operator_stats`
