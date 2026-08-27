import { BLOCK_REASONS, type BlockReason } from "@markov/engine/types";
import tokens from "../../design-tokens.json";

export { BLOCK_REASONS, type BlockReason };

const families = tokens.badgeFamily;

export type BadgeFamily = keyof typeof families;

export function badgeFamily(reason: BlockReason): BadgeFamily {
  for (const [family, list] of Object.entries(families) as [BadgeFamily, readonly string[]][]) {
    if (list.includes(reason)) return family;
  }
  throw new Error(`no badge family for ${reason}`);
}

/** Vernacular chips. Keys must be the engine enum — never a parallel list. */
export const BLOCK_VERNACULAR: Record<BlockReason, string> = {
  Paused: "⊘ blocked: paused",
  Revoked: "⊘ blocked: revoked",
  Expired: "⊘ blocked: expired",
  Unauthorized: "⊘ blocked: unauthorized",
  ProgramNotAllowed: "⊘ blocked: venue_not_allowed",
  TokenNotAllowed: "⊘ blocked: token_not_allowed",
  OverTxCap: "⊘ blocked: over_cap",
  OverDailyCap: "⊘ blocked: over_daily",
  OverSpendCap: "⊘ blocked: over_spend",
  OverSpendDailyCap: "⊘ blocked: over_spend_daily",
  SlippageExceeded: "⊘ blocked: slippage",
};

export const BLOCK_HELD: Record<BlockReason, string> = {
  Paused: "Blocked: mandate paused. The policy held.",
  Revoked: "Blocked: mandate revoked. The policy held.",
  Expired: "Blocked: mandate expired. The policy held.",
  Unauthorized: "Blocked: operator not signed. The policy held.",
  ProgramNotAllowed: "Blocked: venue not on the allowlist. The policy held.",
  TokenNotAllowed: "Blocked: token not on the allowlist. The policy held.",
  OverTxCap: "Blocked: over per-trade cap. The policy held.",
  OverDailyCap: "Blocked: over daily cap. The policy held.",
  OverSpendCap: "Blocked: over spend cap. The policy held.",
  OverSpendDailyCap: "Blocked: over daily spend cap. The policy held.",
  SlippageExceeded: "Blocked: slippage bound exceeded. The policy held.",
};

export function isBlockReason(value: unknown): value is BlockReason {
  return typeof value === "string" && (BLOCK_REASONS as readonly string[]).includes(value);
}

export function vernacular(reason: unknown): string {
  if (!isBlockReason(reason)) return "";
  return BLOCK_VERNACULAR[reason];
}

export function heldCopy(reason: unknown): string {
  if (!isBlockReason(reason)) return "";
  return BLOCK_HELD[reason];
}
