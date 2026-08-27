import type { Mandate, Receipt } from "@markov/engine";
import { publishedStrategies } from "./seed";

function actionRows(receipts: Receipt[]) {
  return receipts.filter((r) => r.type === "ActionExecuted" || r.type === "ActionRefused");
}

export function strategyStats(receipts: Receipt[], mandates: Mandate[]) {
  return publishedStrategies().map((s) => {
    const rows = receipts.filter(
      (r) =>
        (r.type === "ActionExecuted" || r.type === "ActionRefused") &&
        "strategyId" in r &&
        r.strategyId === s.strategyId,
    );
    const actions = rows.filter((r) => r.type === "ActionExecuted").length;
    const refusals = rows.filter((r) => r.type === "ActionRefused").length;
    const volume = rows
      .filter((r): r is Extract<Receipt, { type: "ActionExecuted" }> => r.type === "ActionExecuted")
      .reduce((n, r) => n + r.amountIn, 0);
    const subs = mandates.filter((m) => m.strategyId === s.strategyId);
    const created = subs.map((m) => m.createdTs);
    const tenure = created.length ? Math.max(...created.map((t) => Date.now() / 1000 - t)) : 0;
    return {
      ...s,
      stats: {
        actions,
        refusals,
        refusalRate: actions + refusals === 0 ? 0 : refusals / (actions + refusals),
        volume,
        subscribers: subs.length,
        tenureSecs: Math.floor(tenure),
      },
    };
  });
}

export function operatorStats(receipts: Receipt[], mandates: Mandate[]) {
  const operators = [...new Set(mandates.map((m) => m.operator))];
  return operators.map((operator) => {
    const rows = actionRows(receipts).filter((r) => "operator" in r && r.operator === operator);
    const actions = rows.filter((r) => r.type === "ActionExecuted").length;
    const refusals = rows.filter((r) => r.type === "ActionRefused").length;
    const volume = rows
      .filter((r): r is Extract<Receipt, { type: "ActionExecuted" }> => r.type === "ActionExecuted")
      .reduce((n, r) => n + r.amountIn, 0);
    const owned = mandates.filter((m) => m.operator === operator);
    const created = owned.map((m) => m.createdTs);
    const tenure = created.length ? Math.max(...created.map((t) => Date.now() / 1000 - t)) : 0;
    return {
      operator,
      stats: {
        actions,
        refusals,
        refusalRate: actions + refusals === 0 ? 0 : refusals / (actions + refusals),
        volume,
        mandates: owned.length,
        tenureSecs: Math.floor(tenure),
      },
    };
  });
}
