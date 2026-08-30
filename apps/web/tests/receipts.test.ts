import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fetchJsonWithBackoff } from "../src/lib/receiptsFetch";
import { describeIntent } from "../src/lib/signPreview";

const SRC = join(import.meta.dir, "../src");

describe("public receipts feed", () => {
  test("nav links to /receipts", () => {
    const nav = readFileSync(join(SRC, "app/Nav.tsx"), "utf8");
    expect(nav).toContain('href="/receipts"');
    expect(nav).toContain("copy.nav.receipts");
  });

  test("hosted receipts API uses data-api on Vercel", () => {
    const hosted = readFileSync(join(SRC, "lib/hosted.ts"), "utf8");
    expect(hosted).toContain("publicReceiptsApiUrl");
    expect(hosted).toContain("INTERIM_DATA_API");
    expect(hosted).toContain("NEXT_PUBLIC_RECEIPTS_API_URL");
  });

  test("wallet mutations preview the intent before signTransaction", () => {
    const chain = readFileSync(join(SRC, "lib/useChain.ts"), "utf8");
    expect(chain).toContain("confirmChainIntent");
    expect(chain.indexOf("confirmChainIntent")).toBeLessThan(chain.indexOf("signTransaction(tx)"));
  });

  test("describeIntent names action, mandate, and amount", () => {
    expect(describeIntent({ action: "withdraw", mandateId: "mdt_0001", amount: 50 })).toContain("Action: withdraw");
    expect(describeIntent({ action: "withdraw", mandateId: "mdt_0001", amount: 50 })).toContain("Mandate: mdt_0001");
    expect(describeIntent({ action: "withdraw", mandateId: "mdt_0001", amount: 50 })).toContain("Amount: 50");
    expect(describeIntent({ action: "subscribe", seed: "9", fundAmount: 100, operator: "markov-steady" })).toContain(
      "seed 9",
    );
  });

  test("429 honors Retry-After and retries", async () => {
    let calls = 0;
    const waits: number[] = [];
    const res = await fetchJsonWithBackoff("https://example.invalid/v1/receipts", {
      tries: 3,
      sleep: async (ms) => {
        waits.push(ms);
      },
      fetchImpl: async () => {
        calls += 1;
        if (calls < 3) {
          return new Response("rate limit", { status: 429, headers: { "Retry-After": "2" } });
        }
        return new Response(JSON.stringify({ receipts: [{ receipt_id: "1" }] }), { status: 200 });
      },
    });
    expect(calls).toBe(3);
    expect(waits).toEqual([2000, 2000]);
    expect(res.ok).toBe(true);
    expect(res.retried).toBe(2);
    expect((res.body as { receipts: unknown[] }).receipts).toHaveLength(1);
  });
});
