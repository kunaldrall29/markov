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

function subset(inner: string[], outer: string[]): boolean {
  return inner.length > 0 && inner.every((x) => outer.includes(x));
}

/** Tighten-only. Safe to import from the browser — no node:crypto. */
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
