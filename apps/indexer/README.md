# Indexer (`apps/indexer`)

Receipt index. Local sqlite (`data/indexer.sqlite`). Railway Postgres via `DATABASE_URL`. The indexer is the **only writer** of receipts: it subscribes to mandate program logs (Helius `SOLANA_WS_URL`) and backfills from `INDEXER_FROM_SLOT`.

```bash
bun run --filter @markov/indexer dev
```

http://127.0.0.1:8790/health — `rpcOk`, `lastIndexedSlot`, `lagSlots`, `chainReady`.
View `public_receipts` is the Public Receipt Read Model (SPEC.md).
`GET /receipts?mandateId=`
`GET /strategy_stats` · `GET /operator_stats`

