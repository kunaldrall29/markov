import { describe, expect, test } from "bun:test";
import { deepLink, handleCommand } from "../src/commands";

describe("bot authority surface", () => {
  test("help does not expose trade commands", async () => {
    const text = await handleCommand("/help");
    expect(text).toContain("pause");
    expect(text).toContain("revoke");
    expect(text).not.toContain("/withdraw");
    expect(text).not.toContain("/swap");
  });

  test("deep link uses TELEGRAM_BOT_USERNAME", () => {
    const prev = process.env.TELEGRAM_BOT_USERNAME;
    process.env.TELEGRAM_BOT_USERNAME = "@markovfloat_bot";
    expect(deepLink("mdt_0001")).toBe("https://t.me/markovfloat_bot?start=mdt_0001");
    if (prev === undefined) delete process.env.TELEGRAM_BOT_USERNAME;
    else process.env.TELEGRAM_BOT_USERNAME = prev;
  });
});
