import nacl from "tweetnacl";
import bs58 from "bs58";
import { authorizeMutation, markovCluster, type MarkovCluster } from "@markov/rpc";

const SKEW_DEVNET_SECS = 300;
const SKEW_MAINNET_SECS = 60;
const NONCE_TTL_MS = 310_000;
const NONCE_MAX = 10_000;

export type HeaderSource = {
  header?: (name: string) => string | undefined;
  get?: (name: string) => string | null;
};

export function header(c: HeaderSource, name: string): string | undefined {
  return c.header?.(name) ?? c.get?.(name) ?? undefined;
}

export type MutationCtx = {
  method: string;
  path: string;
  bodyHash: string;
};

export type WalletAuth =
  | { ok: true; pubkey: string }
  | { ok: false; error?: string };

const seenSigs = new Map<string, number>();

export function resetNonces(): void {
  seenSigs.clear();
}

export function consumeNonce(sig: string, now = Date.now()): boolean {
  if (seenSigs.size > NONCE_MAX) {
    for (const [key, exp] of seenSigs) {
      if (exp <= now) seenSigs.delete(key);
    }
  }
  const exp = seenSigs.get(sig);
  if (exp && exp > now) return false;
  seenSigs.set(sig, now + NONCE_TTL_MS);
  return true;
}

function bytesFromSig(sig: string): Uint8Array | null {
  try {
    return bs58.decode(sig);
  } catch {
    try {
      const buf = Buffer.from(sig, "base64");
      return buf.length ? new Uint8Array(buf) : null;
    } catch {
      return null;
    }
  }
}

function skewSecs(cluster: MarkovCluster): number {
  return cluster === "mainnet-beta" ? SKEW_MAINNET_SECS : SKEW_DEVNET_SECS;
}

export function verifyWalletAuth(
  c: HeaderSource,
  ctx: MutationCtx,
  cluster: MarkovCluster = markovCluster(),
): WalletAuth {
  const pubkey = header(c, "x-actor")?.trim();
  const ts = header(c, "x-owner-ts")?.trim();
  const sig = header(c, "x-owner-sig")?.trim();
  if (!pubkey || !ts || !sig) return { ok: false };
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(pubkey)) return { ok: false, error: "invalid owner pubkey" };
  const now = Math.floor(Date.now() / 1000);
  const t = Number(ts);
  if (!Number.isFinite(t) || Math.abs(now - t) > skewSecs(cluster)) {
    return { ok: false, error: "owner signature expired" };
  }
  let pk: Uint8Array;
  try {
    pk = bs58.decode(pubkey);
  } catch {
    return { ok: false, error: "invalid owner pubkey" };
  }
  if (pk.length !== 32) return { ok: false, error: "invalid owner pubkey" };
  const sigBytes = bytesFromSig(sig);
  if (!sigBytes || sigBytes.length !== 64) return { ok: false, error: "invalid owner signature" };
  const msg = new TextEncoder().encode(
    authorizeMutation(ctx.method, ctx.path, ctx.bodyHash, pubkey, ts, cluster),
  );
  if (!nacl.sign.detached.verify(msg, sigBytes, pk)) return { ok: false, error: "owner signature rejected" };
  return { ok: true, pubkey };
}
