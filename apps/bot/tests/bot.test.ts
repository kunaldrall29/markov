import { describe, expect, test } from "bun:test";
import { canMutate, allowedChatIds } from "../src/allow";
import { deepLink, handleCommand } from "../src/commands";

describe("bot authority surface", () => {
  test("help lists /strategies and stays revoke-only", async () => {
    const text = await handleCommand("/help");
    expect(text).toContain("pause");
    expect(text).toContain("revoke");
    expect(text).toContain("/whoami");
    expect(text).toContain("/strategies");
    expect(text).not.toContain("/withdraw");
    expect(text).not.toContain("/swap");
  });

  test("/strategies lists public refusal counts", async () => {
    const prev = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          {
            name: "Momentum-Demo",
            slug: "momentum",
            template: { operator: "markov-momentum" },
            stats: { actions: 2, refusals: 1 },
          },
        ]),
        { status: 200 },
      )) as unknown as typeof fetch;
    try {
      const text = await handleCommand("/strategies");
      expect(text).toContain("Momentum-Demo");
      expect(text).toContain("refusals 1");
    } finally {
      globalThis.fetch = prev;
    }
  });

  test("status without id explains the shape", async () => {
    expect(await handleCommand("/status")).toBe("Mandate id required. /status <mandateId>");
    expect(await handleCommand("/link")).toBe("Mandate id required. /link <mandateId>");
  });

  test("deep link uses TELEGRAM_BOT_USERNAME", () => {
    const prev = process.env.TELEGRAM_BOT_USERNAME;
    process.env.TELEGRAM_BOT_USERNAME = "@markovfloat_bot";
    expect(deepLink("mdt_0001")).toBe("https://t.me/markovfloat_bot?start=mdt_0001");
    if (prev === undefined) delete process.env.TELEGRAM_BOT_USERNAME;
    else process.env.TELEGRAM_BOT_USERNAME = prev;
  });

  test("unknown telegram chat cannot pause or revoke", async () => {
    const prev = process.env.TELEGRAM_ALLOWED_CHAT_IDS;
    const first = process.env.TELEGRAM_ALLOW_FIRST_CHAT;
    process.env.TELEGRAM_ALLOWED_CHAT_IDS = "111";
    delete process.env.TELEGRAM_ALLOW_FIRST_CHAT;
    const denied = await handleCommand("/revoke mdt_0001", 999);
    expect(denied).toContain("not allowed");
    expect(await handleCommand("/whoami", 999)).toBe("chat id 999");
    if (prev === undefined) delete process.env.TELEGRAM_ALLOWED_CHAT_IDS;
    else process.env.TELEGRAM_ALLOWED_CHAT_IDS = prev;
    if (first === undefined) delete process.env.TELEGRAM_ALLOW_FIRST_CHAT;
    else process.env.TELEGRAM_ALLOW_FIRST_CHAT = first;
  });
});

describe("telegram allowlist", () => {
  test("CLI with no chat id can mutate", () => {
    expect(canMutate()).toBe(true);
  });

  test("empty allowlist denies telegram until configured", () => {
    const prev = process.env.TELEGRAM_ALLOWED_CHAT_IDS;
    const first = process.env.TELEGRAM_ALLOW_FIRST_CHAT;
    const file = process.env.TELEGRAM_ALLOW_FILE;
    process.env.TELEGRAM_ALLOW_FILE = "/tmp/markov-telegram-allow-empty-test.json";
    delete process.env.TELEGRAM_ALLOWED_CHAT_IDS;
    delete process.env.TELEGRAM_ALLOW_FIRST_CHAT;
    expect(allowedChatIds()).toEqual([]);
    expect(canMutate(42)).toBe(false);
    if (prev === undefined) delete process.env.TELEGRAM_ALLOWED_CHAT_IDS;
    else process.env.TELEGRAM_ALLOWED_CHAT_IDS = prev;
    if (first === undefined) delete process.env.TELEGRAM_ALLOW_FIRST_CHAT;
    else process.env.TELEGRAM_ALLOW_FIRST_CHAT = first;
    if (file === undefined) delete process.env.TELEGRAM_ALLOW_FILE;
    else process.env.TELEGRAM_ALLOW_FILE = file;
  });
});
