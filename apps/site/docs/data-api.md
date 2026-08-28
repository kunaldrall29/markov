---
title: Data API
---

# Data API

`GET /price/:symbol` returns HTTP 402 with amount, memo, and recipient. It does not return a free quote.

`POST /price/:symbol` with `{ mandateId }` runs mandate `spend` (20_000 units, memo `x402:SYMBOL`) then returns the quote. A refused spend is still a receipt.

Public receipts (SPEC Public Receipt Read Model, view `public_receipts` only):

- `GET /v1/receipts` — newest first. Query: `cursor`, `limit` (default 50, max 100), `result=allowed|blocked`, `reason=<BlockReason>`. Invalid `reason` → 400. No auth. 60 req/min/IP.
- `GET /v1/receipts/stats` — `{ total, allowed, blocked, by_reason }` (10s TTL).

Live UI: [`/receipts`](/receipts). Base URL is `RECEIPTS_API_URL` (no client secrets).

Local: `http://127.0.0.1:8788` (`bun run dev:services`).

Hosted: `https://data-api-production-5ac5.up.railway.app` (Railway project `markov`). Docs `RECEIPTS_API_URL` is build-time.
