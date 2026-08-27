import { expect, test } from "bun:test";
import { FALLBACK_RPC, isLoopbackHost, listenHost, rpcHost, rpcUrl } from "../src/index";

test("fallback rpc is public devnet", () => {
  expect(FALLBACK_RPC).toBe("https://api.devnet.solana.com");
});

test("blank env uses fallback", () => {
  const prev = process.env.SOLANA_RPC_URL;
  delete process.env.SOLANA_RPC_URL;
  expect(rpcUrl()).toBe(FALLBACK_RPC);
  if (prev === undefined) delete process.env.SOLANA_RPC_URL;
  else process.env.SOLANA_RPC_URL = prev;
});

test("rpcHost never echoes a key-in-url", () => {
  const prev = process.env.SOLANA_RPC_URL;
  process.env.SOLANA_RPC_URL = "https://abc.helius-rpc.com/?api-key=super-secret";
  expect(rpcHost()).toBe("abc.helius-rpc.com");
  expect(rpcHost()).not.toContain("api-key");
  if (prev === undefined) delete process.env.SOLANA_RPC_URL;
  else process.env.SOLANA_RPC_URL = prev;
});

test("listenHost defaults to loopback", () => {
  const prev = process.env.HOST;
  delete process.env.HOST;
  expect(listenHost()).toBe("127.0.0.1");
  expect(isLoopbackHost()).toBe(true);
  process.env.HOST = "0.0.0.0";
  expect(listenHost()).toBe("0.0.0.0");
  expect(isLoopbackHost()).toBe(false);
  if (prev === undefined) delete process.env.HOST;
  else process.env.HOST = prev;
});
