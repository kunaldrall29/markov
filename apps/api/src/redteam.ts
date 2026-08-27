import { BLOCK_REASONS, PROGRAMS, TOKENS, type BlockReason, type MandateEngine, type Receipt } from "@markov/engine";
import { REDTEAM_TEMPLATE, strategyIdFromTemplate } from "@markov/sdk";
import { ACTORS } from "./seed";

const ALL: BlockReason[] = [...BLOCK_REASONS];

function swap(e: MandateEngine, id: string, operator: string, amountIn: number, minOut = 1) {
  return e.execute(id, operator, {
    kind: "swap",
    tokenIn: TOKENS.usdcd,
    tokenOut: TOKENS.demo,
    amountIn,
    minOut,
  });
}

/** Creates scratch mandates as needed so every BlockReason appears once. */
export function exerciseAllBlockReasons(engine: MandateEngine): { reasons: BlockReason[]; receipts: Receipt[] } {
  const receipts: Receipt[] = [];
  const policy = {
    programAllowlist: [PROGRAMS.demoSwap, PROGRAMS.demoYield, "x402"],
    tokenAllowlist: [TOKENS.usdcd, TOKENS.demo],
    perTxCap: 10_000_000,
    dailyCap: 12_000_000,
    spendPerCallCap: 50_000,
    spendDailyCap: 80_000,
    maxSlippageBps: 50,
  };

  const strategyId = strategyIdFromTemplate(REDTEAM_TEMPLATE);

  const live = engine.createMandate({
    owner: ACTORS.owner,
    operator: ACTORS.redteam,
    emergencyKey: ACTORS.emergency,
    policy,
    ttlSecs: 86_400,
    strategyId,
  });
  engine.fund(live.id, ACTORS.owner, TOKENS.usdcd, 80_000_000);

  engine.pause(live.id, ACTORS.emergency);
  receipts.push(swap(engine, live.id, ACTORS.redteam, 1_000_000));
  engine.unpause(live.id, ACTORS.owner);

  const revoked = engine.createMandate({
    owner: ACTORS.owner,
    operator: ACTORS.redteam,
    emergencyKey: ACTORS.emergency,
    policy,
    ttlSecs: 86_400,
    strategyId,
  });
  engine.fund(revoked.id, ACTORS.owner, TOKENS.usdcd, 10_000_000);
  engine.revoke(revoked.id, ACTORS.emergency);
  receipts.push(swap(engine, revoked.id, ACTORS.redteam, 1_000_000));

  const expired = engine.createMandate({
    owner: ACTORS.owner,
    operator: ACTORS.redteam,
    policy,
    ttlSecs: 0,
    strategyId,
  });
  engine.fund(expired.id, ACTORS.owner, TOKENS.usdcd, 10_000_000);
  receipts.push(swap(engine, expired.id, ACTORS.redteam, 1_000_000));

  receipts.push(swap(engine, live.id, "stranger", 1_000_000));

  const noSwap = engine.createMandate({
    owner: ACTORS.owner,
    operator: ACTORS.redteam,
    policy: { ...policy, programAllowlist: [PROGRAMS.demoYield, "x402"] },
    ttlSecs: 86_400,
    strategyId,
  });
  engine.fund(noSwap.id, ACTORS.owner, TOKENS.usdcd, 10_000_000);
  receipts.push(swap(engine, noSwap.id, ACTORS.redteam, 1_000_000));

  const noDemo = engine.createMandate({
    owner: ACTORS.owner,
    operator: ACTORS.redteam,
    policy: { ...policy, tokenAllowlist: [TOKENS.usdcd] },
    ttlSecs: 86_400,
    strategyId,
  });
  engine.fund(noDemo.id, ACTORS.owner, TOKENS.usdcd, 10_000_000);
  receipts.push(swap(engine, noDemo.id, ACTORS.redteam, 1_000_000));

  receipts.push(swap(engine, live.id, ACTORS.redteam, 11_000_000));
  receipts.push(swap(engine, live.id, ACTORS.redteam, 8_000_000));
  receipts.push(swap(engine, live.id, ACTORS.redteam, 8_000_000));

  receipts.push(
    engine.execute(live.id, ACTORS.redteam, {
      kind: "spend",
      amount: 60_000,
      recipient: "data_api",
      nonce: "rt1",
      memo: "redteam",
    }),
  );
  receipts.push(
    engine.execute(live.id, ACTORS.redteam, {
      kind: "spend",
      amount: 50_000,
      recipient: "data_api",
      nonce: "rt2",
      memo: "redteam",
    }),
  );
  receipts.push(
    engine.execute(live.id, ACTORS.redteam, {
      kind: "spend",
      amount: 50_000,
      recipient: "data_api",
      nonce: "rt3",
      memo: "redteam",
    }),
  );

  receipts.push(swap(engine, live.id, ACTORS.redteam, 1_000_000, 99_000_000));

  const reasons = receipts
    .filter((r): r is Extract<Receipt, { type: "ActionRefused" }> => r.type === "ActionRefused")
    .map((r) => r.reason);
  const missing = ALL.filter((x) => !reasons.includes(x));
  if (missing.length) {
    throw new Error(`redteam missed BlockReason: ${missing.join(", ")}`);
  }
  return { reasons: ALL, receipts };
}
