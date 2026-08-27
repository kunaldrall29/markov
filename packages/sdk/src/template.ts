import { createHash } from "node:crypto";
import { PROGRAMS, TOKENS, type Policy } from "@markov/engine";

export interface PolicyTemplate {
  template_version: "0";
  operator: string;
  venue_allowlist: string[];
  token_allowlist: string[];
  caps: { per_tx: number; daily: number };
  execution_bounds: { max_slippage_bps: number };
  x402_budget: { per_call: number; daily: number };
  fee_terms: { mgmt_bps: number; perf_bps: number };
  expiry_default_days: number;
}

export interface TemplateOverrides {
  venue_allowlist?: string[];
  token_allowlist?: string[];
  caps?: { per_tx?: number; daily?: number };
  execution_bounds?: { max_slippage_bps?: number };
  x402_budget?: { per_call?: number; daily?: number };
  expiry_default_days?: number;
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
}

export function strategyIdFromTemplate(template: PolicyTemplate): string {
  return createHash("sha256").update(canonicalJson(template)).digest("hex");
}

function subset(inner: string[], outer: string[]): boolean {
  return inner.length > 0 && inner.every((x) => outer.includes(x));
}

export function applyOverrides(template: PolicyTemplate, overrides?: TemplateOverrides): PolicyTemplate {
  if (!overrides) {
    return {
      ...template,
      venue_allowlist: [...template.venue_allowlist],
      token_allowlist: [...template.token_allowlist],
      caps: { ...template.caps },
      execution_bounds: { ...template.execution_bounds },
      x402_budget: { ...template.x402_budget },
      fee_terms: { ...template.fee_terms },
    };
  }
  const venue = overrides.venue_allowlist ?? template.venue_allowlist;
  const tokens = overrides.token_allowlist ?? template.token_allowlist;
  const perTx = overrides.caps?.per_tx ?? template.caps.per_tx;
  const daily = overrides.caps?.daily ?? template.caps.daily;
  const slip = overrides.execution_bounds?.max_slippage_bps ?? template.execution_bounds.max_slippage_bps;
  const spendCall = overrides.x402_budget?.per_call ?? template.x402_budget.per_call;
  const spendDaily = overrides.x402_budget?.daily ?? template.x402_budget.daily;
  const expiry = overrides.expiry_default_days ?? template.expiry_default_days;
  if (!subset(venue, template.venue_allowlist)) throw new Error("overrides may only subset venue allowlist");
  if (!subset(tokens, template.token_allowlist)) throw new Error("overrides may only subset token allowlist");
  if (perTx > template.caps.per_tx || perTx <= 0) throw new Error("overrides may only lower per-tx cap");
  if (daily > template.caps.daily || daily <= 0) throw new Error("overrides may only lower daily cap");
  if (slip > template.execution_bounds.max_slippage_bps || slip < 0) {
    throw new Error("overrides may only lower max slippage");
  }
  if (spendCall > template.x402_budget.per_call || spendCall < 0) throw new Error("overrides may only lower x402 per-call");
  if (spendDaily > template.x402_budget.daily || spendDaily < 0) throw new Error("overrides may only lower x402 daily");
  if (expiry > template.expiry_default_days || expiry <= 0) throw new Error("overrides may only shorten expiry");
  return {
    ...template,
    venue_allowlist: [...venue],
    token_allowlist: [...tokens],
    caps: { per_tx: perTx, daily },
    execution_bounds: { max_slippage_bps: slip },
    x402_budget: { per_call: spendCall, daily: spendDaily },
    expiry_default_days: expiry,
    fee_terms: { ...template.fee_terms },
  };
}

export function templateToPolicy(template: PolicyTemplate): Policy {
  return {
    programAllowlist: [...template.venue_allowlist],
    tokenAllowlist: [...template.token_allowlist],
    perTxCap: template.caps.per_tx,
    dailyCap: template.caps.daily,
    spendPerCallCap: template.x402_budget.per_call,
    spendDailyCap: template.x402_budget.daily,
    maxSlippageBps: template.execution_bounds.max_slippage_bps,
  };
}

export function createMandateFromTemplate(template: PolicyTemplate, overrides?: TemplateOverrides) {
  const applied = applyOverrides(template, overrides);
  return {
    operator: template.operator,
    strategyId: strategyIdFromTemplate(template),
    policy: templateToPolicy(applied),
    ttlSecs: applied.expiry_default_days * 86_400,
    applied,
  };
}

export const HOUSE = {
  steady: "markov-steady",
  momentum: "markov-momentum",
  redteam: "markov-redteam",
} as const;

export const STEADY_TEMPLATE: PolicyTemplate = {
  template_version: "0",
  operator: HOUSE.steady,
  venue_allowlist: [PROGRAMS.demoYield],
  token_allowlist: [TOKENS.usdcd],
  caps: { per_tx: 50_000_000, daily: 200_000_000 },
  execution_bounds: { max_slippage_bps: 50 },
  x402_budget: { per_call: 100_000, daily: 400_000 },
  fee_terms: { mgmt_bps: 90, perf_bps: 0 },
  expiry_default_days: 30,
};

export const MOMENTUM_TEMPLATE: PolicyTemplate = {
  template_version: "0",
  operator: HOUSE.momentum,
  venue_allowlist: [PROGRAMS.demoSwap, "x402"],
  token_allowlist: [TOKENS.usdcd, TOKENS.demo],
  caps: { per_tx: 100_000_000, daily: 500_000_000 },
  execution_bounds: { max_slippage_bps: 80 },
  x402_budget: { per_call: 100_000, daily: 400_000 },
  fee_terms: { mgmt_bps: 80, perf_bps: 0 },
  expiry_default_days: 30,
};

export const REDTEAM_TEMPLATE: PolicyTemplate = {
  template_version: "0",
  operator: HOUSE.redteam,
  venue_allowlist: [PROGRAMS.demoSwap, PROGRAMS.demoYield, "x402"],
  token_allowlist: [TOKENS.usdcd, TOKENS.demo],
  caps: { per_tx: 25_000_000, daily: 100_000_000 },
  execution_bounds: { max_slippage_bps: 50 },
  x402_budget: { per_call: 50_000, daily: 80_000 },
  fee_terms: { mgmt_bps: 0, perf_bps: 0 },
  expiry_default_days: 30,
};

export interface HouseStrategy {
  slug: string;
  name: string;
  blurb: string;
  labeled?: string;
  template: PolicyTemplate;
}

export const HOUSE_STRATEGIES: HouseStrategy[] = [
  {
    slug: "steady",
    name: "Steady-Demo",
    blurb: "Parks USDC-d in demo_yield. Conservative house operator. Same receipts as anyone else.",
    template: STEADY_TEMPLATE,
  },
  {
    slug: "momentum",
    name: "Momentum-Demo",
    blurb: "Pays for a quote over x402, then buys DEMO under cap. Caps set so a large print can refuse.",
    template: MOMENTUM_TEMPLATE,
  },
  {
    slug: "redteam",
    name: "Redteam-Demo",
    labeled: "redteam",
    blurb: "Labeled adversary. Deliberately violates policy so every BlockReason has a public receipt.",
    template: REDTEAM_TEMPLATE,
  },
];
