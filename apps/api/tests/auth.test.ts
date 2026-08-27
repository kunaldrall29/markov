import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { behindProxy, mutationAllowed } from "../src/auth";

const KEYS = ["MARKOV_API_SECRET", "HOST"] as const;
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const k of KEYS) saved[k] = process.env[k];
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("api mutation gate", () => {
  test("loopback without secret allows local demo", () => {
    delete process.env.MARKOV_API_SECRET;
    delete process.env.HOST;
    expect(mutationAllowed({ get: () => null })).toBe(true);
  });

  test("proxy headers fail closed without a secret", () => {
    delete process.env.MARKOV_API_SECRET;
    delete process.env.HOST;
    const headers = { get: (n: string) => (n === "x-forwarded-for" ? "1.2.3.4" : null) };
    expect(behindProxy(headers)).toBe(true);
    expect(mutationAllowed(headers)).toBe(false);
  });

  test("matching x-api-key is required when secret is set", () => {
    process.env.MARKOV_API_SECRET = "test-secret";
    expect(mutationAllowed({ get: (n: string) => (n === "x-api-key" ? "nope" : null) })).toBe(false);
    expect(mutationAllowed({ get: (n: string) => (n === "x-api-key" ? "test-secret" : null) })).toBe(true);
  });

  test("public bind without secret denies mutations", () => {
    delete process.env.MARKOV_API_SECRET;
    process.env.HOST = "0.0.0.0";
    expect(mutationAllowed({ get: () => null })).toBe(false);
  });
});
