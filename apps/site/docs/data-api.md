---
title: Data API
---

# Data API

`GET /price/:symbol` returns HTTP 402 with amount, memo, and recipient. It does not return a free quote.

`POST /price/:symbol` with `{ mandateId }` runs mandate `spend` (20_000 units, memo `x402:SYMBOL`) then returns the quote. A refused spend is still a receipt.

Local: `http://127.0.0.1:8788` (`bun run dev:services`).
