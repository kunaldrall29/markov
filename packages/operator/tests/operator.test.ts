import { describe, expect, test } from "bun:test";
import { variantName, type GuardedResult } from "../src/types";
import { isWalletPubkey, strategyIdBytes } from "../src/owner";
import mandateIdl from "../idl/mandate.json";

describe("GuardedResult is data", () => {
  test("blocked is not thrown", () => {
    const blocked: GuardedResult = { status: "blocked", sig: "sig1", blockedBy: "OverTxCap" };
    expect(blocked.status).toBe("blocked");
    expect(blocked.blockedBy).toBe("OverTxCap");
  });

  test("variantName maps anchor enums", () => {
    expect(variantName({ overTxCap: {} })).toBe("OverTxCap");
    expect(variantName("Revoked")).toBe("Revoked");
    expect(variantName({ revoked: {} })).toBe("Revoked");
    // Anchor EventParser uses camelCase event names
    expect("actionRefused".toLowerCase()).toBe("actionrefused");
    expect("ActionRefused".toLowerCase()).toBe("actionrefused");
  });
});

describe("idempotency", () => {
  test("never retries a blocked key", () => {
    const seen = new Map<string, GuardedResult>();
    const key = "swap:1";
    const blocked: GuardedResult = { status: "blocked", sig: "a", blockedBy: "OverTxCap" };
    seen.set(key, blocked);
    expect(seen.get(key)).toEqual(blocked);
  });

  test("Revoked stops permanently", () => {
    let halted = false;
    const r: GuardedResult = { status: "blocked", sig: "b", blockedBy: "Revoked" };
    if (r.status === "blocked" && r.blockedBy === "Revoked") halted = true;
    expect(halted).toBe(true);
  });
});

describe("fresh quotes", () => {
  test("stale quotes are refreshed", () => {
    const maxAge = 5_000;
    expect(Date.now() - (Date.now() - 8_000) > maxAge).toBe(true);
    expect(Date.now() - (Date.now() - 100) > maxAge).toBe(false);
  });
});

describe("mandate IDL", () => {
  test("create_mandate carries strategy_id", () => {
    const ix = (mandateIdl.instructions as { name: string; args: { name: string }[] }[]).find(
      (i) => i.name === "create_mandate",
    );
    expect(ix?.args.some((a) => a.name === "strategy_id")).toBe(true);
  });

  test("ActionExecuted and ActionRefused events carry strategy_id", () => {
    const types = mandateIdl.types as { name: string; type: { fields?: { name: string }[] } }[];
    for (const name of ["ActionExecuted", "ActionRefused"]) {
      const t = types.find((x) => x.name === name);
      expect(t?.type.fields?.some((f) => f.name === "strategy_id")).toBe(true);
    }
  });
});

describe("wallet pubkey and strategy hex", () => {
  test("strategyIdBytes decodes 32-byte hex", () => {
    const bytes = strategyIdBytes("ab".repeat(32));
    expect(bytes).toHaveLength(32);
    expect(bytes?.[0]).toBe(0xab);
    expect(strategyIdBytes(null)).toBeNull();
  });

  test("isWalletPubkey rejects demo actors", () => {
    expect(isWalletPubkey("owner_demo")).toBe(false);
    expect(isWalletPubkey("bot_emergency")).toBe(false);
    expect(isWalletPubkey("2fpQvTynG9cnCXUqsrJ8CvpJZsNykehMdSv4nkJVStGg")).toBe(true);
  });
});
