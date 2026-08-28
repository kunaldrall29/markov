export const PROGRAMS = {
  demoSwap: "demo_swap",
  demoYield: "demo_yield",
} as const;

export const TOKENS = {
  usdcd: "USDC-d",
  demo: "DEMO",
} as const;

export type ProgramId = (typeof PROGRAMS)[keyof typeof PROGRAMS];
export type TokenId = (typeof TOKENS)[keyof typeof TOKENS];

export type MandateState = "Active" | "Paused" | "Revoked";

export const BLOCK_REASONS = [
  "Paused",
  "Revoked",
  "Expired",
  "Unauthorized",
  "ProgramNotAllowed",
  "TokenNotAllowed",
  "OverTxCap",
  "OverDailyCap",
  "OverSpendCap",
  "OverSpendDailyCap",
  "SlippageExceeded",
] as const;

export type BlockReason = (typeof BLOCK_REASONS)[number];

export type ActionKind = "swap" | "deposit" | "withdraw_venue" | "spend";

export interface Policy {
  programAllowlist: string[];
  tokenAllowlist: string[];
  perTxCap: number;
  dailyCap: number;
  spendPerCallCap: number;
  spendDailyCap: number;
  maxSlippageBps: number;
}

export interface Mandate {
  id: string;
  owner: string;
  operator: string;
  emergencyKey: string | null;
  policy: Policy;
  state: MandateState;
  createdTs: number;
  expiresTs: number;
  dayStamp: number;
  spentToday: number;
  spendToday: number;
  nonce: number;
  vault: Record<string, number>;
  yieldShares: number;
  /** sha256 hex of published PolicyTemplate v0, or null. */
  strategyId: string | null;
  /** Live Solana mandate, when this HUD row was confirmed on-chain. */
  chain?: { seed: string; pubkey: string } | null;
}

export interface OperatorProfile {
  authority: string;
  name: string;
  uri: string;
  feeBps: number;
  kind: "agent" | "human";
  blurb: string;
}

export interface SwapIntent {
  kind: "swap";
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  minOut: number;
}

export interface DepositIntent {
  kind: "deposit";
  token: string;
  amount: number;
}

export interface WithdrawVenueIntent {
  kind: "withdraw_venue";
  token: string;
  shares: number;
}

export interface SpendIntent {
  kind: "spend";
  amount: number;
  recipient: string;
  nonce: string;
  memo: string;
}

export type Intent = SwapIntent | DepositIntent | WithdrawVenueIntent | SpendIntent;

export type Receipt =
  | {
      type: "MandateCreated";
      ts: number;
      mandateId: string;
      owner: string;
      operator: string;
      sig?: string;
      explorerUrl?: string;
    }
  | {
      type: "MandateFunded";
      ts: number;
      mandateId: string;
      token: string;
      amount: number;
      sig?: string;
      explorerUrl?: string;
    }
  | {
      type: "PolicyAmended";
      ts: number;
      mandateId: string;
    }
  | {
      type: "ActionExecuted";
      ts: number;
      mandateId: string;
      operator: string;
      kind: ActionKind;
      venue: string;
      tokenIn: string;
      tokenOut: string;
      amountIn: number;
      amountOut: number;
      nonce: number;
      strategyId?: string | null;
      sig?: string;
      explorerUrl?: string;
    }
  | {
      type: "ActionRefused";
      ts: number;
      mandateId: string;
      operator: string;
      kind: ActionKind;
      requestedAmount: number;
      reason: BlockReason;
      nonce: number;
      strategyId?: string | null;
      sig?: string;
      explorerUrl?: string;
    }
  | {
      type: "Paused";
      ts: number;
      mandateId: string;
      by: string;
      sig?: string;
      explorerUrl?: string;
    }
  | {
      type: "Unpaused";
      ts: number;
      mandateId: string;
      by: string;
      sig?: string;
      explorerUrl?: string;
    }
  | {
      type: "Revoked";
      ts: number;
      mandateId: string;
      by: string;
      sig?: string;
      explorerUrl?: string;
    }
  | {
      type: "OwnerWithdrew";
      ts: number;
      mandateId: string;
      token: string;
      amount: number;
      sig?: string;
      explorerUrl?: string;
    };

export interface SwapPool {
  rateNum: number;
  rateDen: number;
  feeBps: number;
}

export interface YieldPool {
  shareValue: number;
}

export interface EngineSnapshot {
  operators: OperatorProfile[];
  mandates: Mandate[];
  receipts: Receipt[];
  swap: SwapPool;
  yield: YieldPool;
  nextMandateSeq: number;
}

export const DEFAULT_SWAP: SwapPool = { rateNum: 10, rateDen: 1, feeBps: 30 };
export const DEFAULT_YIELD: YieldPool = { shareValue: 1_000_000 };

export function utcDayStamp(ts: number): number {
  return Math.floor(ts / 86_400);
}

export function formatUnits(amount: number, decimals = 6): string {
  const neg = amount < 0;
  const abs = Math.abs(amount);
  const whole = Math.floor(abs / 10 ** decimals);
  const frac = String(abs % 10 ** decimals).padStart(decimals, "0").replace(/0+$/, "");
  const body = frac ? `${whole}.${frac}` : String(whole);
  return neg ? `-${body}` : body;
}
