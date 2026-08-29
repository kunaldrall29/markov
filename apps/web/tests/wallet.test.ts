import { describe, expect, test } from "bun:test";
import { EMPTY_BODY_HASH, authorizeMutation, sha256Hex } from "@markov/rpc";
import { shortPubkey } from "../src/lib/api";
import { copy } from "../src/lib/copy";
import { floatEngineDemo } from "../src/lib/hosted";

describe("Float wallet client", () => {
  test("authorizeMutation matches the API proof string", async () => {
    expect(await sha256Hex(new Uint8Array())).toBe(EMPTY_BODY_HASH);
    expect(
      authorizeMutation("POST", "/mandates", EMPTY_BODY_HASH, "Owner1111111111111111111111111111111", "1700000000", "devnet"),
    ).toContain("Float POST /mandates");
  });

  test("shortPubkey truncates for nav", () => {
    expect(shortPubkey("owner_demo")).toBe("owner_demo");
    expect(shortPubkey("2fpQvTynG9cnCXUqsrJ8CvpJZsNykehMdSv4nkJVStGg")).toBe("2fpQ…StGg");
  });

  test("wallet copy exists", () => {
    expect(copy.wallet.connect).toBe("Connect");
    expect(copy.wallet.required).toContain("wallet");
    expect(copy.subscribe.confirmed).toContain("Solana");
    expect(copy.demo.engineNotWallet).toContain("Engine demo");
  });

  test("engine demos stay on loopback API hosts", () => {
    const prev = process.env.NEXT_PUBLIC_API_URL;
    delete process.env.VERCEL;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_VERCEL_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(floatEngineDemo()).toBe(true);
    process.env.NEXT_PUBLIC_API_URL = "https://api-production-d2e8.up.railway.app";
    expect(floatEngineDemo()).toBe(false);
    if (prev === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = prev;
  });
});
