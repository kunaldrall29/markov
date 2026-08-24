import { TOKENS, type MandateEngine, type Receipt } from "@markov/engine";

const BASE = 1_000_000;

export function quotedPrice(engine: MandateEngine): number {
  const { rateNum, rateDen, feeBps } = engine.swap;
  const net = 1_000_000 - Math.floor((1_000_000 * feeBps) / 10_000);
  return Math.floor((net * rateNum) / rateDen);
}

export function fetchPrice(
  engine: MandateEngine,
  mandateId: string,
  operator: string,
  symbol = "DEMO",
): { price: number; paid: Receipt } {
  const paid = engine.execute(mandateId, operator, {
    kind: "spend",
    amount: 20_000,
    recipient: "data_api",
    nonce: `q-${engine.mandate(mandateId).nonce + 1}`,
    memo: `x402:${symbol}`,
  });
  if (paid.type === "ActionRefused") {
    return { price: quotedPrice(engine), paid };
  }
  engine.swap.rateNum = BASE * (9 + ((engine.mandate(mandateId).nonce * 3) % 4)) + (engine.mandate(mandateId).nonce % 17) * 1000;
  engine.swap.rateDen = BASE;
  return { price: quotedPrice(engine), paid };
}
