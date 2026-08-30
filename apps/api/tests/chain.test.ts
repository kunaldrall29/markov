import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DEMO_POLICY } from "../src/seed";
import { buildSubscribe, chainHealth, chainReady, emergencyPubkey, houseOperatorPubkey, isWalletPubkey } from "../src/chain";
import { loadKeypair } from "@markovfyi/operator";

const ROOT = join(import.meta.dir, "../../..");

describe("on-chain float path", () => {
  test("demo actors are not wallets", () => {
    expect(isWalletPubkey("owner_demo")).toBe(false);
    expect(isWalletPubkey("bot_emergency")).toBe(false);
  });

  test("three distinct house operator pubkeys are committed", () => {
    const map = JSON.parse(readFileSync(join(ROOT, "data/house-operators.json"), "utf8")) as Record<string, string>;
    const keys = ["markov-steady", "markov-momentum", "markov-redteam"].map((k) => map[k]);
    expect(keys.every(Boolean)).toBe(true);
    expect(new Set(keys).size).toBe(3);
    expect(houseOperatorPubkey("markov-momentum").toBase58()).toBe(map["markov-momentum"]);
    expect(emergencyPubkey().toBase58()).toBe(map.emergency);
  });

  test("buildSubscribe returns an unsigned tx when keys exist", async () => {
    if (!chainReady() && !(await chainHealth()).rpcOk) return;
    if (!existsSync(join(ROOT, "keys/owner.json"))) return;
    const owner = loadKeypair(join(ROOT, "keys/owner.json"));
    const out = await buildSubscribe(owner.publicKey.toBase58(), {
      operator: "markov-momentum",
      strategyId: null,
      ttlSecs: 30 * 24 * 3600,
      fundAmount: 1_000_000,
      policy: DEMO_POLICY,
    });
    expect(out.mode).toBe("chain");
    expect(out.tx.length).toBeGreaterThan(80);
    expect(out.intent.action).toBe("subscribe");
    expect(out.seed).toBeTruthy();
  });
});
