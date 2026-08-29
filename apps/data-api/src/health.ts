import { SQL } from "bun";
import { rpcHost, rpcUrl } from "@markov/rpc";

const INDEXER = (process.env.INDEXER_URL ?? "http://127.0.0.1:8790").replace(/\/$/, "");
const MAX_LAG = Number(process.env.INDEXER_MAX_LAG_SLOTS ?? 128);

export type DataHealth = {
  service: "data-api";
  ok: true;
  rpcHost: string;
  publicReceipts: boolean;
  rpcOk: boolean;
  lastIndexedSlot: number | null;
  lagSlots: number | null;
  chainReady: boolean;
};

async function rpcSlot(): Promise<number | null> {
  try {
    const res = await fetch(rpcUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getSlot", params: ["confirmed"] }),
    });
    const body = (await res.json()) as { result?: unknown };
    return typeof body.result === "number" ? body.result : null;
  } catch {
    return null;
  }
}

async function indexerHealth(): Promise<{
  lastIndexedSlot: number | null;
  lagSlots: number | null;
  chainReady: boolean;
} | null> {
  try {
    const res = await fetch(`${INDEXER}/health`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      lastIndexedSlot?: unknown;
      lagSlots?: unknown;
      chainReady?: unknown;
    };
    return {
      lastIndexedSlot: typeof body.lastIndexedSlot === "number" ? body.lastIndexedSlot : null,
      lagSlots: typeof body.lagSlots === "number" ? body.lagSlots : null,
      chainReady: body.chainReady === true,
    };
  } catch {
    return null;
  }
}

async function postgresState(): Promise<{ lastIndexedSlot: number | null; lastRpcSlot: number | null } | null> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  try {
    const sql = new SQL(url);
    const rows = (await sql`select last_indexed_slot, last_rpc_slot from indexer_state where id = 1`) as Array<{
      last_indexed_slot: number | null;
      last_rpc_slot: number | null;
    }>;
    const row = rows[0];
    if (!row) return null;
    return { lastIndexedSlot: row.last_indexed_slot, lastRpcSlot: row.last_rpc_slot };
  } catch {
    return null;
  }
}

export async function dataHealth(publicReceipts: boolean): Promise<DataHealth> {
  const [slot, indexed, pg] = await Promise.all([rpcSlot(), indexerHealth(), postgresState()]);
  const lastIndexedSlot = indexed?.lastIndexedSlot ?? pg?.lastIndexedSlot ?? null;
  const lagSlots =
    indexed?.lagSlots ??
    (slot != null && lastIndexedSlot != null ? Math.max(0, slot - lastIndexedSlot) : null);
  const maxLag = Number.isFinite(MAX_LAG) && MAX_LAG > 0 ? MAX_LAG : 128;
  const chainReady =
    indexed?.chainReady === true ||
    (slot != null && lastIndexedSlot != null && lagSlots != null && lagSlots <= maxLag);
  return {
    service: "data-api",
    ok: true,
    rpcHost: rpcHost(),
    publicReceipts,
    rpcOk: slot != null,
    lastIndexedSlot,
    lagSlots,
    chainReady,
  };
}
