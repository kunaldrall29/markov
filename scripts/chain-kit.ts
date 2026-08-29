/**
 * Shared helpers for public-devnet sprint scripts.
 * Never logs key material. RPC from SOLANA_RPC_URL, else data/devnet.json.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { OperatorClient } from "../packages/operator/src/operator";
import { OwnerClient, strategyIdBytes, type ChainPolicy } from "../packages/operator/src/owner";
import { loadFacts, loadKeypair } from "../packages/operator/src/keys";
import { rpcUrl } from "../packages/rpc/src/index";
import type { GuardedResult } from "../packages/operator/src/types";

export const ROOT = join(import.meta.dir, "..");
export const FACTS_PATH = join(ROOT, "data/devnet.json");
export const HOUSE_PATH = join(ROOT, "data/house-operators.json");

export type HouseName = "markov-steady" | "markov-momentum" | "markov-redteam";

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function withRetry<T>(fn: () => Promise<T>, tries = 8): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = /429|too many|blockhash|timed out|fetch failed|socket|ECONNRESET|busy/i.test(msg);
      if (!retryable && i >= 2) throw err;
      await sleep(1200 * (i + 1));
    }
  }
  throw last;
}

export function loadHouseMap(): Record<string, string> {
  return JSON.parse(readFileSync(HOUSE_PATH, "utf8")) as Record<string, string>;
}

export function loadKeyMatching(pubkey: string): Keypair {
  const dir = join(ROOT, "keys");
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const kp = loadKeypair(join(dir, file));
      if (kp.publicKey.toBase58() === pubkey) return kp;
    } catch {
      /* skip non-keypair json in keys/ */
    }
  }
  throw new Error(`no gitignored key matches ${pubkey}`);
}

export function houseKey(name: HouseName): Keypair {
  const pk = loadHouseMap()[name];
  if (!pk) throw new Error(`missing house pubkey ${name}`);
  return loadKeyMatching(pk);
}

export function sprintFacts() {
  const facts = loadFacts(FACTS_PATH);
  if (!facts) throw new Error("data/devnet.json missing");
  return facts;
}

export function sprintRpc(): string {
  return process.env.SOLANA_RPC_URL?.trim() || sprintFacts().rpc;
}

export function sprintConnection(): Connection {
  return new Connection(sprintRpc(), "confirmed");
}

export function ownersClient(payer: Keypair): OwnerClient {
  return new OwnerClient({ payer, rpc: sprintRpc(), factsPath: FACTS_PATH });
}

/** Fresh client per call so a Revoked halt cannot swallow later txs. */
export function opsClient(operator: Keypair): OperatorClient {
  return new OperatorClient({ operator, rpc: sprintRpc(), factsPath: FACTS_PATH });
}

export function fullPolicy(): ChainPolicy {
  const facts = sprintFacts();
  return {
    programs: [
      new PublicKey(facts.programs.demoSwap),
      new PublicKey(facts.programs.demoYield),
      new PublicKey(facts.programs.mandate),
    ],
    tokens: [new PublicKey(facts.mints.usdcd), new PublicKey(facts.mints.demo)],
    perTxCap: 10_000_000n,
    dailyCap: 12_000_000n,
    spendPerCallCap: 50_000n,
    spendDailyCap: 80_000n,
    maxSlippageBps: 50,
  };
}

export function momentumPolicy(perTxCap: bigint): ChainPolicy {
  const facts = sprintFacts();
  return {
    programs: [new PublicKey(facts.programs.demoSwap), new PublicKey(facts.programs.mandate)],
    tokens: [new PublicKey(facts.mints.usdcd), new PublicKey(facts.mints.demo)],
    perTxCap,
    dailyCap: 500_000_000n,
    spendPerCallCap: 100_000n,
    spendDailyCap: 400_000n,
    maxSlippageBps: 80,
  };
}

export function yieldOnlyPolicy(): ChainPolicy {
  const facts = sprintFacts();
  return {
    programs: [new PublicKey(facts.programs.demoYield)],
    tokens: [new PublicKey(facts.mints.usdcd)],
    perTxCap: 50_000_000n,
    dailyCap: 200_000_000n,
    spendPerCallCap: 100_000n,
    spendDailyCap: 400_000n,
    maxSlippageBps: 50,
  };
}

export async function ensureSol(kp: Keypair, minSol = 0.03): Promise<void> {
  const connection = sprintConnection();
  const deployer = loadKeypair(join(ROOT, "keys/deployer.json"));
  const min = Math.floor(minSol * LAMPORTS_PER_SOL);
  const bal = await withRetry(() => connection.getBalance(kp.publicKey));
  if (bal >= min) return;
  const need = min - bal + Math.floor(0.01 * LAMPORTS_PER_SOL);
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: deployer.publicKey,
      toPubkey: kp.publicKey,
      lamports: need,
    }),
  );
  await withRetry(() => sendAndConfirmTransaction(connection, tx, [deployer], { commitment: "confirmed" }));
}

export async function mintUsdcd(owner: PublicKey, amount: bigint): Promise<string> {
  const facts = sprintFacts();
  const connection = sprintConnection();
  const deployer = loadKeypair(join(ROOT, "keys/deployer.json"));
  const mint = new PublicKey(facts.mints.usdcd);
  const dest = getAssociatedTokenAddressSync(mint, owner, false);
  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(deployer.publicKey, dest, owner, mint),
    createMintToInstruction(mint, dest, deployer.publicKey, amount, [], TOKEN_PROGRAM_ID),
  );
  return withRetry(() => sendAndConfirmTransaction(connection, tx, [deployer], { commitment: "confirmed" }));
}

export async function createFundedMandate(args: {
  operator: PublicKey;
  policy: ChainPolicy;
  strategyId?: string | null;
  fund: bigint;
  expiresTs?: bigint;
}): Promise<{ seed: bigint; mandate: PublicKey; createSig: string; fundSig: string }> {
  const facts = sprintFacts();
  const owner = loadKeypair(join(ROOT, "keys/owner.json"));
  const emergency = loadKeypair(join(ROOT, "keys/emergency.json"));
  await ensureSol(owner);
  await ensureSol(emergency);
  const quoteMint = new PublicKey(facts.mints.usdcd);
  const demoMint = new PublicKey(facts.mints.demo);
  await mintUsdcd(owner.publicKey, args.fund + 1_000_000n);
  const seed = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 999));
  const expires = args.expiresTs ?? BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 3600);
  const owners = ownersClient(owner);
  const created = await withRetry(() =>
    owners.createMandate({
      owner,
      operator: args.operator,
      emergency: emergency.publicKey,
      seed,
      expiresTs: expires,
      policy: args.policy,
      quoteMint,
      otherMint: demoMint,
      strategyId: strategyIdBytes(args.strategyId ?? null),
    }),
  );
  const source = getAssociatedTokenAddressSync(quoteMint, owner.publicKey);
  const fundSig = await withRetry(() =>
    owners.fund({ owner, seed, mint: quoteMint, amount: args.fund, source }),
  );
  return { seed, mandate: created.mandate, createSig: created.sig, fundSig };
}

export function line(label: string, result: GuardedResult | { sig: string; status?: string; blockedBy?: string }) {
  const status = "status" in result ? result.status : "ok";
  const reason = "blockedBy" in result ? result.blockedBy : undefined;
  const sig = result.sig ?? "";
  console.log(`  ${label}: ${status}${reason ? ` ${reason}` : ""} ${sig}`);
}

export function expectBlocked(result: GuardedResult, reason: string, label: string): string {
  if (result.status !== "blocked" || result.blockedBy !== reason || !result.sig) {
    throw new Error(`${label}: expected blocked ${reason}, got ${result.status} ${result.blockedBy ?? ""} ${result.sig ?? ""}`);
  }
  return result.sig;
}

export function expectExecuted(result: GuardedResult, label: string): string {
  if (result.status !== "executed" || !result.sig) {
    throw new Error(`${label}: expected executed, got ${result.status} ${result.blockedBy ?? result.error ?? ""}`);
  }
  return result.sig;
}

export async function swap(args: {
  operator: Keypair;
  owner: PublicKey;
  seed: bigint;
  amountIn: bigint;
  minOut?: bigint;
  key: string;
}): Promise<GuardedResult> {
  const facts = sprintFacts();
  const ops = opsClient(args.operator);
  const mintIn = new PublicKey(facts.mints.usdcd);
  const mintOut = new PublicKey(facts.mints.demo);
  const quote = await withRetry(() => ops.quoteSwap(mintIn, mintOut, args.amountIn));
  return withRetry(() =>
    ops.proposeSwap({
      owner: args.owner,
      seed: args.seed,
      mintIn,
      mintOut,
      minOut: args.minOut ?? quote.amountOut,
      quote,
      idempotencyKey: args.key,
    }),
  );
}

export async function spend(args: {
  operator: Keypair;
  owner: PublicKey;
  seed: bigint;
  amount: bigint;
  key: string;
}): Promise<GuardedResult> {
  const facts = sprintFacts();
  const connection = sprintConnection();
  const deployer = loadKeypair(join(ROOT, "keys/deployer.json"));
  const treasury = loadKeypair(join(ROOT, "keys/treasury.json"));
  const mint = new PublicKey(facts.mints.usdcd);
  const destination = getAssociatedTokenAddressSync(mint, treasury.publicKey);
  const ataTx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(deployer.publicKey, destination, treasury.publicKey, mint),
  );
  await withRetry(() => sendAndConfirmTransaction(connection, ataTx, [deployer], { commitment: "confirmed" }));
  const ops = opsClient(args.operator);
  return withRetry(() =>
    ops.proposeSpend({
      owner: args.owner,
      seed: args.seed,
      mint,
      destination,
      amount: args.amount,
      memo: "x402:DEMO",
      idempotencyKey: args.key,
    }),
  );
}

export async function deposit(args: {
  operator: Keypair;
  owner: PublicKey;
  seed: bigint;
  amount: bigint;
  key: string;
}): Promise<GuardedResult> {
  const facts = sprintFacts();
  const ops = opsClient(args.operator);
  return withRetry(() =>
    ops.proposeDeposit({
      owner: args.owner,
      seed: args.seed,
      mint: new PublicKey(facts.mints.usdcd),
      amount: args.amount,
      idempotencyKey: args.key,
    }),
  );
}
