const LABELS: Record<string, string> = {
  Paused: "blocked: paused",
  Revoked: "blocked: revoked",
  Expired: "blocked: expired",
  Unauthorized: "blocked: unauthorized",
  ProgramNotAllowed: "blocked: venue_not_allowed",
  TokenNotAllowed: "blocked: token_not_allowed",
  OverTxCap: "blocked: over_cap",
  OverDailyCap: "blocked: over_daily",
  OverSpendCap: "blocked: over_spend",
  OverSpendDailyCap: "blocked: over_spend_daily",
  SlippageExceeded: "blocked: slippage",
};

export function blockLabel(reason: unknown): string {
  if (typeof reason !== "string" || !reason) return "";
  return LABELS[reason] ?? `blocked: ${reason}`;
}
