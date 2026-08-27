import { MandateEngine } from "@markov/engine";
import { describe, expect, test } from "bun:test";
import { seed } from "../src/seed";
import { runStrategyVaultDemo } from "../src/strategy-vault";

describe("strategy-vault demo", () => {
  test("A and B execute, C refuses OverTxCap on the same strategy_id", () => {
    const engine = new MandateEngine();
    seed(engine);
    const result = runStrategyVaultDemo(engine);
    expect(result.mandates).toHaveLength(3);
    expect(new Set(result.mandates.map((m) => m.id)).size).toBe(3);
    expect(result.mandates[2]?.perTxCap).toBe(40_000_000);
    expect(result.mandates[0]?.perTxCap).toBe(100_000_000);

    const kinds = result.fanOut.map((row) => row.receipt.type);
    expect(kinds).toEqual(["ActionExecuted", "ActionExecuted", "ActionRefused"]);
    const refusal = result.fanOut[2]?.receipt;
    expect(refusal?.type).toBe("ActionRefused");
    if (refusal?.type === "ActionRefused") {
      expect(refusal.reason).toBe("OverTxCap");
      expect(refusal.strategyId).toBe(result.strategyId);
    }
    const ok = result.fanOut[0]?.receipt;
    if (ok?.type === "ActionExecuted") expect(ok.strategyId).toBe(result.strategyId);

    const a = engine.mandate(result.mandates[0]!.id);
    const b = engine.mandate(result.mandates[1]!.id);
    const c = engine.mandate(result.mandates[2]!.id);
    expect(a.owner).toBe("owner_a");
    expect(b.owner).toBe("owner_b");
    expect(c.owner).toBe("owner_c");
    expect(a.vault["USDC-d"]).toBe(140_000_000);
    expect(c.vault["USDC-d"]).toBe(200_000_000);
  });
});
