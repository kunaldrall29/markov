import { createHash } from "node:crypto";
import { PROGRAMS, TOKENS, type Policy } from "@markov/engine";
import { applyOverrides, type PolicyTemplate, type TemplateOverrides } from "./overrides";

export type { PolicyTemplate, TemplateOverrides };
export { applyOverrides };

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
