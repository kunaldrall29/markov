import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
} from "@solana/spl-token";
import { AnchorProvider, BN, Program, Wallet, type Idl } from "@coral-xyz/anchor";
import demoSwapIdl from "../packages/operator/idl/demo_swap.json";
import demoYieldIdl from "../packages/operator/idl/demo_yield.json";
import { loadKeypair, swapPoolPda, yieldPoolPda } from "../packages/operator/src/keys";
import type { DevnetFacts } from "../packages/operator/src/types";
import { fundAccounts } from "./fund-devnet";

const RPC = process.env.MARKOV_RPC ?? "https://api.devnet.solana.com";
const CLUSTER = "devnet";

function sh(cmd: string, args: string[]) {
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed`);
}

async function airdrop(connection: Connection, pk: PublicKey, sol: number) {
  const { airdropOnce } = await import("./fund-devnet");
  for (let i = 0; i < 3; i++) {
    if (await airdropOnce(connection, pk, sol)) return;
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
}

function deploy(program: "mandate" | "demo_swap" | "demo_yield") {
  sh("solana", [
    "program",
    "deploy",
    `target/deploy/${program}.so`,
    "--program-id",
    `keys/${program}.json`,
    "-u",
    RPC,
    "-k",
    "keys/deployer.json",
    "--commitment",
    "confirmed",
  ]);
}

async function createMint(connection: Connection, payer: Keypair, decimals: number): Promise<PublicKey> {
  const mint = Keypair.generate();
  const lamports = await getMinimumBalanceForRentExemptMint(connection);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(mint.publicKey, decimals, payer.publicKey, payer.publicKey),
  );
  await sendAndConfirmTransaction(connection, tx, [payer, mint], { commitment: "confirmed" });
  return mint.publicKey;
}

async function ata(connection: Connection, payer: Keypair, mint: PublicKey, owner: PublicKey, offCurve: boolean) {
  const addr = getAssociatedTokenAddressSync(mint, owner, offCurve);
  const ix = createAssociatedTokenAccountIdempotentInstruction(payer.publicKey, addr, owner, mint);
  await sendAndConfirmTransaction(connection, new Transaction().add(ix), [payer], { commitment: "confirmed" });
  return addr;
}

async function mintTo(connection: Connection, payer: Keypair, mint: PublicKey, dest: PublicKey, amount: bigint) {
  const ix = createMintToInstruction(mint, dest, payer.publicKey, amount);
  await sendAndConfirmTransaction(connection, new Transaction().add(ix), [payer], { commitment: "confirmed" });
}

async function main() {
const connection = new Connection(RPC, "confirmed");
const deployer = loadKeypair("keys/deployer.json");
const owner = loadKeypair("keys/owner.json");
const emergency = loadKeypair("keys/emergency.json");
const opDca = loadKeypair("keys/op_dca.json");

console.log("deployer", deployer.publicKey.toBase58());
const skipFund = process.env.MARKOV_SKIP_FUND === "1";
const skipDeploy = process.env.MARKOV_SKIP_DEPLOY === "1";
const funded = skipFund
  ? await connection.getBalance(deployer.publicKey)
  : await fundAccounts(
      connection,
      deployer,
      [owner.publicKey, emergency.publicKey, opDca.publicKey],
      8,
    );
if (funded < 2 * LAMPORTS_PER_SOL) {
  throw new Error("devnet airdrop could not fund deployer — retry bun run devnet:setup");
}
console.log("deployer SOL", funded / LAMPORTS_PER_SOL);

if (!existsSync("target/deploy/mandate.so")) {
  throw new Error("run anchor build first");
}

if (!skipDeploy) {
  console.log("deploying programs…");
  deploy("demo_swap");
  deploy("demo_yield");
  deploy("mandate");
} else {
  console.log("skipping program deploy (MARKOV_SKIP_DEPLOY=1)");
}

const usdcd = await createMint(connection, deployer, 6);
const demo = await createMint(connection, deployer, 6);
const swapProgram = new PublicKey(JSON.parse(readFileSync("keys/program-ids.json", "utf8")).demo_swap);
const yieldProgram = new PublicKey(JSON.parse(readFileSync("keys/program-ids.json", "utf8")).demo_yield);
const mandateProgram = new PublicKey(JSON.parse(readFileSync("keys/program-ids.json", "utf8")).mandate);

const swapPool = swapPoolPda(swapProgram);
const yieldPool = yieldPoolPda(yieldProgram);
const swapA = await ata(connection, deployer, usdcd, swapPool, true);
const swapB = await ata(connection, deployer, demo, swapPool, true);
const yieldVault = await ata(connection, deployer, usdcd, yieldPool, true);

await mintTo(connection, deployer, usdcd, swapA, 1_000_000n * 1_000_000n);
await mintTo(connection, deployer, demo, swapB, 10_000_000n * 1_000_000n);
await mintTo(connection, deployer, usdcd, yieldVault, 1_000_000n * 1_000_000n);

const ownerUsdcd = await ata(connection, deployer, usdcd, owner.publicKey, false);
const ownerDemo = await ata(connection, deployer, demo, owner.publicKey, false);
const treasury = loadKeypair("keys/treasury.json");
const treasuryUsdcd = await ata(connection, deployer, usdcd, treasury.publicKey, false);
await mintTo(connection, deployer, usdcd, ownerUsdcd, 1_000_000n * 1_000_000n);

const wallet = new Wallet(deployer);
const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
const swap = new Program(demoSwapIdl as Idl, provider);
const yieldProg = new Program(demoYieldIdl as Idl, provider);

await swap.methods
  .initialize(new BN(10), new BN(1), 30)
  .accounts({
    authority: deployer.publicKey,
    mintA: usdcd,
    mintB: demo,
    pool: swapPool,
    vaultA: swapA,
    vaultB: swapB,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

await yieldProg.methods
  .initialize()
  .accounts({
    authority: deployer.publicKey,
    mint: usdcd,
    pool: yieldPool,
    vault: yieldVault,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

const facts: DevnetFacts = {
  cluster: CLUSTER,
  rpc: RPC,
  explorerTx: "https://solscan.io/tx/{sig}?cluster=devnet",
  programs: {
    mandate: mandateProgram.toBase58(),
    demoSwap: swapProgram.toBase58(),
    demoYield: yieldProgram.toBase58(),
  },
  mints: { usdcd: usdcd.toBase58(), demo: demo.toBase58() },
  pools: { swap: swapPool.toBase58(), yield: yieldPool.toBase58() },
  vaults: { swapA: swapA.toBase58(), swapB: swapB.toBase58(), yield: yieldVault.toBase58() },
};

mkdirSync("data", { recursive: true });
writeFileSync("data/devnet.json", JSON.stringify(facts, null, 2) + "\n");
console.log("wrote data/devnet.json");
console.log(facts);
}

if (import.meta.main) {
  await main();
}
