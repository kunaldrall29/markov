import { describe, expect, test } from "bun:test";
import { handleCommand } from "../src/index";

describe("bot authority surface", () => {
  test("help does not expose trade commands", async () => {
    const text = await handleCommand("/help");
    expect(text).toContain("pause");
    expect(text).toContain("revoke");
    expect(text).not.toContain("/withdraw");
    expect(text).not.toContain("/swap");
  });
});
