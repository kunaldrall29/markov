/** Hardcoded fallback only. Runtime RPC is process.env.SOLANA_RPC_URL (Helius). */
export const FALLBACK_RPC = "https://api.devnet.solana.com";

export function rpcUrl(): string {
  const fromEnv = process.env.SOLANA_RPC_URL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : FALLBACK_RPC;
}

export function wsUrl(): string {
  const fromEnv = process.env.SOLANA_WS_URL?.trim();
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return rpcUrl().replace("https://", "wss://").replace("http://", "ws://");
}

/** Hostname only — never return a URL that may embed an API key. */
export function rpcHost(): string {
  try {
    return new URL(rpcUrl()).host;
  } catch {
    return "invalid-rpc";
  }
}

/** Loopback unless HOST is set (Render/public bind: HOST=0.0.0.0). */
export function listenHost(): string {
  const host = process.env.HOST?.trim();
  return host && host.length > 0 ? host : "127.0.0.1";
}

export * from "./cluster";
export * from "./domains";

/** True when this process is bound to loopback (unsigned x-actor allowed). */
export function isLoopbackHost(host = listenHost()): boolean {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

