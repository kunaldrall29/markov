import { PROGRAMS, TOKENS, type MandateEngine, type OperatorProfile } from "@markov/engine";
import {
  HOUSE,
  HOUSE_STRATEGIES,
  MOMENTUM_TEMPLATE,
  strategyIdFromTemplate,
} from "@markov/sdk";

export const ACTORS = {
  owner: "owner_demo",
  emergency: "bot_emergency",
  steady: HOUSE.steady,
  momentum: HOUSE.momentum,
  redteam: HOUSE.redteam,
} as const;

export const OPERATORS: OperatorProfile[] = [
  {
    authority: HOUSE.steady,
    name: "Steady",
    uri: "markov://operators/steady",
    feeBps: 90,
    kind: "agent",
    blurb: "Parks USDC-d in demo_yield. Conservative house operator.",
  },
  {
    authority: HOUSE.momentum,
    name: "Momentum",
    uri: "markov://operators/momentum",
    feeBps: 80,
    kind: "agent",
    blurb: "Pays for a quote over x402, then buys DEMO under cap.",
  },
  {
    authority: HOUSE.redteam,
    name: "Redteam",
    uri: "markov://operators/redteam",
    feeBps: 0,
    kind: "agent",
    blurb: "Labeled adversary. Exercises every BlockReason on a schedule.",
  },
];

export function seed(engine: MandateEngine) {
  for (const op of OPERATORS) {
    if (!engine.operators.has(op.authority)) engine.registerOperator(op);
  }
}

export const DEMO_POLICY = {
  programAllowlist: [PROGRAMS.demoSwap, PROGRAMS.demoYield, "x402"],
  tokenAllowlist: [TOKENS.usdcd, TOKENS.demo],
  perTxCap: 25_000_000,
  dailyCap: 100_000_000,
  spendPerCallCap: 100_000,
  spendDailyCap: 400_000,
  maxSlippageBps: 80,
};

export function publishedStrategies() {
  return HOUSE_STRATEGIES.map((s) => ({
    ...s,
    strategyId: strategyIdFromTemplate(s.template),
  }));
}

export function strategyById(id: string) {
  return publishedStrategies().find((s) => s.strategyId === id);
}

export { MOMENTUM_TEMPLATE };
