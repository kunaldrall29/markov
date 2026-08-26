---
title: SDK
---

# SDK

`@markov/sdk` is the HTTP client for `apps/api`. `@markovfyi/operator` signs guarded on-chain proposes and returns GuardedResult.

```ts
import { OperatorClient } from "@markovfyi/operator";

const result = await ops.proposeSwap({
  owner,
  seed,
  mintIn,
  mintOut,
  minOut,
  quote,
  idempotencyKey,
});
if (result.status === "blocked") {
  // result.blockedBy is a BlockReason. The tx is a receipt.
}
```

Quickstart in `packages/sdk/README.md` and `packages/operator/README.md`.
