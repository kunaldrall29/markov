# paidFetch

x402 data spend is a budgeted `spend` on the mandate, then a fetch.

```ts
const { pay, data } = await ops.paidFetch(
  {
    owner,
    seed,
    mint: usdcd,
    destination: merchantAta,
    amount: 20_000n,
    memo: "x402:DEMO",
    idempotencyKey: "quote-1",
  },
  url,
);
if (pay.status !== "executed") {
  // OverSpendCap / Paused / Revoked / … — skip the trade. Do not fetch blind.
  return;
}
```

Spend counts against `spendPerCallCap` / `spendDailyCap`, not notional trade caps. The on-chain venue for spend is the **mandate program id** (allowlist that pubkey), not the engine’s `"x402"` string.

If the HTTP fetch fails after spend lands, `pay` stays `executed` and `data` is null. Do not treat a settled spend as a failed mandate action.
