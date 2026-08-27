import { describe, expect, test } from "bun:test";
import {
  BLOCK_REASONS,
  MandateEngine,
  PROGRAMS,
  TOKENS,
  conservativePolicy,
  type Policy,
} from "../src";

class FakeClock {
  constructor(public t: number) {}
  now() {
    return this.t;
  }
}

function engine(t = 1_700_000_000) {
  const clock = new FakeClock(t);
  const e = new MandateEngine({ clock });
  e.registerOperator({
    authority: "op_dca",
    name: "DCA agent",
    uri: "https://markovhq.com/operators/dca",
    feeBps: 50,
    kind: "agent",
    blurb: "Buys DEMO on a cadence, under cap.",
  });
  return { e, clock };
}

function funded(policy?: Partial<Policy>) {
  const { e, clock } = engine();
  const m = e.createMandate({
    owner: "owner",
    operator: "op_dca",
    emergencyKey: "bot",
    policy: { ...conservativePolicy(), ...policy },
    ttlSecs: 7 * 86_400,
  });
  e.fund(m.id, "owner", TOKENS.usdcd, 500_000_000);
  return { e, clock, id: m.id };
}

describe("mandate lifecycle", () => {
  test("owner funds, operator swaps, owner withdraws", () => {
    const { e, id } = funded();
    const swap = e.execute(id, "op_dca", {
      kind: "swap",
      tokenIn: TOKENS.usdcd,
      tokenOut: TOKENS.demo,
      amountIn: 10_000_000,
      minOut: 1,
    });
    expect(swap.type).toBe("ActionExecuted");
    if (swap.type === "ActionExecuted") {
      expect(swap.amountOut).toBeGreaterThan(0);
      expect(swap.venue).toBe(PROGRAMS.demoSwap);
    }
    const m = e.mandates.get(id)!;
    expect(m.vault[TOKENS.demo]).toBeGreaterThan(0);
    const w = e.ownerWithdraw(id, "owner", TOKENS.usdcd, 1_000_000);
    expect(w.type).toBe("OwnerWithdrew");
  });

  test("strategy_id copies onto action and refusal receipts", () => {
    const { e } = engine();
    const m = e.createMandate({
      owner: "owner",
      operator: "op_dca",
      policy: conservativePolicy(),
      ttlSecs: 86_400,
      strategyId: "ab".repeat(32),
    });
    e.fund(m.id, "owner", TOKENS.usdcd, 500_000_000);
    const ok = e.execute(m.id, "op_dca", {
      kind: "swap",
      tokenIn: TOKENS.usdcd,
      tokenOut: TOKENS.demo,
      amountIn: 1_000_000,
      minOut: 1,
    });
    expect(ok.type).toBe("ActionExecuted");
    if (ok.type === "ActionExecuted") expect(ok.strategyId).toBe("ab".repeat(32));
    const over = e.execute(m.id, "op_dca", {
      kind: "swap",
      tokenIn: TOKENS.usdcd,
      tokenOut: TOKENS.demo,
      amountIn: 400_000_000,
      minOut: 1,
    });
    expect(over.type).toBe("ActionRefused");
    if (over.type === "ActionRefused") expect(over.strategyId).toBe("ab".repeat(32));
  });

  test("emergency key may pause and revoke, but not fund or trade", () => {
    const { e, id } = funded();
    expect(() => e.fund(id, "bot", TOKENS.usdcd, 1)).toThrow();
    const pause = e.pause(id, "bot");
    expect(pause.type).toBe("Paused");
    const refused = e.execute(id, "op_dca", {
      kind: "swap",
      tokenIn: TOKENS.usdcd,
      tokenOut: TOKENS.demo,
      amountIn: 1_000_000,
      minOut: 1,
    });
    expect(refused.type).toBe("ActionRefused");
    if (refused.type === "ActionRefused") expect(refused.reason).toBe("Paused");
    e.unpause(id, "owner");
    const rev = e.revoke(id, "bot");
    expect(rev.type).toBe("Revoked");
    const after = e.execute(id, "op_dca", {
      kind: "swap",
      tokenIn: TOKENS.usdcd,
      tokenOut: TOKENS.demo,
      amountIn: 1_000_000,
      minOut: 1,
    });
    expect(after.type).toBe("ActionRefused");
    if (after.type === "ActionRefused") expect(after.reason).toBe("Revoked");
    const still = e.ownerWithdraw(id, "owner", TOKENS.usdcd, 1_000_000);
    expect(still.type).toBe("OwnerWithdrew");
  });
});

describe("gates fail closed and emit refusal receipts", () => {
  test("over per-tx cap", () => {
    const { e, id } = funded({ perTxCap: 5_000_000 });
    const r = e.execute(id, "op_dca", {
      kind: "swap",
      tokenIn: TOKENS.usdcd,
      tokenOut: TOKENS.demo,
      amountIn: 6_000_000,
      minOut: 1,
    });
    expect(r.type).toBe("ActionRefused");
    if (r.type === "ActionRefused") expect(r.reason).toBe("OverTxCap");
    expect(e.mandates.get(id)!.spentToday).toBe(0);
    expect(e.mandates.get(id)!.vault[TOKENS.usdcd]).toBe(500_000_000);
  });

  test("over daily cap", () => {
    const { e, id } = funded({ perTxCap: 40_000_000, dailyCap: 50_000_000 });
    const ok = e.execute(id, "op_dca", {
      kind: "swap",
      tokenIn: TOKENS.usdcd,
      tokenOut: TOKENS.demo,
      amountIn: 40_000_000,
      minOut: 1,
    });
    expect(ok.type).toBe("ActionExecuted");
    const r = e.execute(id, "op_dca", {
      kind: "swap",
      tokenIn: TOKENS.usdcd,
      tokenOut: TOKENS.demo,
      amountIn: 20_000_000,
      minOut: 1,
    });
    expect(r.type).toBe("ActionRefused");
    if (r.type === "ActionRefused") expect(r.reason).toBe("OverDailyCap");
  });

  test("program and token allowlists", () => {
    const { e, id } = funded({
      programAllowlist: [PROGRAMS.demoYield, "x402"],
      tokenAllowlist: [TOKENS.usdcd],
    });
    const p = e.execute(id, "op_dca", {
      kind: "swap",
      tokenIn: TOKENS.usdcd,
      tokenOut: TOKENS.demo,
      amountIn: 1_000_000,
      minOut: 1,
    });
    expect(p.type).toBe("ActionRefused");
    if (p.type === "ActionRefused") expect(p.reason).toBe("ProgramNotAllowed");
  });

  test("token allowlist", () => {
    const { e, id } = funded({
      programAllowlist: [PROGRAMS.demoSwap, "x402"],
      tokenAllowlist: [TOKENS.usdcd],
    });
    const r = e.execute(id, "op_dca", {
      kind: "swap",
      tokenIn: TOKENS.usdcd,
      tokenOut: TOKENS.demo,
      amountIn: 1_000_000,
      minOut: 1,
    });
    expect(r.type).toBe("ActionRefused");
    if (r.type === "ActionRefused") expect(r.reason).toBe("TokenNotAllowed");
  });

  test("unpause is owner-only", () => {
    const { e, id } = funded();
    e.pause(id, "bot");
    expect(() => e.unpause(id, "bot")).toThrow("only owner can unpause");
    const u = e.unpause(id, "owner");
    expect(u.type).toBe("Unpaused");
  });

  test("unauthorized operator", () => {
    const { e, id } = funded();
    const r = e.execute(id, "stranger", {
      kind: "swap",
      tokenIn: TOKENS.usdcd,
      tokenOut: TOKENS.demo,
      amountIn: 1_000_000,
      minOut: 1,
    });
    expect(r.type).toBe("ActionRefused");
    if (r.type === "ActionRefused") expect(r.reason).toBe("Unauthorized");
  });

  test("expired mandate", () => {
    const { e, clock, id } = funded();
    clock.t += 7 * 86_400 + 1;
    const r = e.execute(id, "op_dca", {
      kind: "swap",
      tokenIn: TOKENS.usdcd,
      tokenOut: TOKENS.demo,
      amountIn: 1_000_000,
      minOut: 1,
    });
    expect(r.type).toBe("ActionRefused");
    if (r.type === "ActionRefused") expect(r.reason).toBe("Expired");
  });

  test("spend caps are separate from trade caps", () => {
    const { e, id } = funded({ spendPerCallCap: 50_000, spendDailyCap: 80_000 });
    const over = e.execute(id, "op_dca", {
      kind: "spend",
      amount: 60_000,
      recipient: "data_api",
      nonce: "n1",
      memo: "price",
    });
    expect(over.type).toBe("ActionRefused");
    if (over.type === "ActionRefused") expect(over.reason).toBe("OverSpendCap");
    const a = e.execute(id, "op_dca", {
      kind: "spend",
      amount: 50_000,
      recipient: "data_api",
      nonce: "n2",
      memo: "price",
    });
    expect(a.type).toBe("ActionExecuted");
    const b = e.execute(id, "op_dca", {
      kind: "spend",
      amount: 50_000,
      recipient: "data_api",
      nonce: "n3",
      memo: "price",
    });
    expect(b.type).toBe("ActionRefused");
    if (b.type === "ActionRefused") expect(b.reason).toBe("OverSpendDailyCap");
  });

  test("slippage bound", () => {
    const { e, id } = funded();
    const r = e.execute(id, "op_dca", {
      kind: "swap",
      tokenIn: TOKENS.usdcd,
      tokenOut: TOKENS.demo,
      amountIn: 1_000_000,
      minOut: 99_000_000,
    });
    expect(r.type).toBe("ActionRefused");
    if (r.type === "ActionRefused") expect(r.reason).toBe("SlippageExceeded");
  });

  test("UTC day bucket rolls spentToday", () => {
    const { e, clock, id } = funded({ dailyCap: 15_000_000, perTxCap: 10_000_000 });
    const a = e.execute(id, "op_dca", {
      kind: "swap",
      tokenIn: TOKENS.usdcd,
      tokenOut: TOKENS.demo,
      amountIn: 10_000_000,
      minOut: 1,
    });
    expect(a.type).toBe("ActionExecuted");
    clock.t += 86_400;
    const b = e.execute(id, "op_dca", {
      kind: "swap",
      tokenIn: TOKENS.usdcd,
      tokenOut: TOKENS.demo,
      amountIn: 10_000_000,
      minOut: 1,
    });
    expect(b.type).toBe("ActionExecuted");
    expect(e.mandates.get(id)!.spentToday).toBe(10_000_000);
  });
});

describe("venues", () => {
  test("yield deposit and withdraw accrue shares", () => {
    const { e, id } = funded();
    const d = e.execute(id, "op_dca", {
      kind: "deposit",
      token: TOKENS.usdcd,
      amount: 20_000_000,
    });
    expect(d.type).toBe("ActionExecuted");
    const shares = e.mandates.get(id)!.yieldShares;
    expect(shares).toBeGreaterThan(0);
    e.yield.shareValue = 1_100_000;
    const w = e.execute(id, "op_dca", {
      kind: "withdraw_venue",
      token: TOKENS.usdcd,
      shares,
    });
    expect(w.type).toBe("ActionExecuted");
    if (w.type === "ActionExecuted") expect(w.amountOut).toBeGreaterThan(20_000_000);
  });
});

describe("BlockReason enum", () => {
  test("exposes eleven reasons", () => {
    expect(BLOCK_REASONS).toHaveLength(11);
  });
});
