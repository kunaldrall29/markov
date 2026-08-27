import { TOKENS, type MandateEngine, type Receipt } from "@markov/engine";
import { fetchPrice } from "./data";

export function tickMomentum(engine: MandateEngine, mandateId: string, overCap = false): Receipt[] {
  const m = engine.mandate(mandateId);
  const receipts: Receipt[] = [];
  const quote = fetchPrice(engine, mandateId, m.operator);
  receipts.push(quote.paid);
  if (quote.paid.type === "ActionRefused") return receipts;
  const amountIn = overCap ? m.policy.perTxCap + 5_000_000 : 8_000_000;
  receipts.push(
    engine.execute(mandateId, m.operator, {
      kind: "swap",
      tokenIn: TOKENS.usdcd,
      tokenOut: TOKENS.demo,
      amountIn,
      minOut: 1,
    }),
  );
  return receipts;
}

export function tickSteady(engine: MandateEngine, mandateId: string, overCap = false): Receipt[] {
  const m = engine.mandate(mandateId);
  const amount = overCap ? m.policy.perTxCap + 5_000_000 : 10_000_000;
  return [
    engine.execute(mandateId, m.operator, {
      kind: "deposit",
      token: TOKENS.usdcd,
      amount,
    }),
  ];
}

export const tickDca = tickMomentum;
export const tickDip = tickMomentum;
export const tickYield = tickSteady;

export function fanOut(
  engine: MandateEngine,
  strategyId: string,
  tick: (engine: MandateEngine, mandateId: string, overCap?: boolean) => Receipt[],
  overCap = false,
): { mandateId: string; receipts: Receipt[] }[] {
  const out: { mandateId: string; receipts: Receipt[] }[] = [];
  for (const m of engine.mandates.values()) {
    if (m.strategyId !== strategyId) continue;
    try {
      out.push({ mandateId: m.id, receipts: tick(engine, m.id, overCap) });
    } catch (err) {
      console.warn("fan-out", m.id, err);
      out.push({ mandateId: m.id, receipts: [] });
    }
  }
  return out;
}

export function fanOutSwap(
  engine: MandateEngine,
  strategyId: string,
  amountIn: number,
): { mandateId: string; receipt: Receipt }[] {
  const out: { mandateId: string; receipt: Receipt }[] = [];
  for (const m of engine.mandates.values()) {
    if (m.strategyId !== strategyId) continue;
    try {
      const receipt = engine.execute(m.id, m.operator, {
        kind: "swap",
        tokenIn: TOKENS.usdcd,
        tokenOut: TOKENS.demo,
        amountIn,
        minOut: 1,
      });
      out.push({ mandateId: m.id, receipt });
    } catch (err) {
      console.warn("fan-out", m.id, err);
    }
  }
  return out;
}
