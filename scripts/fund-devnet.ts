import { spawnSync } from "node:child_process";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const SLEEP = (ms: number) => new Promise((r) => setTimeout(r, ms));

const RPCS = [
  process.env.MARKOV_RPC ?? "https://api.devnet.solana.com",
  "https://api.devnet.solana.com",
];

async function jsonRpcAirdrop(rpc: string, pk: PublicKey, lamports: number): Promise<string | null> {
  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "requestAirdrop",
        params: [pk.toBase58(), lamports],
      }),
    });
    const body = (await res.json()) as { result?: string; error?: { message: string } };
    if (body.result) return body.result;
    console.warn(`rpc airdrop ${rpc}:`, body.error?.message ?? res.status);
  } catch (err) {
    console.warn(`rpc airdrop ${rpc} failed:`, err instanceof Error ? err.message : err);
  }
  return null;
}

function cliAirdrop(pk: PublicKey, sol: number, rpc: string): boolean {
  const r = spawnSync("solana", ["airdrop", String(sol), pk.toBase58(), "-u", rpc, "--commitment", "confirmed"], {
    encoding: "utf8",
  });
  if (r.status === 0) return true;
  const err = (r.stderr || r.stdout || "").slice(0, 200);
  if (err) console.warn(`cli airdrop: ${err}`);
  return false;
}

async function faucetHttp(pk: PublicKey): Promise<boolean> {
  const urls = [
    "https://faucet.solana.com/api/request",
    "https://api.solana.com/v1/airdrop",
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pubkey: pk.toBase58(),
          walletAddress: pk.toBase58(),
          amount: 2,
          network: "devnet",
          cluster: "devnet",
        }),
      });
      if (res.ok) {
        console.log(`faucet ${url} ok`);
        return true;
      }
      console.warn(`faucet ${url}: ${res.status} ${(await res.text()).slice(0, 120)}`);
    } catch (err) {
      console.warn(`faucet ${url}:`, err instanceof Error ? err.message : err);
    }
  }
  return false;
}

export async function airdropOnce(connection: Connection, pk: PublicKey, sol = 2): Promise<boolean> {
  const lamports = sol * LAMPORTS_PER_SOL;
  for (const rpc of RPCS) {
    const sig = await jsonRpcAirdrop(rpc, pk, lamports);
    if (sig) {
      try {
        await connection.confirmTransaction(sig, "confirmed");
        return true;
      } catch {
        await SLEEP(1500);
        return true;
      }
    }
    if (cliAirdrop(pk, sol, rpc)) return true;
  }
  try {
    const sig = await connection.requestAirdrop(pk, lamports);
    await connection.confirmTransaction(sig, "confirmed");
    return true;
  } catch (err) {
    console.warn("connection.requestAirdrop:", err instanceof Error ? err.message : err);
  }
  return faucetHttp(pk);
}

export async function drainTo(connection: Connection, from: Keypair, to: PublicKey) {
  const bal = await connection.getBalance(from.publicKey);
  const keep = 5_000;
  if (bal <= keep) return;
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: from.publicKey, toPubkey: to, lamports: bal - keep }),
  );
  await sendAndConfirmTransaction(connection, tx, [from], { commitment: "confirmed" });
}

/** Devnet faucet is flaky. Spray airdrops onto ephemeral wallets, then consolidate. */
export async function fundAccounts(
  connection: Connection,
  deployer: Keypair,
  extras: PublicKey[],
  minDeployerSol = 8,
): Promise<number> {
  const target = minDeployerSol * LAMPORTS_PER_SOL;
  for (let round = 0; round < 24; round++) {
    const bal = await connection.getBalance(deployer.publicKey);
    console.log(`deployer SOL ${(bal / LAMPORTS_PER_SOL).toFixed(3)} (round ${round + 1})`);
    if (bal >= target) break;

    const temps = Array.from({ length: 4 }, () => Keypair.generate());
    const jobs = [
      airdropOnce(connection, deployer.publicKey, 2),
      ...temps.map((k) => airdropOnce(connection, k.publicKey, 2)),
      ...extras.slice(0, 3).map((pk) => airdropOnce(connection, pk, 1)),
    ];
    await Promise.all(jobs);
    await SLEEP(2000);
    for (const k of temps) {
      try {
        await drainTo(connection, k, deployer.publicKey);
      } catch (err) {
        console.warn("drain", err instanceof Error ? err.message : err);
      }
    }
    await SLEEP(1000 + round * 500);
  }

  const final = await connection.getBalance(deployer.publicKey);
  console.log(`deployer SOL final ${(final / LAMPORTS_PER_SOL).toFixed(3)}`);
  return final;
}
