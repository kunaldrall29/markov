# GuardedResult

Operator actions return **data**, not thrown policy errors.

```ts
type GuardedResult =
  | { status: "executed"; sig: string }
  | { status: "blocked"; sig: string; blockedBy: BlockReason }
  | { status: "failed"; error: string; sig?: string };
```

`blocked` means the mandate program **succeeded** and emitted `ActionRefused`. The transaction is a receipt. Do not retry the same intent. Change size, route, or stop.

On `blockedBy: "Revoked"`, halt this mandate permanently. Owner withdraw still works; that is not an operator path.

Package: `@markovfyi/operator` (`OperatorClient.proposeSwap` / `proposeDeposit` / `proposeSpend`).
