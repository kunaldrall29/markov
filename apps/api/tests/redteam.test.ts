import { BLOCK_REASONS, MandateEngine } from "@markov/engine";
import { describe, expect, test } from "bun:test";
import { exerciseAllBlockReasons } from "../src/redteam";
import { seed } from "../src/seed";

describe("redteam sweep", () => {
  test("emits every BlockReason at least once", () => {
    const engine = new MandateEngine();
    seed(engine);
    const out = exerciseAllBlockReasons(engine);
    for (const reason of BLOCK_REASONS) {
      expect(out.reasons).toContain(reason);
    }
    const refused = engine.receipts.filter((r) => r.type === "ActionRefused");
    for (const reason of BLOCK_REASONS) {
      expect(refused.some((r) => r.type === "ActionRefused" && r.reason === reason)).toBe(true);
    }
  });
});
