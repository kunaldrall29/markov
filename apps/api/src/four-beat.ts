import { TOKENS, type MandateEngine, type Receipt } from "@markov/engine";
import { ACTORS, DEMO_POLICY } from "./seed";
import { tickDca } from "./agents";

export function runFourBeat(engine: MandateEngine): {
  mandateId: string;
  beats: { name: string; receipts: Receipt[] }[];
} {
  const mandate = engine.createMandate({
    owner: ACTORS.owner,
    operator: ACTORS.dca,
    emergencyKey: ACTORS.emergency,
    policy: DEMO_POLICY,
    ttlSecs: 30 * 24 * 3600,
  });
  const funded = engine.fund(mandate.id, ACTORS.owner, TOKENS.usdcd, 80_000_000);
  const beat1 = { name: "fund", receipts: [funded] };

  const beat2receipts = tickDca(engine, mandate.id, false);
  const beat2 = { name: "agent-under-policy", receipts: beat2receipts };

  const beat3receipts = tickDca(engine, mandate.id, true);
  const beat3 = { name: "over-cap-refused", receipts: beat3receipts };

  const revoked = engine.revoke(mandate.id, ACTORS.emergency);
  const after = engine.execute(mandate.id, ACTORS.dca, {
    kind: "swap",
    tokenIn: TOKENS.usdcd,
    tokenOut: TOKENS.demo,
    amountIn: 1_000_000,
    minOut: 1,
  });
  const beat4 = { name: "revoke-mid-flight", receipts: [revoked, after] };

  return { mandateId: mandate.id, beats: [beat1, beat2, beat3, beat4] };
}
