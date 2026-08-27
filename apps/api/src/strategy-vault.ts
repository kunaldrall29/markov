import { TOKENS, type MandateEngine, type Receipt } from "@markov/engine";
import { createMandateFromTemplate, MOMENTUM_TEMPLATE } from "@markov/sdk";
import { ACTORS } from "./seed";

export function runStrategyVaultDemo(engine: MandateEngine): {
  strategyId: string;
  mandates: { id: string; owner: string; perTxCap: number }[];
  fanOut: { mandateId: string; receipt: Receipt }[];
} {
  const from = createMandateFromTemplate(MOMENTUM_TEMPLATE);
  const swap = (id: string, operator: string) =>
    engine.execute(id, operator, {
      kind: "swap",
      tokenIn: TOKENS.usdcd,
      tokenOut: TOKENS.demo,
      amountIn: 60_000_000,
      minOut: 1,
    });

  const a = engine.createMandate({
    owner: "owner_a",
    operator: from.operator,
    emergencyKey: ACTORS.emergency,
    policy: from.policy,
    ttlSecs: from.ttlSecs,
    strategyId: from.strategyId,
  });
  engine.fund(a.id, "owner_a", TOKENS.usdcd, 200_000_000);

  const b = engine.createMandate({
    owner: "owner_b",
    operator: from.operator,
    emergencyKey: ACTORS.emergency,
    policy: from.policy,
    ttlSecs: from.ttlSecs,
    strategyId: from.strategyId,
  });
  engine.fund(b.id, "owner_b", TOKENS.usdcd, 200_000_000);

  const tight = createMandateFromTemplate(MOMENTUM_TEMPLATE, { caps: { per_tx: 40_000_000 } });
  const c = engine.createMandate({
    owner: "owner_c",
    operator: tight.operator,
    emergencyKey: ACTORS.emergency,
    policy: tight.policy,
    ttlSecs: tight.ttlSecs,
    strategyId: tight.strategyId,
  });
  engine.fund(c.id, "owner_c", TOKENS.usdcd, 200_000_000);

  return {
    strategyId: from.strategyId,
    mandates: [
      { id: a.id, owner: a.owner, perTxCap: a.policy.perTxCap },
      { id: b.id, owner: b.owner, perTxCap: b.policy.perTxCap },
      { id: c.id, owner: c.owner, perTxCap: c.policy.perTxCap },
    ],
    fanOut: [
      { mandateId: a.id, receipt: swap(a.id, a.operator) },
      { mandateId: b.id, receipt: swap(b.id, b.operator) },
      { mandateId: c.id, receipt: swap(c.id, c.operator) },
    ],
  };
}
