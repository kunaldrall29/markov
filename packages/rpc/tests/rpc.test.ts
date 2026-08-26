import { expect, test } from "bun:test";
import { FALLBACK_RPC, rpcUrl } from "../src/index";

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
