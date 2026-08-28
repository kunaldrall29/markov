# Indexer (`apps/indexer`)

Receipt index. Local sqlite (`data/indexer.sqlite`). Same SQL in `migrations/` for a later Postgres URL.

```bash
bun run --filter @markov/indexer dev
```

http://127.0.0.1:8790/health  
`POST /sync` pulls strategies, mandates, and receipts from `API_URL`.  
View `public_receipts` is the Public Receipt Read Model (SPEC.md). Postgres: `migrations/postgres_boot.sql` (Railway or other; Supabase GRANTs are best-effort). 
`GET /receipts?mandateId=`  
`GET /strategy_stats` · `GET /operator_stats`
