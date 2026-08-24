export const BLOCK_REASONS = [
  "OverTxCap",
  "OverDailyCap",
  "OverSpendCap",
  "OverSpendDailyCap",
  "ProgramNotAllowed",
  "TokenNotAllowed",
  "SlippageExceeded",
  "Expired",
  "Paused",
  "Revoked",
  "Unauthorized",
] as const;

export type BlockReason = (typeof BLOCK_REASONS)[number];

/** Blocked is data. Never throw because a mandate refused. */
export type GuardedResult =
  | { status: "executed"; sig: string; blockedBy?: undefined }
  | { status: "blocked"; sig: string; blockedBy: BlockReason }
  | { status: "failed"; error: string; sig?: string };

export type Quote = {
  mintIn: string;
  mintOut: string;
  amountIn: bigint;
  amountOut: bigint;
  atMs: number;
};

export type DevnetFacts = {
  cluster: "devnet";
  rpc: string;
  explorerTx: string;
  programs: { mandate: string; demoSwap: string; demoYield: string };
  mints: { usdcd: string; demo: string };
  pools: { swap: string; yield: string };
  vaults: { swapA: string; swapB: string; yield: string };
};

export function explorerTxUrl(sig: string, cluster = "devnet"): string {
  return `https://solscan.io/tx/${sig}?cluster=${cluster}`;
}

export function variantName(reason: unknown): BlockReason {
  if (typeof reason === "string" && (BLOCK_REASONS as readonly string[]).includes(reason)) {
    return reason as BlockReason;
  }
  if (reason && typeof reason === "object") {
    const key = Object.keys(reason as Record<string, unknown>)[0] ?? "";
    const mapped: Record<string, BlockReason> = {
      overTxCap: "OverTxCap",
      OverTxCap: "OverTxCap",
      overDailyCap: "OverDailyCap",
      OverDailyCap: "OverDailyCap",
      overSpendCap: "OverSpendCap",
      OverSpendCap: "OverSpendCap",
      overSpendDailyCap: "OverSpendDailyCap",
      OverSpendDailyCap: "OverSpendDailyCap",
      programNotAllowed: "ProgramNotAllowed",
      ProgramNotAllowed: "ProgramNotAllowed",
      tokenNotAllowed: "TokenNotAllowed",
      TokenNotAllowed: "TokenNotAllowed",
      slippageExceeded: "SlippageExceeded",
      SlippageExceeded: "SlippageExceeded",
      expired: "Expired",
      Expired: "Expired",
      paused: "Paused",
      Paused: "Paused",
      revoked: "Revoked",
      Revoked: "Revoked",
      unauthorized: "Unauthorized",
      Unauthorized: "Unauthorized",
    };
    if (mapped[key]) return mapped[key];
  }
  return "Unauthorized";
}
