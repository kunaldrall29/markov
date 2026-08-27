import { isLoopbackHost, markovCluster } from "@markov/rpc";
import {
  consumeNonce,
  header,
  verifyWalletAuth,
  type HeaderSource,
  type MutationCtx,
} from "./wallet-auth";

export type { HeaderSource, MutationCtx };

/** True when a reverse proxy is in front of us. Bind address is not a client identity. */
export function behindProxy(c: HeaderSource): boolean {
  return Boolean(header(c, "x-forwarded-for") || header(c, "x-real-ip") || header(c, "forwarded"));
}

function apiKeyOk(c: HeaderSource): boolean {
  const secret = process.env.MARKOV_API_SECRET?.trim();
  if (!secret) return false;
  const got = header(c, "x-api-key") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

function walletHeadersPresent(c: HeaderSource): boolean {
  return Boolean(header(c, "x-owner-sig") || header(c, "x-owner-ts"));
}

/**
 * Mutations: wallet signature, shared secret, or loopback demo.
 * Public/proxied binds without a wallet or secret fail closed.
 * A present but invalid wallet proof does not fall through to owner_demo.
 */
export function mutationAllowed(c: HeaderSource, ctx?: MutationCtx): boolean {
  if (walletHeadersPresent(c)) {
    if (!ctx) return false;
    const wallet = verifyWalletAuth(c, ctx);
    if (!wallet.ok) return false;
    const sig = header(c, "x-owner-sig");
    if (!sig) return false;
    return consumeNonce(sig);
  }
  if (apiKeyOk(c)) return true;
  const secret = process.env.MARKOV_API_SECRET?.trim();
  if (secret) return false;
  if (behindProxy(c)) return false;
  if (markovCluster() === "mainnet-beta") return false;
  return isLoopbackHost();
}

export function apiKeyHeaders(): Record<string, string> {
  const secret = process.env.MARKOV_API_SECRET?.trim();
  return secret ? { "x-api-key": secret } : {};
}

export function requestActor(c: HeaderSource, ctx?: MutationCtx, fallback = "owner_demo"): string | null {
  if (walletHeadersPresent(c)) {
    if (!ctx) return null;
    const wallet = verifyWalletAuth(c, ctx);
    return wallet.ok ? wallet.pubkey : null;
  }
  const claimed = header(c, "x-actor")?.trim();
  if (apiKeyOk(c) && claimed) return claimed;
  if (markovCluster() === "mainnet-beta") return null;
  if (isLoopbackHost() && !behindProxy(c)) return claimed || fallback;
  return null;
}
