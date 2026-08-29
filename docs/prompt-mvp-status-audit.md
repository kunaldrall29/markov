# MVP status audit

Fail closed. Local engine / `data/ledger.json` never counts. Run:

```bash
bun scripts/mvp-status-audit.ts
```

Prints **GO** only if every check is true. Otherwise **NO-GO** and the failing rows.

Checks:

1. Hosted Float `https://float.markovhq.com/` HTTP 200.
2. Hosted data-api health `chainReady: true` (canonical `https://api.markovhq.com/health`, else Railway alias).
3. `GET /v1/receipts` non-empty; `by_reason` has 11 keys.
4. Independent chain query: confirm each of the 11 FACTS refusal signatures still parses as that BlockReason on the mandate program (retry on RPC 429; unevaluable → FAIL).
5. Three distinct house operator pubkeys from `data/house-operators.json` each have ≥1 on-chain action (FACTS tick signatures, else `getSignaturesForAddress`).
6. `docs/grant/APPLICATION.md` is not the absent stub.
7. `F-CANONICAL-DOMAIN` closed and `F-X402-SETTLE-MINT` is deferred-M2 in FACTS.
