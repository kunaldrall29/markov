# Security

## Status

Devnet software, pre-audit. No mainnet deployment exists. Do not use with real value. A scoped external review and audit precede any guarded mainnet launch (Phase 1); until then, every deployment is disposable.

This repository's live enforcement today is the TypeScript mandate engine (`packages/engine`). The Anchor port (`programs/mandate`) is not yet compiled or deployed. The same authority model and invariants apply to both.

## Authority model

Three keys, asymmetric by construction:

- **Owner** — the only authority that can withdraw, amend policy, unpause, or set the emergency key. `owner_withdraw` succeeds in every mandate state, including Revoked.
- **Operator** — may propose actions that pass the policy gate stack: allowlisted venues, allowlisted tokens, capped sizes, budgeted spend. There is no code path from operator authority to withdrawal or to a non-allowlisted program.
- **Emergency key** (held by the Float bot or any watcher the owner appoints) — may pause and revoke. Nothing else. It cannot unpause: restoring operator authority is not a protective action, so a fully compromised emergency key can only over-protect.

## The emergency-powers principle

Every administrative or emergency capability in the system is strictly protective of owners: it may restrict operator authority; it may never delay, gate, or restrict an owner's withdrawal. Any proposed mechanism that violates this principle is rejected regardless of what it protects against.

## Enforcement invariants

1. Vault funds move only via allowlisted-venue CPI or to the owner.
2. Policy checks fail closed; a refused action emits `ActionRefused` (engine: `ActionRefused`) and mutates no spend counters.
3. Every execute/spend path emits exactly one receipt event — action or refusal.
4. A stolen operator key inherits exactly the operator's bounded authority until revoked; owner custody is unaffected.

The full threat model (rug, rogue execution, spam, wash-delegation, abandonment, venue failure, protocol failure) is in the litepaper, section 10.

## Reporting a vulnerability

Email **security@markov.fyi** with a description, reproduction steps, and impact. Please do not open public issues for security reports. We acknowledge within 72 hours and coordinate disclosure timing with you; no formal bounty program exists yet — this file will be updated when one does. Good-faith research against local and devnet deployments is welcome.
