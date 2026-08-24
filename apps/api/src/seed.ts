import {
  PROGRAMS,
  TOKENS,
  conservativePolicy,
  type MandateEngine,
  type OperatorProfile,
} from "@markov/engine";

export const ACTORS = {
  owner: "owner_demo",
  emergency: "bot_emergency",
  dca: "op_dca",
  dip: "op_dip",
  yield: "op_yield",
} as const;

export const OPERATORS: OperatorProfile[] = [
  {
    authority: ACTORS.dca,
    name: "DCA",
    uri: "markov://operators/dca",
    feeBps: 80,
    kind: "agent",
    blurb: "Pays for a quote over x402, then buys DEMO on a cadence under cap. First-party. Same mandate, same receipts as anyone else.",
  },
  {
    authority: ACTORS.dip,
    name: "Dip buyer",
    uri: "markov://operators/dip",
    feeBps: 120,
    kind: "agent",
    blurb: "Buys DEMO when the quote prints below a reference. First-party. Refusals are part of its record.",
  },
  {
    authority: ACTORS.yield,
    name: "Yield rotation",
    uri: "markov://operators/yield",
    feeBps: 90,
    kind: "agent",
    blurb: "Parks USDC-d in the allowlisted demo yield venue. Conservative seed operator on the public SDK.",
  },
];

export function seed(engine: MandateEngine) {
  if (engine.operators.size === 0) {
    for (const op of OPERATORS) engine.registerOperator(op);
  }
}

export const DEMO_POLICY = {
  ...conservativePolicy(),
  programAllowlist: [PROGRAMS.demoSwap, PROGRAMS.demoYield, "x402"],
  tokenAllowlist: [TOKENS.usdcd, TOKENS.demo],
  perTxCap: 25_000_000,
  dailyCap: 100_000_000,
  spendPerCallCap: 100_000,
  spendDailyCap: 400_000,
  maxSlippageBps: 80,
};
