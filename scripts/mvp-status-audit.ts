#!/usr/bin/env bun
/**
 * Fail-closed hosted/chain audit. Prints GO or NO-GO.
 * Local ledger.json is never evidence.
 *
 * Status: OK | FAIL | DEFERRED.
 * DEFERRED requires decision ID, owner, and the trigger that reactivates it.
 * GO requires zero FAIL. Deferred rows are never printed as OK.
 */
import { BLOCK_REASONS } from "@markov/engine/types";
import { Connection, PublicKey } from "@solana/web3.js";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseMandateLogs, eventNameCanonical, variantName, loadFacts, pubkeyString } from "@markovfyi/operator";
import { FLOAT_URL, INTERIM_DATA_API, RECEIPTS_API_URL, RECEIPTS_PAGE_URL, rpcUrl } from "@markov/rpc";

const ROOT = join(import.meta.dir, "..");

export type CheckStatus = "OK" | "FAIL" | "DEFERRED";

export type Row = {
  name: string;
  status: CheckStatus;
  detail: string;
  decisionId?: string;
  owner?: string;
  reactivates?: string;
};

export function verdictOf(rows: Row[]): {
  go: boolean;
  ok: number;
  fail: number;
  deferred: number;
  headline: string;
  deferredBlock: string;
} {
  const ok = rows.filter((r) => r.status === "OK").length;
  const fail = rows.filter((r) => r.status === "FAIL").length;
  const deferred = rows.filter((r) => r.status === "DEFERRED");
  const go = fail === 0;
  const lines = deferred.map(
    (d) => `- ${d.name} (${d.decisionId}, owner ${d.owner}): ${d.reactivates}`,
  );
  const deferredBlock =
    deferred.length === 0
      ? ""
      : ["Deferred by decision — reactivates when:", ...lines].join("\n");
  return {
    go,
    ok,
    fail,
    deferred: deferred.length,
    headline: go ? "GO" : "NO-GO",
    deferredBlock,
  };
}

export function formatRow(row: Row): string {
  if (row.status === "DEFERRED") {
    if (!row.decisionId || !row.owner || !row.reactivates) {
      throw new Error(`DEFERRED row missing decision fields: ${row.name}`);
    }
    return `DEFERRED  ${row.name}  ${row.detail}  [${row.decisionId}; owner ${row.owner}; reactivates: ${row.reactivates}]`;
  }
  return `${row.status}  ${row.name}  ${row.detail}`;
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

/** Paths that still cite the marketing `/receipts` URL (canonical is float). */
export function marketingReceiptsHits(root = ROOT): string[] {
  const hits: string[] = [];
  const skip = new Set([
    "node_modules",
    ".git",
    "target",
    ".next",
    "dist",
    "build",
    ".docusaurus",
    ".tmp",
    ".vercel",
    "coverage",
  ]);
  function walk(dir: string) {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (skip.has(name)) continue;
      const p = join(dir, name);
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(p);
      else if (/\.(md|ts|tsx|js|mjs|cjs|json|txt)$/.test(name)) {
        const text = readFileSync(p, "utf8");
        if (/(^|[^\w.])markovhq\.com\/receipts/.test(text)) hits.push(p.slice(root.length + 1));
      }
    }
  }
  walk(root);
  return hits;
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

const rows: Row[] = [];

function add(name: string, ok: boolean, detail: string) {
  const row: Row = { name, status: ok ? "OK" : "FAIL", detail };
  rows.push(row);
  console.log(formatRow(row));
}

function addDeferred(name: string, decisionId: string, owner: string, reactivates: string, detail: string) {
  if (!decisionId.trim() || !owner.trim() || !reactivates.trim()) {
    throw new Error(`DEFERRED requires decision ID, owner, and reactivates (${name})`);
  }
  const row: Row = { name, status: "DEFERRED", detail, decisionId, owner, reactivates };
  rows.push(row);
  console.log(formatRow(row));
}

function factsClosed(md: string, id: string): boolean {
  const re = new RegExp(`\`${id}\`\\s*\\|\\s*\\*\\*Closed\\*\\*`);
  return re.test(md) || md.includes(`${id} | **Closed**`);
}

function factsOpen(md: string, id: string): boolean {
  const re = new RegExp(`\`${id}\`\\s*\\|\\s*\\*\\*Open\\*\\*`);
  return re.test(md) || md.includes(`${id} | **Open**`);
}

async function main() {
  add("RECEIPTS_PAGE_URL is float", RECEIPTS_PAGE_URL === `${FLOAT_URL}/receipts`, RECEIPTS_PAGE_URL);

  const float = await fetch(FLOAT_URL, { signal: AbortSignal.timeout(10000) }).catch(() => null);
  add("hosted Float", float?.ok === true, `${FLOAT_URL} status=${float?.status ?? "error"}`);

  const receiptsPage = await fetch(RECEIPTS_PAGE_URL, { signal: AbortSignal.timeout(15000) }).catch(() => null);
  add(
    "public receipts feed",
    receiptsPage?.ok === true,
    `${RECEIPTS_PAGE_URL} status=${receiptsPage?.status ?? "error"}`,
  );

  const leftover = marketingReceiptsHits();
  add("no marketing /receipts URL", leftover.length === 0, leftover.length === 0 ? "grep clean" : leftover.slice(0, 8).join(", "));

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

  addDeferred(
    "grant application outside repo",
    "D-08",
    "Kunal",
    "Never — the grant pack lives outside the code repo by design",
    "docs/grant/APPLICATION.md is a pointer; absence is not a FAIL",
  );
  addDeferred(
    "github org MarkovFyi transfer",
    "D-09",
    "Kunal",
    "Grant acceptance",
    "Live repo remains kunaldrall29/markov until the grant lands",
  );
  addDeferred(
    "licence holder MarkovFyi",
    "D-09",
    "Kunal",
    "Grant acceptance",
    "LICENSE copyright stays Kunal Drall until org transfer",
  );
  addDeferred(
    "six-repo layout",
    "D-09",
    "Kunal",
    "Grant acceptance",
    "Live code is this monorepo; six-repo split waits on org transfer",
  );

  add(
    "contact email domain (D-10)",
    factsMd.includes("hello@markovhq.net") && factsMd.includes("D-10") && factsClosed(factsMd, "F-EMAIL-DOMAIN"),
    "F-EMAIL-DOMAIN closed; hello@markovhq.net is a deliberate separate domain",
  );

  add("F-DOMAIN-FLOAT closed", factsClosed(factsMd, "F-DOMAIN-FLOAT"), "FACTS");
  add("F-DOMAIN-RECEIPTS closed", factsClosed(factsMd, "F-DOMAIN-RECEIPTS") && factsMd.includes("D-11"), "FACTS D-11");
  add(
    "F-DOMAIN-SUBDOMAINS recorded open",
    factsOpen(factsMd, "F-DOMAIN-SUBDOMAINS") && /Owner:\s*Kunal/i.test(factsMd) && /not a code task/i.test(factsMd),
    "Open, owner Kunal, not a code task — not silently green",
  );
  add(
    "F-CANONICAL-DOMAIN parent closed",
    factsClosed(factsMd, "F-CANONICAL-DOMAIN"),
    "Parent split into F-DOMAIN-*",
  );
  add(
    "F-X402-SETTLE-MINT deferred-M2",
    factsMd.includes("deferred-M2") && factsMd.includes("F-X402-SETTLE-MINT"),
    "FACTS",
  );

  const v = verdictOf(rows);
  console.log("");
  console.log(v.headline);
  console.log(`OK ${v.ok} / FAIL ${v.fail} / DEFERRED ${v.deferred}`);
  if (v.deferredBlock) {
    console.log("");
    console.log(v.deferredBlock);
  }
  process.exit(v.go ? 0 : 1);
}

if (import.meta.main) {
  await main();
}
