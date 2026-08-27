import { TOKENS, type MandateEngine, type Receipt } from "@markov/engine";
import { createMandateFromTemplate, MOMENTUM_TEMPLATE } from "@markov/sdk";
import { tickMomentum } from "./agents";
import { ACTORS, DEMO_POLICY } from "./seed";

export function runFourBeat(engine: MandateEngine): {
  mandateId: string;
  beats: { name: string; receipts: Receipt[] }[];
} {
  const from = createMandateFromTemplate(MOMENTUM_TEMPLATE, {
    caps: { per_tx: DEMO_POLICY.perTxCap, daily: DEMO_POLICY.dailyCap },
  });
  const mandate = engine.createMandate({
    owner: ACTORS.owner,
    operator: from.operator,
    emergencyKey: ACTORS.emergency,
    policy: from.policy,
    ttlSecs: from.ttlSecs,
    strategyId: from.strategyId,
  });
  const funded = engine.fund(mandate.id, ACTORS.owner, TOKENS.usdcd, 80_000_000);
  const beat1 = { name: "fund", receipts: [funded] };

  const beat2receipts = tickMomentum(engine, mandate.id, false);
  const beat2 = { name: "agent-under-policy", receipts: beat2receipts };

  const beat3receipts = tickMomentum(engine, mandate.id, true);
  const beat3 = { name: "over-cap-refused", receipts: beat3receipts };

  const revoked = engine.revoke(mandate.id, ACTORS.emergency);
  const after = engine.execute(mandate.id, ACTORS.momentum, {
    kind: "swap",
    tokenIn: TOKENS.usdcd,
    tokenOut: TOKENS.demo,
    amountIn: 1_000_000,
    minOut: 1,
  });
  const beat4 = { name: "revoke-mid-flight", receipts: [revoked, after] };

  const left = engine.mandate(mandate.id).vault[TOKENS.usdcd] ?? 0;
  const withdrew = left > 0 ? engine.ownerWithdraw(mandate.id, ACTORS.owner, TOKENS.usdcd, left) : revoked;
  const beat5 = { name: "owner-withdraw", receipts: left > 0 ? [withdrew] : [] };

  return { mandateId: mandate.id, beats: [beat1, beat2, beat3, beat4, beat5] };
}
