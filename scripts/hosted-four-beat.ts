#!/usr/bin/env bun
/**
 * Hosted four-beat against Railway API + public devnet.
 * Owner create/fund goes through the hosted API (same path Float uses).
 * Operator allow + OverTxCap are house-operator txs on the same PDA.
 * Engine ledger.json is not proof — signatures and the public receipts feed are.
 *
 *   bun scripts/hosted-four-beat.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { authorizeMutation, sha256Hex, INTERIM_API, INTERIM_DATA_API, explorerTxUrl } from "@markov/rpc";
import { loadKeypair } from "@markovfyi/operator";
import {
  ROOT,
  ensureSol,
  expectBlocked,
  expectExecuted,
  houseKey,
  mintUsdcd,
  sleep,
  spend,
  sprintConnection,
  swap,
  withRetry,
} from "./chain-kit";

function hostedApi(): string {
  const explicit = process.env.HOSTED_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const fromEnv = process.env.API_URL?.trim();
  if (fromEnv && !/127\.0\.0\.1|localhost/i.test(fromEnv)) return fromEnv.replace(/\/$/, "");
  return INTERIM_API.replace(/\/$/, "");
}

const API = hostedApi();
const DATA = (process.env.RECEIPTS_API_URL?.trim() || INTERIM_DATA_API).replace(/\/$/, "");
const DEMO = join(ROOT, "docs/demo");

type ChainBuild = {
  mode: string;
  tx?: string;
  intent?: unknown;
  mandate?: string;
  seed?: string;
  error?: string;
};

async function headers(kp: Keypair, method: string, path: string, body: string) {
  const ts = String(Math.floor(Date.now() / 1000));
  const bodyHash = await sha256Hex(new TextEncoder().encode(body));
  const msg = authorizeMutation(method, path, bodyHash, kp.publicKey.toBase58(), ts, "devnet");
  const sig = nacl.sign.detached(new TextEncoder().encode(msg), kp.secretKey);
  return {
    "content-type": "application/json",
    "x-actor": kp.publicKey.toBase58(),
    "x-owner-ts": ts,
    "x-owner-sig": bs58.encode(sig),
  };
}

async function call<T>(kp: Keypair, method: string, path: string, body: unknown = {}): Promise<T> {
  const raw = method === "GET" ? "" : JSON.stringify(body);
  const res = await fetch(`${API}${path}`, {
    method,
    headers: await headers(kp, method, path, raw),
    body: method === "GET" ? undefined : raw,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${path} ${text.slice(0, 400)}`);
  return JSON.parse(text) as T;
}

async function sendTx(owner: Keypair, txB64: string): Promise<string> {
  const tx = Transaction.from(Buffer.from(txB64, "base64"));
  tx.partialSign(owner);
  const connection = sprintConnection();
  const sig = await withRetry(() =>
    connection.sendRawTransaction(tx.serialize(), { skipPreflight: false }),
  );
  const latest = await withRetry(() => connection.getLatestBlockhash("confirmed"));
  await withRetry(() => connection.confirmTransaction({ signature: sig, ...latest }, "confirmed"));
  return sig;
}

async function waitForReceipt(sig: string, ms = 20_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(`${DATA}/v1/receipts?limit=50`, { signal: AbortSignal.timeout(8000) });
      const body = (await res.json()) as { receipts?: { tx_sig?: string | null }[] };
      if ((body.receipts ?? []).some((r) => r.tx_sig === sig)) return true;
    } catch {
      /* indexer lag / 429 */
    }
    await sleep(1500);
  }
  return false;
}

async function main() {
  if (API.includes("127.0.0.1") || API.includes("localhost")) {
    throw new Error("API_URL must be the hosted Railway API — local engine is not proof");
  }
  const owner = loadKeypair(join(ROOT, "keys/owner.json"));
  const op = houseKey("markov-momentum");
  await ensureSol(owner);
  await ensureSol(op);
  await mintUsdcd(owner.publicKey, 120_000_000n);

  const health = (await fetch(`${API}/health`).then((r) => r.json())) as { chainReady?: boolean };
  console.log("hosted API", API, "chainReady", health.chainReady);
  if (!health.chainReady) throw new Error("hosted API chainReady is false");

  const built = await call<ChainBuild>(owner, "POST", "/mandates", {
    strategyId: "momentum",
    fundAmount: 80_000_000,
    overrides: { caps: { per_tx: 25_000_000, daily: 200_000_000 } },
  });
  if (built.mode !== "chain" || !built.tx || !built.seed) {
    throw new Error(`expected chain subscribe, got ${JSON.stringify(built)}`);
  }
  const createSig = await sendTx(owner, built.tx);
  const created = await call<{
    id: string;
    chain?: { pubkey: string; seed?: string };
    sig: string;
  }>(owner, "POST", "/chain/confirm", { sig: createSig, intent: built.intent });
  const seed = BigInt(built.seed);
  const pda = created.chain?.pubkey ?? built.mandate ?? "";
  console.log("beat1 create/fund", created.id, pda, createSig);

  const pay = await spend({
    operator: op,
    owner: owner.publicKey,
    seed,
    amount: 20_000n,
    key: `hosted-pay-${built.seed}`,
  });
  const paySig = expectExecuted(pay, "hosted-spend");
  const allow = await swap({
    operator: op,
    owner: owner.publicKey,
    seed,
    amountIn: 8_000_000n,
    key: `hosted-ok-${built.seed}`,
  });
  const allowSig = expectExecuted(allow, "hosted-swap");
  console.log("beat2 allow", paySig, allowSig);

  const over = await swap({
    operator: op,
    owner: owner.publicKey,
    seed,
    amountIn: 30_000_000n,
    key: `hosted-over-${built.seed}`,
  });
  const overSig = expectBlocked(over, "OverTxCap", "hosted-over");
  console.log("beat3 OverTxCap", overSig);

  mkdirSync(DEMO, { recursive: true });
  const evidence = {
    at: new Date().toISOString(),
    api: API,
    dataApi: DATA,
    mandateId: created.id,
    pda,
    seed: built.seed,
    beats: {
      createFund: { sig: createSig, explorer: explorerTxUrl(createSig) },
      spend: { sig: paySig, explorer: explorerTxUrl(paySig) },
      swapOk: { sig: allowSig, explorer: explorerTxUrl(allowSig) },
      overTxCap: { sig: overSig, explorer: explorerTxUrl(overSig) },
    },
    indexed: {
      allow: await waitForReceipt(allowSig),
      over: await waitForReceipt(overSig),
    },
  };
  writeFileSync(join(DEMO, "hosted-four-beat.json"), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log("indexed allow", evidence.indexed.allow, "over", evidence.indexed.over);
  console.log("mandateId", created.id);
  console.log("ok — hosted API create/fund + on-chain allow + OverTxCap");
}

if (import.meta.main) {
  await main();
}
