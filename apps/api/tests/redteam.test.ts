import { MandateEngine } from "@markov/engine";
import { describe, expect, test } from "bun:test";
import { exerciseAllBlockReasons } from "../src/redteam";
import { seed } from "../src/seed";

const ALL = [
  "Paused",
  "Revoked",
  "Expired",
  "Unauthorized",
  "ProgramNotAllowed",
  "TokenNotAllowed",
  "OverTxCap",
  "OverDailyCap",
  "OverSpendCap",
  "OverSpendDailyCap",
  "SlippageExceeded",
] as const;

describe("redteam sweep", () => {
  test("emits every BlockReason at least once", () => {
    const engine = new MandateEngine();
    seed(engine);
    const out = exerciseAllBlockReasons(engine);
    for (const reason of ALL) {
      expect(out.reasons).toContain(reason);
    }
    const refused = engine.receipts.filter((r) => r.type === "ActionRefused");
    for (const reason of ALL) {
      expect(refused.some((r) => r.type === "ActionRefused" && r.reason === reason)).toBe(true);
    }
  });
});
