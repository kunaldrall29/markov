import { TOKENS, type MandateEngine, type Receipt } from "@markov/engine";
import { fetchPrice } from "./data";

export function tickDca(engine: MandateEngine, mandateId: string, overCap = false): Receipt[] {
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

export function tickDip(engine: MandateEngine, mandateId: string, overCap = false): Receipt[] {
  const m = engine.mandate(mandateId);
  const receipts: Receipt[] = [];
  const quote = fetchPrice(engine, mandateId, m.operator);
  receipts.push(quote.paid);
  if (quote.paid.type === "ActionRefused") return receipts;
  const cheap = quote.price < 11_000_000 || overCap;
  if (!cheap && !overCap) return receipts;
  const amountIn = overCap ? m.policy.perTxCap + 8_000_000 : 6_000_000;
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

export function tickYield(engine: MandateEngine, mandateId: string, overCap = false): Receipt[] {
  const m = engine.mandate(mandateId);
  const receipts: Receipt[] = [];
  const quote = fetchPrice(engine, mandateId, m.operator);
  receipts.push(quote.paid);
  if (quote.paid.type === "ActionRefused") return receipts;
  const amount = overCap ? m.policy.perTxCap + 5_000_000 : 10_000_000;
  receipts.push(
    engine.execute(mandateId, m.operator, {
      kind: "deposit",
      token: TOKENS.usdcd,
      amount,
    }),
  );
  return receipts;
}
