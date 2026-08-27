import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import nacl from "tweetnacl";
import bs58 from "bs58";
import {
  EMPTY_BODY_HASH,
  authorizeMutation,
  markovCluster,
  sha256Hex,
  type MarkovCluster,
} from "@markov/rpc";
import { mutationAllowed, requestActor } from "../src/auth";
import { consumeNonce, resetNonces, verifyWalletAuth, type MutationCtx } from "../src/wallet-auth";

const KEYS = ["MARKOV_API_SECRET", "HOST", "MARKOV_CLUSTER", "MARKOV_MAINNET"] as const;
let saved: Record<string, string | undefined> = {};

function pair() {
  const kp = nacl.sign.keyPair();
  return { kp, pubkey: bs58.encode(kp.publicKey) };
}

function ctx(path = "/mandates", method = "POST", bodyHash = EMPTY_BODY_HASH): MutationCtx {
  return { method, path, bodyHash };
}

function signedHeaders(
  kp: nacl.SignKeyPair,
  pubkey: string,
  extra?: Partial<{ ts: string; path: string; bodyHash: string; cluster: MarkovCluster }>,
) {
  const ts = extra?.ts ?? String(Math.floor(Date.now() / 1000));
  const path = extra?.path ?? "/mandates";
  const bodyHash = extra?.bodyHash ?? EMPTY_BODY_HASH;
  const cluster = extra?.cluster ?? "devnet";
  const msg = authorizeMutation("POST", path, bodyHash, pubkey, ts, cluster);
  const sig = bs58.encode(nacl.sign.detached(new TextEncoder().encode(msg), kp.secretKey));
  const headers: Record<string, string> = {
    "x-actor": pubkey,
    "x-owner-ts": ts,
    "x-owner-sig": sig,
  };
  return {
    get: (n: string) => headers[n] ?? null,
    headers,
    ctx: ctx(path, "POST", bodyHash),
  };
}

beforeEach(() => {
  saved = {};
  for (const k of KEYS) saved[k] = process.env[k];
  delete process.env.MARKOV_API_SECRET;
  delete process.env.HOST;
  delete process.env.MARKOV_MAINNET;
  process.env.MARKOV_CLUSTER = "devnet";
  resetNonces();
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  resetNonces();
});

describe("wallet owner proof", () => {
  test("empty body hash is SHA-256 of zero bytes", async () => {
    expect(await sha256Hex(new Uint8Array())).toBe(EMPTY_BODY_HASH);
  });

  test("valid ed25519 proof is accepted", () => {
    const { kp, pubkey } = pair();
    const signed = signedHeaders(kp, pubkey);
    const out = verifyWalletAuth(signed, signed.ctx, "devnet");
    expect(out).toEqual({ ok: true, pubkey });
    expect(mutationAllowed(signed, signed.ctx)).toBe(true);
    expect(requestActor(signed, signed.ctx)).toBe(pubkey);
  });

  test("expired timestamp is rejected", () => {
    const { kp, pubkey } = pair();
    const signed = signedHeaders(kp, pubkey, { ts: String(Math.floor(Date.now() / 1000) - 400) });
    const out = verifyWalletAuth(signed, signed.ctx, "devnet");
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toBe("owner signature expired");
    expect(mutationAllowed(signed, signed.ctx)).toBe(false);
  });

  test("wrong pubkey is rejected", () => {
    const a = pair();
    const b = pair();
    const signed = signedHeaders(a.kp, a.pubkey);
    const swapped = {
      get: (n: string) => (n === "x-actor" ? b.pubkey : signed.get(n)),
    };
    const out = verifyWalletAuth(swapped, signed.ctx, "devnet");
    expect(out.ok).toBe(false);
    expect(mutationAllowed(swapped, signed.ctx)).toBe(false);
  });

  test("path mismatch is rejected", () => {
    const { kp, pubkey } = pair();
    const signed = signedHeaders(kp, pubkey, { path: "/mandates" });
    const out = verifyWalletAuth(signed, ctx("/mandates/x/withdraw"), "devnet");
    expect(out.ok).toBe(false);
  });

  test("replayed signature is rejected", () => {
    const { kp, pubkey } = pair();
    const signed = signedHeaders(kp, pubkey);
    expect(mutationAllowed(signed, signed.ctx)).toBe(true);
    expect(mutationAllowed(signed, signed.ctx)).toBe(false);
    expect(consumeNonce(signed.headers["x-owner-sig"] ?? "")).toBe(false);
  });

  test("invalid wallet proof does not fall through to owner_demo", () => {
    const headers = {
      get: (n: string) =>
        n === "x-actor" ? "owner_demo" : n === "x-owner-sig" ? "not-a-sig" : n === "x-owner-ts" ? "1" : null,
    };
    expect(mutationAllowed(headers, ctx())).toBe(false);
    expect(requestActor(headers, ctx())).toBeNull();
  });
});

describe("api mutation gate", () => {
  test("loopback without secret allows local demo", () => {
    expect(markovCluster()).toBe("devnet");
    expect(mutationAllowed({ get: () => null })).toBe(true);
    expect(requestActor({ get: () => null })).toBe("owner_demo");
  });

  test("proxy headers fail closed without a secret", () => {
    const headers = { get: (n: string) => (n === "x-forwarded-for" ? "1.2.3.4" : null) };
    expect(mutationAllowed(headers)).toBe(false);
    expect(requestActor(headers)).toBeNull();
  });

  test("matching x-api-key is required when secret is set", () => {
    process.env.MARKOV_API_SECRET = "test-secret";
    expect(mutationAllowed({ get: (n: string) => (n === "x-api-key" ? "nope" : null) })).toBe(false);
    expect(mutationAllowed({ get: (n: string) => (n === "x-api-key" ? "test-secret" : null) })).toBe(true);
    expect(
      requestActor({
        get: (n: string) => (n === "x-api-key" ? "test-secret" : n === "x-actor" ? "bot_emergency" : null),
      }),
    ).toBe("bot_emergency");
  });

  test("public bind without secret denies mutations", () => {
    process.env.HOST = "0.0.0.0";
    expect(mutationAllowed({ get: () => null })).toBe(false);
    expect(requestActor({ get: () => null })).toBeNull();
  });

  test("mainnet unsigned fails closed even on loopback", () => {
    process.env.MARKOV_CLUSTER = "mainnet-beta";
    expect(mutationAllowed({ get: () => null })).toBe(false);
    expect(requestActor({ get: () => null })).toBeNull();
  });

  test("wallet proof is accepted on a public bind", () => {
    process.env.HOST = "0.0.0.0";
    const { kp, pubkey } = pair();
    const signed = signedHeaders(kp, pubkey);
    expect(mutationAllowed(signed, signed.ctx)).toBe(true);
    expect(requestActor(signed, signed.ctx)).toBe(pubkey);
  });
});
