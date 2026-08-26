# @markovfyi/operator

Propose a guarded action. Blocked is data.

```ts
import { OperatorClient } from "@markovfyi/operator";
import { Keypair, PublicKey } from "@solana/web3.js";

const ops = new OperatorClient({ operator: Keypair.generate() });
const quote = await ops.quoteSwap(usdcd, demo, 1_000_000n);
const result = await ops.proposeSwap({
  owner,
  seed,
  mintIn: usdcd,
  mintOut: demo,
  minOut: 1n,
  quote,
  idempotencyKey: "swap-1",
});
if (result.status === "blocked") {
  // result.blockedBy is a BlockReason. The signature is a refusal receipt.
}
```

`paidFetch` spends on the mandate first, then fetches. If spend is blocked, it does not fetch. Soft gates: [`docs/soft-gates.md`](../../docs/soft-gates.md).

There is no withdraw method on this client.
