import { describe, expect, test } from "bun:test";
import { createDataApi, paymentRequired, PRICE_AMOUNT } from "../src/index";

describe("x402 stub", () => {
  test("GET /price returns 402 with spend instructions", async () => {
    const app = createDataApi();
    const res = await app.request("http://x/price/DEMO");
    expect(res.status).toBe(402);
    const body = (await res.json()) as { error: string; amount: number; memo: string };
    expect(body.error).toBe("payment required");
    expect(body.amount).toBe(PRICE_AMOUNT);
    expect(body.memo).toBe("x402:DEMO");
  });

  test("paymentRequired never claims the quote is free", () => {
    const body = paymentRequired("USDC-d");
    expect(body.amount).toBeGreaterThan(0);
    expect(body.memo).toContain("x402:");
  });
});
