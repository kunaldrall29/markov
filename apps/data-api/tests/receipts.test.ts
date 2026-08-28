import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createDataApi, PRICE_AMOUNT, paymentRequired } from "../src/index";
import { encodeCursor, memoryStore, sqliteStore, type PublicReceipt } from "../src/public-receipts";
import { fromEngineReceipt, insertReceipt, openDb } from "../../indexer/src/db";
import { BLOCK_REASONS } from "@markov/engine/types";

const allowed: PublicReceipt = {
  receipt_id: "2",
  ts: 200,
  mandate: "mdt_0001",
  operator: "markov-momentum",
  action_type: "swap",
  venue: "demo_swap",
  token: "USDC-d",
  amount: 8_000_000,
  result: "allowed",
  block_reason: null,
  tx_sig: "sigAllow",
};

const blocked: PublicReceipt = {
  receipt_id: "1",
  ts: 100,
  mandate: "mdt_0001",
  operator: "markov-momentum",
  action_type: "swap",
  venue: "demo_swap",
  token: "USDC-d",
  amount: 30_000_000,
  result: "blocked",
  block_reason: "OverTxCap",
  tx_sig: "sigBlock",
};

describe("x402 stub", () => {
  test("GET /price returns 402 with spend instructions", async () => {
    const app = createDataApi({ store: memoryStore([]) });
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

describe("GET /v1/receipts", () => {
  test("lists newest first with next_cursor", async () => {
    const app = createDataApi({ store: memoryStore([allowed, blocked]) });
    const res = await app.request("http://x/v1/receipts?limit=1");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { receipts: PublicReceipt[]; next_cursor: string | null };
    expect(body.receipts).toHaveLength(1);
    expect(body.receipts[0]?.result).toBe("allowed");
    expect(body.next_cursor).toBe(encodeCursor(allowed));
    const page2 = await app.request(`http://x/v1/receipts?limit=1&cursor=${body.next_cursor}`);
    const body2 = (await page2.json()) as { receipts: PublicReceipt[]; next_cursor: string | null };
    expect(body2.receipts[0]?.result).toBe("blocked");
    expect(body2.next_cursor).toBeNull();
  });

  test("result=blocked returns only refusals", async () => {
    const app = createDataApi({ store: memoryStore([allowed, blocked]) });
    const res = await app.request("http://x/v1/receipts?result=blocked");
    const body = (await res.json()) as { receipts: PublicReceipt[] };
    expect(body.receipts.every((r) => r.result === "blocked")).toBe(true);
    expect(body.receipts).toHaveLength(1);
  });

  test("reason= filter returns only that code; invalid code is 400", async () => {
    const paused: PublicReceipt = { ...blocked, receipt_id: "3", ts: 50, block_reason: "Paused" };
    const app = createDataApi({ store: memoryStore([allowed, blocked, paused]) });
    const res = await app.request("http://x/v1/receipts?reason=OverTxCap");
    const body = (await res.json()) as { receipts: PublicReceipt[] };
    expect(body.receipts).toHaveLength(1);
    expect(body.receipts[0]?.block_reason).toBe("OverTxCap");
    const bad = await app.request("http://x/v1/receipts?reason=not-a-reason");
    expect(bad.status).toBe(400);
    const err = (await bad.json()) as { error: string };
    expect(err.error).toBe("invalid reason");
  });

  test("empty list is a table payload not an error", async () => {
    const app = createDataApi({ store: memoryStore([]) });
    const res = await app.request("http://x/v1/receipts");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { receipts: unknown[]; next_cursor: null };
    expect(body.receipts).toEqual([]);
    expect(body.next_cursor).toBeNull();
  });

  test("missing store fails closed with 503", async () => {
    const app = createDataApi({ store: null });
    const res = await app.request("http://x/v1/receipts");
    expect(res.status).toBe(503);
  });

  test("stats counts allowed, blocked, and every BlockReason", async () => {
    const app = createDataApi({ store: memoryStore([allowed, blocked]) });
    const res = await app.request("http://x/v1/receipts/stats");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      total: number;
      allowed: number;
      blocked: number;
      by_reason: Record<string, number>;
    };
    expect(body.total).toBe(2);
    expect(body.allowed).toBe(1);
    expect(body.blocked).toBe(1);
    expect(body.by_reason.OverTxCap).toBe(1);
    for (const reason of BLOCK_REASONS) {
      expect(typeof body.by_reason[reason]).toBe("number");
    }
  });

  test("rate limit returns 429 with Retry-After", async () => {
    const app = createDataApi({ store: memoryStore([]), rateLimitMax: 3 });
    const headers = { "x-forwarded-for": "203.0.113.9" };
    expect((await app.request("http://x/v1/receipts", { headers })).status).toBe(200);
    expect((await app.request("http://x/v1/receipts", { headers })).status).toBe(200);
    expect((await app.request("http://x/v1/receipts", { headers })).status).toBe(200);
    const limited = await app.request("http://x/v1/receipts", { headers });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
    const body = (await limited.json()) as { error: string };
    expect(body.error).toBe("rate limit");
  });

  test("CORS allows localhost and markov.fyi, denies others", async () => {
    const app = createDataApi({ store: memoryStore([]) });
    const ok = await app.request("http://x/v1/receipts", { headers: { origin: "http://localhost:3001" } });
    expect(ok.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3001");
    const fyi = await app.request("http://x/v1/receipts", { headers: { origin: "https://markov.fyi" } });
    expect(fyi.headers.get("Access-Control-Allow-Origin")).toBe("https://markov.fyi");
    const no = await app.request("http://x/v1/receipts", { headers: { origin: "https://evil.example" } });
    expect(no.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  test("sqlite store reads only public_receipts", async () => {
    const db = openDb(":memory:");
    insertReceipt(
      db,
      fromEngineReceipt({
        type: "ActionExecuted",
        mandateId: "mdt_0001",
        operator: "markov-momentum",
        kind: "swap",
        venue: "demo_swap",
        tokenIn: "USDC-d",
        amountIn: 8_000_000,
        nonce: 1,
        ts: 20,
        sig: "onchainAllow",
      }),
    );
    insertReceipt(
      db,
      fromEngineReceipt({
        type: "ActionRefused",
        mandateId: "mdt_0001",
        operator: "markov-momentum",
        kind: "swap",
        reason: "OverTxCap",
        requestedAmount: 30_000_000,
        nonce: 2,
        ts: 21,
        sig: "onchainBlock",
      }),
    );
    const app = createDataApi({ store: sqliteStore(db) });
    const res = await app.request("http://x/v1/receipts?reason=OverTxCap");
    const body = (await res.json()) as { receipts: PublicReceipt[] };
    expect(body.receipts).toHaveLength(1);
    expect(body.receipts[0]?.tx_sig).toBe("onchainBlock");
  });

  test("handlers never join outside public_receipts", () => {
    const src = [
      readFileSync(join(import.meta.dir, "../src/public-receipts.ts"), "utf8"),
      readFileSync(join(import.meta.dir, "../src/index.ts"), "utf8"),
    ].join("\n");
    const sql = (src.match(/`[\s\S]*?`/g) ?? []).join("\n").toLowerCase();
    expect(sql).not.toContain(" join ");
    expect(sql).not.toMatch(/from\s+receipts\b/);
    expect(sql).toContain("from public_receipts");
  });
});
