# Demo venues

Written from `MandateEngine.apply` and `packages/engine/src/types.ts`. Adapter shape is the real one. Liquidity is fake. Enforcement is the mandate gate stack, never the stub.

## demo_swap (`PROGRAMS.demoSwap`)

Constant-rate pool. Default: 10 DEMO per 1 USDC-d, 30 bps fee (`DEFAULT_SWAP`). Notional for caps: if `tokenIn` is USDC-d, `amountIn`; else the USDC-d-equivalent quote.

## demo_yield (`PROGRAMS.demoYield`)

Share accounting. Default `shareValue = 1_000_000`. Deposit: `shares = amount * 1e6 / shareValue`. Withdraw: `amount = shares * shareValue / 1e6`.

## x402 (`"x402"`)

Budgeted USDC-d debit to `recipient` with `nonce` + `memo`. Counts against spend caps, not notional caps. HTTP surface: `GET /price/:symbol` on `apps/data-api` returns 402; `POST` with `mandateId` runs `spend` then returns the quote. Demo price is 20_000 units per quote.
