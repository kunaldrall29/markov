import { BorshCoder, EventParser, type Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import mandateIdl from "../idl/mandate.json";
import { variantName, type BlockReason } from "./types";

const KIND_NAMES = ["swap", "deposit", "withdraw_venue", "spend"] as const;

export type ParsedProgramEvent = {
  name: string;
  data: Record<string, unknown>;
};

export function mandateProgramId(): PublicKey {
  const address = (mandateIdl as { address?: string }).address;
  return new PublicKey(address ?? "5o8EAwdHyQ31Nmt6tUDm1y6PNDt5STmVvA6CX3E6WJPm");
}

export function strategyIdHex(raw: unknown): string | null {
  if (raw == null || raw === false) return null;
  if (typeof raw === "string") {
    const h = raw.startsWith("0x") ? raw.slice(2) : raw;
    if (/^[0-9a-f]{64}$/i.test(h)) return h.toLowerCase();
    return null;
  }
  let bytes: number[] | null = null;
  if (raw instanceof Uint8Array) bytes = [...raw];
  else if (ArrayBuffer.isView(raw)) bytes = [...new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)];
  else if (Array.isArray(raw) && raw.every((n) => typeof n === "number")) bytes = raw;
  else if (typeof raw === "object" && raw !== null) {
    const rec = raw as { data?: unknown; toArray?: () => number[] };
    if (Array.isArray(rec.data) && rec.data.every((n) => typeof n === "number")) bytes = rec.data as number[];
    else if (typeof rec.toArray === "function") bytes = rec.toArray();
  }
  if (!bytes || bytes.length !== 32) return null;
  if (bytes.every((b) => b === 0)) return null;
  return Buffer.from(bytes).toString("hex");
}

export function pubkeyString(raw: unknown): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (raw instanceof PublicKey) return raw.toBase58();
  if (typeof raw === "object" && raw !== null && "toBase58" in raw) {
    const fn = (raw as { toBase58?: unknown }).toBase58;
    if (typeof fn === "function") return (fn as () => string).call(raw);
  }
  return String(raw);
}

export function actionKindName(kind: unknown): (typeof KIND_NAMES)[number] | null {
  const n = typeof kind === "number" ? kind : Number(kind);
  if (!Number.isInteger(n) || n < 0 || n >= KIND_NAMES.length) return null;
  return KIND_NAMES[n] ?? null;
}

export function eventNameCanonical(name: string): string {
  const n = name.toLowerCase();
  if (n === "actionexecuted") return "ActionExecuted";
  if (n === "actionrefused") return "ActionRefused";
  if (n === "mandatecreated") return "MandateCreated";
  if (n === "mandatefunded") return "MandateFunded";
  if (n === "paused") return "Paused";
  if (n === "unpaused") return "Unpaused";
  if (n === "revoked") return "Revoked";
  if (n === "ownerwithdrew") return "OwnerWithdrew";
  if (n === "policyamended") return "PolicyAmended";
  return name;
}

export function parseMandateLogs(logs: string[], programId = mandateProgramId()): ParsedProgramEvent[] {
  const parser = new EventParser(programId, new BorshCoder(mandateIdl as Idl));
  const out: ParsedProgramEvent[] = [];
  try {
    for (const ev of parser.parseLogs(logs)) {
      out.push({ name: ev.name, data: ev.data as Record<string, unknown> });
    }
  } catch {
    /* Anchor EventParser throws on truncated log sets; caller still has msg! scrapes */
  }
  return out;
}

export function refusedReason(data: Record<string, unknown>): BlockReason {
  return variantName(data.reason);
}
