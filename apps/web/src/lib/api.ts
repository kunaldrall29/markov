export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8787";

function errorMessage(text: string): string {
  try {
    const parsed = JSON.parse(text) as { error?: unknown };
    if (typeof parsed.error === "string" && parsed.error) return parsed.error;
  } catch {
    /* raw text */
  }
  return text;
}

export async function api<T>(path: string, init?: RequestInit, actor = "owner_demo"): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "x-actor": actor,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(errorMessage(await res.text()));
  return res.json() as Promise<T>;
}

export function formatAmount(amount: number, decimals = 6): string {
  const whole = Math.floor(Math.abs(amount) / 10 ** decimals);
  const frac = String(Math.abs(amount) % 10 ** decimals).padStart(decimals, "0").replace(/0+$/, "");
  const body = frac ? `${whole}.${frac}` : String(whole);
  return amount < 0 ? `-${body}` : body;
}

export type StrategyCard = {
  slug: string;
  name: string;
  blurb: string;
  labeled?: string;
  strategyId: string;
  template: {
    operator: string;
    venue_allowlist: string[];
    token_allowlist: string[];
    caps: { per_tx: number; daily: number };
    execution_bounds: { max_slippage_bps: number };
    x402_budget: { per_call: number; daily: number };
    expiry_default_days: number;
    fee_terms?: { mgmt_bps: number; perf_bps: number };
  };
  stats: {
    actions: number;
    refusals: number;
    refusalRate: number;
    volume: number;
    pnl?: number;
    subscribers: number;
    tenureSecs: number;
    feesBps?: number;
  };
  receipts?: Array<Record<string, unknown> & { type: string; ts: number }>;
};

export type MandateHud = {
  pnl: number;
  capProximity: { dailyPct: number; spendPct: number };
};

export type OperatorRow = {
  authority: string;
  name: string;
  blurb: string;
  kind: string;
  feeBps: number;
  stats: {
    actions: number;
    refusals: number;
    volume: number;
    pnl?: number;
    mandates: number;
    tenureSecs?: number;
  } | null;
  strategies: StrategyCard[];
};

