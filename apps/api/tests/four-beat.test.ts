import { describe, expect, test } from "bun:test";
import { MandateEngine } from "@markov/engine";
import { runFourBeat } from "../src/four-beat";
import { seed } from "../src/seed";

describe("four-beat demo", () => {
  test("fund, act, refuse over-cap, revoke", () => {
    const engine = new MandateEngine();
    seed(engine);
    const result = runFourBeat(engine);
    const types = result.beats.flatMap((b) => b.receipts.map((r) => r.type));
    expect(types).toContain("MandateFunded");
    expect(types).toContain("ActionExecuted");
    expect(types).toContain("ActionRefused");
    expect(types).toContain("Revoked");
    const over = result.beats.find((b) => b.name === "over-cap-refused")!.receipts;
    expect(over.some((r) => r.type === "ActionRefused" && r.reason === "OverTxCap")).toBe(true);
    const last = result.beats.find((b) => b.name === "revoke-mid-flight")!.receipts;
    expect(last.some((r) => r.type === "ActionRefused" && r.reason === "Revoked")).toBe(true);
    expect(engine.mandate(result.mandateId).state).toBe("Revoked");
  });
});
