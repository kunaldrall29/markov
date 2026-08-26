# Indexer (`apps/indexer`)

Receipt index. Local sqlite (`data/indexer.sqlite`). Same SQL in `migrations/0001_init.sql` for a later Postgres URL.

```bash
bun run --filter @markov/indexer dev
```

http://127.0.0.1:8790/health  
`POST /sync` pulls mandates and receipts from `API_URL`.  
`GET /receipts?mandateId=`
