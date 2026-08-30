# MVP status audit

Fail closed. Local engine / `data/ledger.json` never counts. Run:

```bash
bun scripts/mvp-status-audit.ts
```

A check is **OK**, **FAIL**, or **DEFERRED**. **GO** requires zero `FAIL`. Every `DEFERRED` row prints under **Deferred by decision — reactivates when:** with decision ID, owner, and trigger. Deferred is never printed as OK.

Unevaluable hosted/chain gates (RPC 429 after retries, missing health) are **FAIL**.

Checks:

1. Hosted Float `https://float.markovhq.com/` HTTP 200.
2. Canonical receipts page `https://float.markovhq.com/receipts` HTTP 200 (D-11). In-repo copy has no marketing-site receipts path.
3. Hosted data-api health `chainReady: true` (canonical `https://api.markovhq.com/health`, else Railway alias).
4. `GET /v1/receipts` non-empty; `by_reason` has 11 keys.
5. Independent chain query: confirm each of the 11 FACTS refusal signatures still parses as that BlockReason on the mandate program (retry on RPC 429; unevaluable → FAIL).
6. Three distinct house operator pubkeys from `data/house-operators.json` each have ≥1 on-chain action (FACTS tick signatures, else `getSignaturesForAddress`).
7. Grant application file is a pointer, not a FAIL — **DEFERRED D-08** (never reactivates; the pack lives outside this repo).
8. Org / licence / six-repo layout — **DEFERRED D-09** until grant acceptance.
9. Contact email `hello@markovhq.net` — **OK** via **D-10** (`F-EMAIL-DOMAIN` closed).
10. Domain split in FACTS: `F-DOMAIN-FLOAT` and `F-DOMAIN-RECEIPTS` Closed; `F-DOMAIN-SUBDOMAINS` recorded **Open** (owner Kunal, not a code task); parent `F-CANONICAL-DOMAIN` Closed. `F-X402-SETTLE-MINT` is deferred-M2.
