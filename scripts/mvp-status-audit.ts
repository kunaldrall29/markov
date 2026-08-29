#!/usr/bin/env bun
/**
 * Fail-closed hosted/chain audit. Prints GO or NO-GO.
 * Local ledger.json is never evidence.
 */
import { BLOCK_REASONS } from "@markov/engine/types";
import { Connection, PublicKey } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseMandateLogs, eventNameCanonical, variantName, loadFacts, pubkeyString } from "@markovfyi/operator";
import { FLOAT_URL, INTERIM_DATA_API, RECEIPTS_API_URL, rpcUrl } from "@markov/rpc";

const ROOT = join(import.meta.dir, "..");
type Row = { name: string; ok: boolean; detail: string };
const rows: Row[] = [];

function add(name: string, ok: boolean, detail: string) {
  rows.push({ name, ok, detail });
  console.log(`${ok ? "OK" : "FAIL"}  ${name}  ${detail}`);
}

export function parseFactsRefusalTable(md: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /^\|\s*([A-Za-z]+)\s*\|\s*`([1-9A-HJ-NP-Za-km-z]{32,88})`\s*\|/gm;
  for (const m of md.matchAll(re)) {
    const reason = m[1]!;
    const sig = m[2]!;
    if ((BLOCK_REASONS as readonly string[]).includes(reason)) out.set(reason, sig);
  }
  return out;
}

export function parseFactsHouseTickSigs(md: string): string[] {
  const row = md.split("\n").find((line) => line.includes("House operators on-chain"));
  if (!row) return [];
  const sigs = [...row.matchAll(/`([1-9A-HJ-NP-Za-km-z]{64,88})`/g)].map((m) => m[1]!);
  return sigs.slice(0, 3);
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

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(fn: () => Promise<T>, tries = 8): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = /429|too many|timed out|fetch failed|ECONNRESET|busy|503/i.test(msg);
      if (!retryable && i >= 2) throw err;
      await sleep(800 * (i + 1));
    }
  }
  throw last;
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

  const factsMd = readFileSync(join(ROOT, "docs/FACTS.md"), "utf8");
  const facts = loadFacts(join(ROOT, "data/devnet.json"));
  const house = JSON.parse(readFileSync(join(ROOT, "data/house-operators.json"), "utf8")) as Record<string, string>;
  const operators = ["markov-steady", "markov-momentum", "markov-redteam"].map((k) => house[k]!);
  const rpc = process.env.SOLANA_RPC_URL?.trim() || rpcUrl() || facts?.rpc || "https://api.devnet.solana.com";
  const conn = new Connection(rpc, "confirmed");
  const pid = new PublicKey(facts!.programs.mandate);

  try {
    const table = parseFactsRefusalTable(factsMd);
    const reasons = new Set<string>();
    const missing: string[] = [];
    for (const code of BLOCK_REASONS) {
      const sig = table.get(code);
      if (!sig) {
        missing.push(code);
        continue;
      }
      const tx = await withRetry(() =>
        conn.getTransaction(sig, { commitment: "confirmed", maxSupportedTransactionVersion: 0 }),
      );
      const events = parseMandateLogs(tx?.meta?.logMessages ?? [], pid);
      const hit = events.some(
        (ev) => eventNameCanonical(ev.name) === "ActionRefused" && variantName(ev.data.reason) === code,
      );
      if (hit) reasons.add(code);
      else missing.push(code);
    }
    add(
      "chain 11 BlockReasons",
      reasons.size === 11,
      reasons.size === 11
        ? `on-chain reasons=${reasons.size} (FACTS sigs confirmed)`
        : `on-chain reasons=${reasons.size} missing=${missing.join(",")}`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    add("chain 11 BlockReasons", false, `unevaluable: ${msg.slice(0, 180)}`);
  }

  try {
    const opHits = new Set<string>();
    const tickSigs = parseFactsHouseTickSigs(factsMd);
    const probe = tickSigs.length === 3 ? tickSigs : [];
    if (probe.length === 3) {
      for (const sig of probe) {
        const tx = await withRetry(() =>
          conn.getTransaction(sig, { commitment: "confirmed", maxSupportedTransactionVersion: 0 }),
        );
        const events = parseMandateLogs(tx?.meta?.logMessages ?? [], pid);
        for (const ev of events) {
          const op = pubkeyString(ev.data.operator);
          if (operators.includes(op)) opHits.add(op);
        }
      }
    } else {
      for (const pk of operators) {
        const sigs = await withRetry(() => conn.getSignaturesForAddress(new PublicKey(pk), { limit: 5 }));
        if (sigs.length > 0) opHits.add(pk);
      }
    }
    add("three house operators on-chain", opHits.size >= 3, `operator hits=${opHits.size}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    add("three house operators on-chain", false, `unevaluable: ${msg.slice(0, 180)}`);
  }

  const app = readFileSync(join(ROOT, "docs/grant/APPLICATION.md"), "utf8");
  add("grant application present", !app.includes("Absent from this repository"), "docs/grant/APPLICATION.md");

  add(
    "F-CANONICAL-DOMAIN closed",
    /F-CANONICAL-DOMAIN`?\s*\|\s*\*\*Closed\*\*/.test(factsMd) || factsMd.includes("F-CANONICAL-DOMAIN | **Closed**"),
    "FACTS",
  );
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

if (import.meta.main) {
  await main();
}
