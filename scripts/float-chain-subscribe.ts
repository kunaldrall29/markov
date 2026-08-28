import { join } from "node:path";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { Keypair, Transaction, Connection } from "@solana/web3.js";
import { authorizeMutation, sha256Hex } from "@markov/rpc";
import { loadFacts, loadKeypair } from "@markovfyi/operator";

const ROOT = join(import.meta.dir, "..");
const API = process.env.API_URL ?? "http://127.0.0.1:8787";

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
  if (!res.ok) throw new Error(`${res.status} ${path} ${text}`);
  return JSON.parse(text) as T;
}

async function sendTx(owner: Keypair, txB64: string) {
  const facts = loadFacts(join(ROOT, "data/devnet.json"));
  if (!facts) throw new Error("data/devnet.json missing");
  const tx = Transaction.from(Buffer.from(txB64, "base64"));
  tx.partialSign(owner);
  const connection = new Connection(facts.rpc, "confirmed");
  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  const latest = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction({ signature: sig, ...latest }, "confirmed");
  return sig;
}

async function main() {
  const owner = loadKeypair(join(ROOT, "keys/owner.json"));
  console.log("owner", owner.publicKey.toBase58());
  const health = await fetch(`${API}/health`).then((r) => r.json()) as { chainReady?: boolean };
  console.log("chainReady", health.chainReady);
  if (!health.chainReady) throw new Error("API chainReady is false — restart the API");

  try {
    const minted = await call<{ sig: string; explorerUrl: string }>(owner, "POST", "/chain/faucet", {});
    console.log("faucet", minted.explorerUrl);
  } catch (err) {
    console.log("faucet", err instanceof Error ? err.message : err);
  }

  const built = await call<{
    mode: string;
    tx: string;
    intent: unknown;
    mandate: string;
    seed: string;
  }>(owner, "POST", "/mandates", {
    strategyId: "momentum",
    fundAmount: 2_000_000,
    overrides: { caps: { per_tx: 20_000_000, daily: 80_000_000 } },
  });
  if (built.mode !== "chain" || !built.tx) throw new Error(`expected chain tx, got ${JSON.stringify(built)}`);
  console.log("unsigned create", built.mandate);

  const createSig = await sendTx(owner, built.tx);
  console.log("create sig", createSig);
  const created = await call<{ id: string; chain?: { pubkey: string }; sig: string; explorerUrl: string }>(
    owner,
    "POST",
    "/chain/confirm",
    { sig: createSig, intent: built.intent },
  );
  console.log("engine", created.id, "pda", created.chain?.pubkey, created.explorerUrl);

  const pauseBuilt = await call<{ mode: string; tx: string; intent: unknown }>(
    owner,
    "POST",
    `/mandates/${created.id}/pause`,
    {},
  );
  if (pauseBuilt.mode !== "chain") throw new Error("pause should be on-chain");
  const pauseSig = await sendTx(owner, pauseBuilt.tx);
  const paused = await call<{ state?: string; sig: string }>(owner, "POST", "/chain/confirm", {
    sig: pauseSig,
    intent: pauseBuilt.intent,
  });
  console.log("paused", paused.sig);

  const unpauseBuilt = await call<{ mode: string; tx: string; intent: unknown }>(
    owner,
    "POST",
    `/mandates/${created.id}/unpause`,
    {},
  );
  const unpauseSig = await sendTx(owner, unpauseBuilt.tx);
  await call(owner, "POST", "/chain/confirm", { sig: unpauseSig, intent: unpauseBuilt.intent });

  const withdrawBuilt = await call<{ mode: string; tx: string; intent: unknown }>(
    owner,
    "POST",
    `/mandates/${created.id}/withdraw`,
    { token: "USDC-d", amount: 1_000_000 },
  );
  const withdrawSig = await sendTx(owner, withdrawBuilt.tx);
  const withdrew = await call<{ sig: string }>(owner, "POST", "/chain/confirm", {
    sig: withdrawSig,
    intent: withdrawBuilt.intent,
  });
  console.log("withdrew", withdrew.sig);

  const revokeBuilt = await call<{ mode: string; tx: string; intent: unknown }>(
    owner,
    "POST",
    `/mandates/${created.id}/revoke`,
    {},
  );
  const revokeSig = await sendTx(owner, revokeBuilt.tx);
  const revoked = await call<{ state?: string; explorerUrl?: string }>(owner, "POST", "/chain/confirm", {
    sig: revokeSig,
    intent: revokeBuilt.intent,
  });
  const status = await fetch(`${API}/mandates/${created.id}`).then((r) => r.json()) as {
    mandate: { state: string; chain?: { pubkey: string } };
  };
  console.log("final", status.mandate.state, status.mandate.chain?.pubkey, revoked.explorerUrl);
  if (status.mandate.state !== "Revoked") throw new Error(`expected Revoked, got ${status.mandate.state}`);
  console.log("ok — wallet-signed subscribe, pause, withdraw, revoke on public devnet");
}

if (import.meta.main) {
  await main();
}
