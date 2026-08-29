import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { TOKENS, type Mandate, type MandateEngine, type Policy, type Receipt } from "@markov/engine";
import { explorerTxUrl, markovCluster, rpcUrl } from "@markov/rpc";
import {
  OwnerClient,
  isWalletPubkey,
  loadFacts,
  loadKeypair,
  mandatePda,
  serializeUnsigned,
  strategyIdBytes,
  type ChainPolicy,
} from "@markovfyi/operator";
import { ACTORS } from "./seed";

const ROOT = join(import.meta.dir, "../../..");
const HOUSE_PATH = join(ROOT, "data/house-operators.json");
const FACTS_PATH = join(ROOT, "data/devnet.json");
const DEPLOYER_KEY = join(ROOT, "keys/deployer.json");
const OPERATOR_KEY = join(ROOT, "keys/op_dca.json");
const EMERGENCY_KEY = join(ROOT, "keys/emergency.json");
const FAUCET_AMOUNT = 1_000 * 1_000_000;
const faucetAt = new Map<string, number>();

type RpcCache = { at: number; ok: boolean; slot: number | null };
const rpcCache: RpcCache = { at: 0, ok: false, slot: null };

async function probeRpc(): Promise<RpcCache> {
  try {
    const slot = await new Connection(rpcUrl(), "confirmed").getSlot("confirmed");
    rpcCache.at = Date.now();
    rpcCache.ok = true;
    rpcCache.slot = slot;
  } catch {
    rpcCache.at = Date.now();
    rpcCache.ok = false;
    rpcCache.slot = null;
  }
  return rpcCache;
}

void probeRpc();
setInterval(() => void probeRpc(), 10_000);

export function houseOperatorPubkey(name: string): PublicKey {
  if (existsSync(HOUSE_PATH)) {
    const map = JSON.parse(readFileSync(HOUSE_PATH, "utf8")) as Record<string, string>;
    const pk = map[name];
    if (pk) return new PublicKey(pk);
  }
  if (existsSync(OPERATOR_KEY)) return loadKeypair(OPERATOR_KEY).publicKey;
  throw new Error(`unknown house operator ${name}`);
}

export function emergencyPubkey(): PublicKey {
  if (existsSync(HOUSE_PATH)) {
    const map = JSON.parse(readFileSync(HOUSE_PATH, "utf8")) as Record<string, string>;
    if (map.emergency) return new PublicKey(map.emergency);
  }
  return loadKeypair(EMERGENCY_KEY).publicKey;
}

export function chainReady(): boolean {
  if (markovCluster() === "mainnet-beta") return false;
  if (!existsSync(FACTS_PATH)) return false;
  return rpcCache.ok;
}

export async function chainHealth(): Promise<{
  chainReady: boolean;
  rpcOk: boolean;
  slot: number | null;
}> {
  if (Date.now() - rpcCache.at > 15_000) await probeRpc();
  return { chainReady: chainReady(), rpcOk: rpcCache.ok, slot: rpcCache.slot };
}

export type ChainIntent =
  | {
      action: "subscribe";
      seed: string;
      operator: string;
      strategyId: string | null;
      ttlSecs: number;
      fundAmount: number;
      policy: Policy;
    }
  | { action: "pause" | "unpause" | "revoke"; mandateId: string }
  | { action: "withdraw"; mandateId: string; amount: number };

export type ChainBuild = {
  mode: "chain";
  tx: string;
  intent: ChainIntent;
  mandate?: string;
  seed?: string;
};

export { isWalletPubkey };

function loadEmergencyKeypair(): Keypair {
  const raw = process.env.EMERGENCY_KEY_JSON?.trim();
  if (raw) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw) as number[]));
  return loadKeypair(EMERGENCY_KEY);
}

function factsOrThrow() {
  const facts = loadFacts(FACTS_PATH);
  if (!facts) throw new Error("data/devnet.json missing");
  return facts;
}

function client(): OwnerClient {
  return new OwnerClient({ payer: Keypair.generate(), rpc: rpcUrl(), factsPath: FACTS_PATH });
}

function chainPolicy(policy: Policy): ChainPolicy {
  const facts = factsOrThrow();
  const programs = policy.programAllowlist.map((id) => {
    if (id === "demo_swap") return new PublicKey(facts.programs.demoSwap);
    if (id === "demo_yield") return new PublicKey(facts.programs.demoYield);
    if (id === "x402") return new PublicKey(facts.programs.mandate);
    return new PublicKey(id);
  });
  const tokens = policy.tokenAllowlist.map((id) => {
    if (id === TOKENS.usdcd) return new PublicKey(facts.mints.usdcd);
    if (id === TOKENS.demo) return new PublicKey(facts.mints.demo);
    return new PublicKey(id);
  });
  return {
    programs,
    tokens,
    perTxCap: BigInt(policy.perTxCap),
    dailyCap: BigInt(policy.dailyCap),
    spendPerCallCap: BigInt(policy.spendPerCallCap),
    spendDailyCap: BigInt(policy.spendDailyCap),
    maxSlippageBps: policy.maxSlippageBps,
  };
}

function stamp(receipt: Receipt, sig: string): Receipt {
  const explorerUrl = explorerTxUrl(sig);
  Object.assign(receipt, { sig, explorerUrl });
  return receipt;
}

function mandateByChain(engine: MandateEngine, pubkey: string): Mandate | undefined {
  return [...engine.mandates.values()].find((m) => m.chain?.pubkey === pubkey);
}

export async function buildSubscribe(
  owner: string,
  args: {
    operator: string;
    strategyId: string | null;
    ttlSecs: number;
    fundAmount: number;
    policy: Policy;
  },
): Promise<ChainBuild> {
  if (!isWalletPubkey(owner)) throw new Error("wallet required for on-chain subscribe");
  const facts = factsOrThrow();
  const ownerPk = new PublicKey(owner);
  const operator = houseOperatorPubkey(args.operator);
  const emergency = emergencyPubkey();
  const seed = BigInt(Date.now());
  const owners = client();
  const tx = await owners.buildCreateAndFund({
    owner: ownerPk,
    operator,
    emergency,
    seed,
    expiresTs: BigInt(Math.floor(Date.now() / 1000) + args.ttlSecs),
    policy: chainPolicy(args.policy),
    quoteMint: new PublicKey(facts.mints.usdcd),
    otherMint: new PublicKey(facts.mints.demo),
    strategyId: strategyIdBytes(args.strategyId),
    fundAmount: args.fundAmount > 0 ? BigInt(args.fundAmount) : 0n,
  });
  const pda = mandatePda(new PublicKey(facts.programs.mandate), ownerPk, seed);
  return {
    mode: "chain",
    tx: serializeUnsigned(tx),
    mandate: pda.toBase58(),
    seed: seed.toString(),
    intent: {
      action: "subscribe",
      seed: seed.toString(),
      operator: args.operator,
      strategyId: args.strategyId,
      ttlSecs: args.ttlSecs,
      fundAmount: args.fundAmount,
      policy: args.policy,
    },
  };
}

export async function buildMandateTx(
  engine: MandateEngine,
  actor: string,
  mandateId: string,
  action: "pause" | "unpause" | "revoke" | "withdraw",
  amount?: number,
): Promise<ChainBuild> {
  const m = engine.mandate(mandateId);
  if (!m.chain) throw new Error("mandate has no on-chain binding");
  if (!isWalletPubkey(actor) && actor !== ACTORS.emergency) throw new Error("wallet or emergency bot required");
  if (action !== "pause" && action !== "revoke" && actor !== m.owner) {
    throw new Error("only owner can unpause or withdraw");
  }
  if ((action === "pause" || action === "revoke") && actor !== m.owner && actor !== ACTORS.emergency) {
    throw new Error("only owner or emergency can pause or revoke");
  }
  const ownerPk = new PublicKey(m.owner);
  const seed = BigInt(m.chain.seed);
  const facts = factsOrThrow();
  const owners = client();
  const caller = actor === ACTORS.emergency ? emergencyPubkey() : new PublicKey(actor);
  let tx: Transaction;
  if (action === "pause") tx = await owners.buildPause(caller, ownerPk, seed);
  else if (action === "unpause") tx = await owners.buildUnpause(ownerPk, seed);
  else if (action === "revoke") tx = await owners.buildRevoke(caller, ownerPk, seed);
  else {
    const mint = new PublicKey(facts.mints.usdcd);
    tx = await owners.buildWithdraw({
      owner: ownerPk,
      seed,
      mint,
      amount: BigInt(amount ?? 0),
      destination: getAssociatedTokenAddressSync(mint, ownerPk, false),
    });
  }
  return {
    mode: "chain",
    tx: serializeUnsigned(tx),
    mandate: m.chain.pubkey,
    seed: m.chain.seed,
    intent:
      action === "withdraw"
        ? { action, mandateId, amount: amount ?? 0 }
        : { action, mandateId },
  };
}

async function confirmedTx(sig: string) {
  const facts = factsOrThrow();
  const connection = new Connection(rpcUrl(), "confirmed");
  const tx = await connection.getTransaction(sig, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx || tx.meta?.err) throw new Error("transaction not confirmed");
  return { connection, facts };
}

export async function confirmChain(
  engine: MandateEngine,
  actor: string,
  sig: string,
  intent: ChainIntent,
): Promise<{ mandate: Mandate; receipts: Receipt[] }> {
  const { connection, facts } = await confirmedTx(sig);
  if (intent.action === "subscribe") {
    if (!isWalletPubkey(actor)) throw new Error("wallet required");
    const ownerPk = new PublicKey(actor);
    const seed = BigInt(intent.seed);
    const pda = mandatePda(new PublicKey(facts.programs.mandate), ownerPk, seed);
    const info = await connection.getAccountInfo(pda, "confirmed");
    if (!info || info.owner.toBase58() !== facts.programs.mandate) {
      throw new Error("on-chain mandate missing");
    }
    const existing = mandateByChain(engine, pda.toBase58());
    if (existing) return { mandate: existing, receipts: engine.receipts.filter((r) => "mandateId" in r && r.mandateId === existing.id) };
    const created = engine.createMandate({
      owner: actor,
      operator: intent.operator,
      emergencyKey: ACTORS.emergency,
      policy: intent.policy,
      ttlSecs: intent.ttlSecs,
      strategyId: intent.strategyId,
      chain: { seed: intent.seed, pubkey: pda.toBase58() },
    });
    stamp(engine.receipts[engine.receipts.length - 1]!, sig);
    const vault = getAssociatedTokenAddressSync(new PublicKey(facts.mints.usdcd), pda, true);
    try {
      const bal = await connection.getTokenAccountBalance(vault);
      const amount = Number(bal.value.amount);
      if (amount > 0) stamp(engine.fund(created.id, actor, TOKENS.usdcd, amount), sig);
    } catch {
      /* vault may be empty if subscribe skipped fund */
    }
    return {
      mandate: engine.mandate(created.id),
      receipts: engine.receipts.filter((r) => "mandateId" in r && r.mandateId === created.id),
    };
  }

  const m = engine.mandate(intent.mandateId);
  if (!m.chain) throw new Error("mandate has no on-chain binding");
  let receipt: Receipt;
  if (intent.action === "pause") receipt = engine.pause(intent.mandateId, actor);
  else if (intent.action === "unpause") receipt = engine.unpause(intent.mandateId, actor);
  else if (intent.action === "revoke") receipt = engine.revoke(intent.mandateId, actor);
  else if (intent.action === "withdraw") {
    receipt = engine.ownerWithdraw(intent.mandateId, actor, TOKENS.usdcd, intent.amount);
  } else {
    throw new Error("unknown chain intent");
  }
  stamp(receipt, sig);
  return { mandate: engine.mandate(intent.mandateId), receipts: [receipt] };
}

/** Emergency bot signs pause/revoke on-chain, then the engine follows. */
export async function emergencyChain(
  engine: MandateEngine,
  mandateId: string,
  action: "pause" | "revoke",
): Promise<Receipt | null> {
  const m = engine.mandate(mandateId);
  if (!m.chain || (!existsSync(EMERGENCY_KEY) && !process.env.EMERGENCY_KEY_JSON?.trim())) return null;
  const emergency = loadEmergencyKeypair();
  const owners = new OwnerClient({ payer: emergency, rpc: rpcUrl(), factsPath: FACTS_PATH });
  const ownerPk = new PublicKey(m.owner);
  const seed = BigInt(m.chain.seed);
  const sig =
    action === "pause"
      ? await owners.pause(emergency, ownerPk, seed)
      : await owners.revoke(emergency, ownerPk, seed);
  const receipt = action === "pause" ? engine.pause(mandateId, ACTORS.emergency) : engine.revoke(mandateId, ACTORS.emergency);
  stamp(receipt, sig);
  return receipt;
}

export async function faucetDemoUsdcd(owner: string): Promise<{ sig: string; amount: number; explorerUrl: string }> {
  if (markovCluster() === "mainnet-beta") throw new Error("faucet disabled on mainnet");
  if (!isWalletPubkey(owner)) throw new Error("wallet required");
  if (!existsSync(DEPLOYER_KEY)) throw new Error("deployer key missing");
  const now = Date.now();
  const prev = faucetAt.get(owner) ?? 0;
  if (now - prev < 60_000) throw new Error("faucet cooldown");
  faucetAt.set(owner, now);
  const facts = factsOrThrow();
  const deployer = loadKeypair(DEPLOYER_KEY);
  const ownerPk = new PublicKey(owner);
  const mint = new PublicKey(facts.mints.usdcd);
  const dest = getAssociatedTokenAddressSync(mint, ownerPk, false);
  const connection = new Connection(facts.rpc, "confirmed");
  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(deployer.publicKey, dest, ownerPk, mint),
    createMintToInstruction(mint, dest, deployer.publicKey, FAUCET_AMOUNT, [], TOKEN_PROGRAM_ID),
  );
  const sig = await sendAndConfirmTransaction(connection, tx, [deployer], { commitment: "confirmed" });
  return { sig, amount: FAUCET_AMOUNT, explorerUrl: explorerTxUrl(sig) };
}
