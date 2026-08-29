import { afterEach, expect, test } from "bun:test";
import {
  EMPTY_BODY_HASH,
  FALLBACK_RPC,
  assertMainnetAllowed,
  authorizeMutation,
  engineDemoAllowed,
  isLoopbackHost,
  isProductOrigin,
  listenHost,
  markovCluster,
  publicRpcUrl,
  rpcHost,
  rpcUrl,
  sha256Hex,
} from "../src/index";

const KEYS = [
  "SOLANA_RPC_URL",
  "HOST",
  "MARKOV_CLUSTER",
  "MARKOV_MAINNET",
  "NEXT_PUBLIC_SOLANA_CLUSTER",
  "ENGINE_DEMO",
  "NEXT_PUBLIC_ENGINE_DEMO",
  "NEXT_PUBLIC_SOLANA_RPC_URL",
] as const;
const saved: Record<string, string | undefined> = {};
for (const k of KEYS) saved[k] = process.env[k];

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

test("fallback rpc is public devnet", () => {
  expect(FALLBACK_RPC).toBe("https://api.devnet.solana.com");
});

test("blank env uses fallback", () => {
  delete process.env.SOLANA_RPC_URL;
  expect(rpcUrl()).toBe(FALLBACK_RPC);
});

test("rpcHost never echoes a key-in-url", () => {
  process.env.SOLANA_RPC_URL = "https://abc.helius-rpc.com/?api-key=super-secret";
  expect(rpcHost()).toBe("abc.helius-rpc.com");
  expect(rpcHost()).not.toContain("api-key");
});

test("listenHost defaults to loopback", () => {
  delete process.env.HOST;
  expect(listenHost()).toBe("127.0.0.1");
  expect(isLoopbackHost()).toBe(true);
  process.env.HOST = "0.0.0.0";
  expect(listenHost()).toBe("0.0.0.0");
  expect(isLoopbackHost()).toBe(false);
});

test("cluster helpers default to devnet and gate mainnet", () => {
  delete process.env.MARKOV_CLUSTER;
  delete process.env.NEXT_PUBLIC_SOLANA_CLUSTER;
  expect(markovCluster()).toBe("devnet");
  process.env.MARKOV_CLUSTER = "mainnet-beta";
  delete process.env.MARKOV_MAINNET;
  expect(() => assertMainnetAllowed()).toThrow(/MARKOV_MAINNET=1/);
  process.env.MARKOV_MAINNET = "1";
  expect(() => assertMainnetAllowed()).not.toThrow();
  expect(engineDemoAllowed()).toBe(false);
  delete process.env.SOLANA_RPC_URL;
  delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  expect(publicRpcUrl("devnet")).toBe("https://api.devnet.solana.com");
});

test("authorizeMutation binds method path body and cluster", async () => {
  expect(await sha256Hex(new Uint8Array())).toBe(EMPTY_BODY_HASH);
  expect(authorizeMutation("post", "/mandates/mdt_1/withdraw", EMPTY_BODY_HASH, "Pk", "1", "devnet")).toBe(
    `Float POST /mandates/mdt_1/withdraw ${EMPTY_BODY_HASH} Pk at 1 on devnet`,
  );
});

test("publicRpcUrl never forwards an api-key", () => {
  process.env.SOLANA_RPC_URL = "https://abc.helius-rpc.com/?api-key=super-secret";
  delete process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  expect(publicRpcUrl("devnet")).toBe("https://api.devnet.solana.com");
  expect(publicRpcUrl("devnet")).not.toContain("api-key");
});

test("isProductOrigin allows markovhq.com and localhost", () => {
  expect(isProductOrigin("https://float.markovhq.com")).toBe(true);
  expect(isProductOrigin("https://docs.markovhq.com")).toBe(true);
  expect(isProductOrigin("http://localhost:3001")).toBe(true);
  expect(isProductOrigin("https://evil.example")).toBe(false);
});
