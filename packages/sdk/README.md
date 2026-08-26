# @markov/sdk

HTTP client for `apps/api` in this repository.

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

On-chain operators use `@markovfyi/operator` (`packages/operator`). GuardedResult: [`docs/guarded-result.md`](../../docs/guarded-result.md). Skill: [`SKILL.md`](./SKILL.md). Spec: [`../../SPEC.md`](../../SPEC.md).
