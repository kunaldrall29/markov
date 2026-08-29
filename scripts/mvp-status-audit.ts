#!/usr/bin/env bun
/**
 * Fail-closed hosted/chain audit. Prints GO or NO-GO.
 * Local ledger.json is never evidence.
 */
import { BLOCK_REASONS } from "@markov/engine/types";
import { Connection, PublicKey } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseMandateLogs, eventNameCanonical, variantName, loadFacts, strategyIdHex } from "@markovfyi/operator";
import { FLOAT_URL, INTERIM_DATA_API, RECEIPTS_API_URL } from "@markov/rpc";

const ROOT = join(import.meta.dir, "..");
type Row = { name: string; ok: boolean; detail: string };
const rows: Row[] = [];

function add(name: string, ok: boolean, detail: string) {
  rows.push({ name, ok, detail });
  console.log(`${ok ? "OK" : "FAIL"}  ${name}  ${detail}`);
}

async function httpJson(url: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status, body };
}

async function dataApiBase(): Promise<string> {
  for (const base of [RECEIPTS_API_URL, INTERIM_DATA_API]) {
    try {
      const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) return base;
    } catch {
      /* try next */
    }
  }
  return INTERIM_DATA_API;
}

async function main() {
  const float = await fetch(FLOAT_URL, { signal: AbortSignal.timeout(10000) }).catch(() => null);
  add("hosted Float", float?.ok === true, `${FLOAT_URL} status=${float?.status ?? "error"}`);

  const api = await dataApiBase();
  const health = await httpJson(`${api}/health`);
  const h = health.body as { chainReady?: boolean; lastIndexedSlot?: number; lagSlots?: number };
  add(
    "data-api chainReady",
    health.status === 200 && h.chainReady === true,
    `${api}/health chainReady=${String(h.chainReady)} lag=${String(h.lagSlots)} slot=${String(h.lastIndexedSlot)}`,
  );

  const receipts = await httpJson(`${api}/v1/receipts?limit=50`);
  const list = receipts.body as { receipts?: unknown[] };
  const n = Array.isArray(list.receipts) ? list.receipts.length : 0;
  add("public ledger non-empty", receipts.status === 200 && n > 0, `receipts=${n}`);

  const stats = await httpJson(`${api}/v1/receipts/stats`);
  const by = (stats.body as { by_reason?: Record<string, number> }).by_reason ?? {};
  const reasonKeys = BLOCK_REASONS.filter((r) => Number(by[r]) > 0);
  add("stats 11 BlockReasons", reasonKeys.length === 11, `keys=${reasonKeys.length} ${reasonKeys.join(",")}`);

  const facts = loadFacts(join(ROOT, "data/devnet.json"));
  const house = JSON.parse(readFileSync(join(ROOT, "data/house-operators.json"), "utf8")) as Record<string, string>;
  const operators = ["markov-steady", "markov-momentum", "markov-redteam"].map((k) => house[k]!);
  const conn = new Connection(facts?.rpc ?? "https://api.devnet.solana.com", "confirmed");
  const pid = new PublicKey(facts!.programs.mandate);
  const sigs = await conn.getSignaturesForAddress(pid, { limit: 1000 });
  const reasons = new Set<string>();
  const opHits = new Set<string>();
  for (const s of sigs) {
    const tx = await conn.getTransaction(s.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
    const events = parseMandateLogs(tx?.meta?.logMessages ?? [], pid);
    for (const ev of events) {
      const name = eventNameCanonical(ev.name);
      const op = String(ev.data.operator ?? "");
      if (operators.includes(op) || operators.some((o) => op.includes(o))) opHits.add(op);
      if (typeof ev.data.operator === "object") {
        const pk = (ev.data.operator as { toBase58?: () => string }).toBase58?.();
        if (pk && operators.includes(pk)) opHits.add(pk);
      }
      if (name === "ActionRefused") reasons.add(variantName(ev.data.reason));
      if (name === "ActionExecuted" || name === "ActionRefused") {
        strategyIdHex(ev.data.strategyId ?? ev.data.strategy_id);
      }
    }
  }
  add("chain 11 BlockReasons", reasons.size === 11, `on-chain reasons=${reasons.size} ${[...reasons].join(",")}`);
  add("three house operators on-chain", opHits.size >= 3, `operator hits=${opHits.size}`);

  const app = readFileSync(join(ROOT, "docs/grant/APPLICATION.md"), "utf8");
  add("grant application present", !app.includes("Absent from this repository"), "docs/grant/APPLICATION.md");

  const factsMd = readFileSync(join(ROOT, "docs/FACTS.md"), "utf8");
  add("F-CANONICAL-DOMAIN closed", /F-CANONICAL-DOMAIN`?\s*\|\s*\*\*Closed\*\*/.test(factsMd) || factsMd.includes("F-CANONICAL-DOMAIN | **Closed**"), "FACTS");
  add(
    "F-X402-SETTLE-MINT deferred-M2",
    factsMd.includes("deferred-M2") && factsMd.includes("F-X402-SETTLE-MINT"),
    "FACTS",
  );

  const failed = rows.filter((r) => !r.ok);
  console.log("");
  console.log(failed.length === 0 ? "GO" : "NO-GO");
  process.exit(failed.length === 0 ? 0 : 1);
}

await main();
