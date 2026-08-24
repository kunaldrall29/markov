# @markov/sdk

HTTP client for the local Markov API (`apps/api`). Not a signing SDK yet.

```ts
import { MarkovClient } from "@markov/sdk";

const client = new MarkovClient("http://127.0.0.1:8787", "op_dca");
const receipt = await client.execute(mandateId, {
  kind: "swap",
  tokenIn: "USDC-d",
  tokenOut: "DEMO",
  amountIn: 1_000_000,
  minOut: 1,
});
if (receipt.type === "ActionRefused") {
  // policy held — receipt.reason is a BlockReason
}
```

Operator rules: [`SKILL.md`](./SKILL.md). Semantics: [`../../SPEC.md`](../../SPEC.md).

The ~20-line guarded-action quickstart and `@markovfyi/operator` land at S4 from that code. Until then this README is the HTTP client only.
