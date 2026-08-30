export type MarkovCluster = "localnet" | "devnet" | "mainnet-beta";

/** SHA-256 of empty bytes. Client and API must hash the raw body the same way. */
export const EMPTY_BODY_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function rawCluster(): string {
  return (process.env.MARKOV_CLUSTER ?? process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet").trim();
}

export function markovCluster(): MarkovCluster {
  const raw = rawCluster();
  if (raw === "mainnet" || raw === "mainnet-beta") return "mainnet-beta";
  if (raw === "local" || raw === "localnet") return "localnet";
  return "devnet";
}

/** Mainnet is opt-in after audit. Never implied by a cluster name alone. */
export function assertMainnetAllowed(): void {
  if (markovCluster() === "mainnet-beta" && process.env.MARKOV_MAINNET !== "1") {
    throw new Error("mainnet is gated until MARKOV_MAINNET=1 after audit");
  }
}

export function engineDemoAllowed(): boolean {
  if (markovCluster() === "mainnet-beta") return false;
  if (process.env.NEXT_PUBLIC_ENGINE_DEMO === "0" || process.env.ENGINE_DEMO === "0") return false;
  return true;
}

/** Per-request owner proof. Bind method, path, and body hash so a sig cannot be replayed across routes. */
export function authorizeMutation(
  method: string,
  path: string,
  bodyHash: string,
  pubkey: string,
  ts: string,
  cluster: MarkovCluster,
): string {
  return `Float ${method.toUpperCase()} ${path} ${bodyHash} ${pubkey} at ${ts} on ${cluster}`;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = Uint8Array.from(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function explorerTxUrl(sig: string, cluster: MarkovCluster = markovCluster()): string {
  if (cluster === "mainnet-beta") return `https://solscan.io/tx/${sig}`;
  if (cluster === "localnet") return `https://solscan.io/tx/${sig}?cluster=custom`;
  return `https://solscan.io/tx/${sig}?cluster=devnet`;
}

function looksLikeMainnetRpc(url: string): boolean {
  return /mainnet/i.test(url) && !/devnet/i.test(url);
}

function looksLikeDevnetRpc(url: string): boolean {
  return /devnet/i.test(url);
}

/** Browser RPC. Never mix clusters: a devnet UI must not hit a mainnet endpoint. */
export function publicRpcUrl(cluster: MarkovCluster = markovCluster()): string {
  const fromEnv = process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() || process.env.SOLANA_RPC_URL?.trim();
  const safe = fromEnv && !fromEnv.toLowerCase().includes("api-key") ? fromEnv : "";
  if (cluster === "devnet") {
    if (safe && !looksLikeMainnetRpc(safe)) return safe;
    return "https://api.devnet.solana.com";
  }
  if (cluster === "localnet") {
    if (safe && !looksLikeMainnetRpc(safe) && !looksLikeDevnetRpc(safe)) return safe;
    return "http://127.0.0.1:8899";
  }
  if (safe && looksLikeMainnetRpc(safe)) return safe;
  return "https://api.mainnet-beta.solana.com";
}
