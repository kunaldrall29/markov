import { describe, expect, test } from "bun:test";
import { parseMandateLogs, strategyIdHex, eventNameCanonical, refusedReason } from "../src/events";

const OVER_TX_CAP_LOGS = [
  "Program 5o8EAwdHyQ31Nmt6tUDm1y6PNDt5STmVvA6CX3E6WJPm invoke [1]",
  "Program log: Instruction: ExecuteSwap",
  "Program log: ActionRefused OverTxCap",
  "Program data: W2YD8o2Lhrh15g4L9th8nRtm5sn8gfAXyj9YVdY53ArX1XsybDR3HImBWR/4zbNyPOuLZvQ+EpesNPt9E/zKFZ+46gNl9pf+AIDDyQEAAAAAAAQAAAAAAAAAAA==",
  "Program 5o8EAwdHyQ31Nmt6tUDm1y6PNDt5STmVvA6CX3E6WJPm consumed 15795 of 200000 compute units",
  "Program 5o8EAwdHyQ31Nmt6tUDm1y6PNDt5STmVvA6CX3E6WJPm success",
];

describe("mandate event parse", () => {
  test("strategyIdHex encodes 32 bytes and drops None/zero", () => {
    expect(strategyIdHex(null)).toBeNull();
    expect(strategyIdHex(Buffer.alloc(32, 0))).toBeNull();
    expect(strategyIdHex(Buffer.alloc(32, 7))).toBe("07".repeat(32));
    expect(strategyIdHex("ab".repeat(32))).toBe("ab".repeat(32));
  });

  test("parses ActionRefused OverTxCap from live devnet logs", () => {
    const events = parseMandateLogs(OVER_TX_CAP_LOGS);
    const refused = events.find((e) => eventNameCanonical(e.name) === "ActionRefused");
    expect(refused).toBeTruthy();
    expect(refusedReason(refused!.data)).toBe("OverTxCap");
    // This historical tx predates strategy_id on the mandate; hex is null, not a crash.
    expect(strategyIdHex(refused!.data.strategyId ?? refused!.data.strategy_id)).toBeNull();
  });
});
