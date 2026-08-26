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
