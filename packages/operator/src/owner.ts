import { AnchorProvider, BN, Program, Wallet, type Idl } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, type TransactionInstruction } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import mandateIdl from "../idl/mandate.json";
import { loadFacts, mandatePda, operatorPda } from "./keys";
import { methods } from "./anchor";

export type ChainPolicy = {
  programs: PublicKey[];
  tokens: PublicKey[];
  perTxCap: bigint;
  dailyCap: bigint;
  spendPerCallCap: bigint;
  spendDailyCap: bigint;
  maxSlippageBps: number;
};

export function encodeStrategyId(id?: Uint8Array | number[] | null): number[] | null {
  if (!id) return null;
  const arr = Array.from(id);
  if (arr.length !== 32) throw new Error("strategy_id must be 32 bytes");
  return arr;
}

export function strategyIdBytes(hex?: string | null): number[] | null {
  if (!hex) return null;
  const h = hex.replace(/^0x/i, "");
  if (h.length !== 64 || /[^0-9a-f]/i.test(h)) throw new Error("strategy_id hex must be 32 bytes");
  const out: number[] = [];
  for (let i = 0; i < 64; i += 2) out.push(Number.parseInt(h.slice(i, i + 2), 16));
  return out;
}

export function isWalletPubkey(value: string): boolean {
  if (value === "owner_demo" || value === "bot_emergency") return false;
  try {
    const pk = new PublicKey(value);
    return PublicKey.isOnCurve(pk.toBytes());
  } catch {
    return false;
  }
}

export function serializeUnsigned(tx: Transaction): string {
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
}

function pad4(keys: PublicKey[]): PublicKey[] {
  const out = [...keys];
  while (out.length < 4) out.push(PublicKey.default);
  return out.slice(0, 4);
}

function encodePolicy(p: ChainPolicy) {
  return {
    programs: pad4(p.programs),
    programLen: p.programs.length,
    tokens: pad4(p.tokens),
    tokenLen: p.tokens.length,
    perTxCap: new BN(p.perTxCap.toString()),
    dailyCap: new BN(p.dailyCap.toString()),
    spendPerCallCap: new BN(p.spendPerCallCap.toString()),
    spendDailyCap: new BN(p.spendDailyCap.toString()),
    maxSlippageBps: p.maxSlippageBps,
  };
}

export class OwnerClient {
  readonly connection: Connection;
  readonly payer: Keypair;
  readonly program: Program;
  readonly facts: NonNullable<ReturnType<typeof loadFacts>>;

  constructor(opts: { payer: Keypair; rpc?: string; factsPath?: string }) {
    const facts = loadFacts(opts.factsPath);
    if (!facts) throw new Error("data/devnet.json missing");
    this.facts = facts;
    this.payer = opts.payer;
    this.connection = new Connection(opts.rpc ?? facts.rpc, "confirmed");
    this.program = new Program(
      mandateIdl as Idl,
      new AnchorProvider(this.connection, new Wallet(this.payer), { commitment: "confirmed" }),
    );
  }

  mandateAddress(owner: PublicKey, seed: bigint): PublicKey {
    return mandatePda(this.program.programId, owner, seed);
  }

  async registerOperator(authority: Keypair, name: string, uri: string, feeBps: number, kind: number) {
    return methods(this.program)
      .registerOperator(name, uri, feeBps, kind)
      .accounts({
        authority: authority.publicKey,
        profile: operatorPda(this.program.programId, authority.publicKey),
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();
  }

  async createMandate(args: {
    owner: Keypair;
    operator: PublicKey;
    emergency: PublicKey;
    seed: bigint;
    expiresTs: bigint;
    policy: ChainPolicy;
    quoteMint: PublicKey;
    otherMint: PublicKey;
    strategyId?: Uint8Array | number[] | null;
  }): Promise<{ sig: string; mandate: PublicKey }> {
    const mandate = mandatePda(this.program.programId, args.owner.publicKey, args.seed);
    const strategyId = encodeStrategyId(args.strategyId);
    const sig = await methods(this.program)
      .createMandate(
        new BN(args.seed.toString()),
        args.emergency,
        new BN(args.expiresTs.toString()),
        encodePolicy(args.policy),
        strategyId,
      )
      .accounts({
        owner: args.owner.publicKey,
        operator: args.operator,
        quoteMint: args.quoteMint,
        otherMint: args.otherMint,
        mandate,
        vaultQuote: getAssociatedTokenAddressSync(args.quoteMint, mandate, true),
        vaultOther: getAssociatedTokenAddressSync(args.otherMint, mandate, true),
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([args.owner])
      .rpc();
    return { sig, mandate };
  }

  async fund(args: { owner: Keypair; seed: bigint; mint: PublicKey; amount: bigint; source: PublicKey }) {
    const mandate = mandatePda(this.program.programId, args.owner.publicKey, args.seed);
    return methods(this.program)
      .fund(new BN(args.amount.toString()))
      .accounts({
        owner: args.owner.publicKey,
        mandate,
        mint: args.mint,
        source: args.source,
        vault: getAssociatedTokenAddressSync(args.mint, mandate, true),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([args.owner])
      .rpc();
  }

  async pause(caller: Keypair, owner: PublicKey, seed: bigint) {
    return methods(this.program)
      .pause()
      .accounts({
        caller: caller.publicKey,
        mandate: mandatePda(this.program.programId, owner, seed),
      })
      .signers([caller])
      .rpc();
  }

  async unpause(owner: Keypair, seed: bigint) {
    return methods(this.program)
      .unpause()
      .accounts({
        owner: owner.publicKey,
        mandate: mandatePda(this.program.programId, owner.publicKey, seed),
      })
      .signers([owner])
      .rpc();
  }

  async revoke(caller: Keypair, owner: PublicKey, seed: bigint) {
    return methods(this.program)
      .revoke()
      .accounts({
        caller: caller.publicKey,
        mandate: mandatePda(this.program.programId, owner, seed),
      })
      .signers([caller])
      .rpc();
  }

  async ownerWithdraw(args: {
    owner: Keypair;
    seed: bigint;
    mint: PublicKey;
    amount: bigint;
    destination: PublicKey;
  }) {
    const mandate = mandatePda(this.program.programId, args.owner.publicKey, args.seed);
    return methods(this.program)
      .ownerWithdraw(new BN(args.amount.toString()))
      .accounts({
        owner: args.owner.publicKey,
        mandate,
        mint: args.mint,
        vault: getAssociatedTokenAddressSync(args.mint, mandate, true),
        destination: args.destination,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([args.owner])
      .rpc();
  }

  async buildCreateAndFund(args: {
    owner: PublicKey;
    operator: PublicKey;
    emergency: PublicKey;
    seed: bigint;
    expiresTs: bigint;
    policy: ChainPolicy;
    quoteMint: PublicKey;
    otherMint: PublicKey;
    strategyId?: Uint8Array | number[] | null;
    fundAmount?: bigint;
    source?: PublicKey;
  }): Promise<Transaction> {
    const mandate = mandatePda(this.program.programId, args.owner, args.seed);
    const ixs = [
      await methods(this.program)
        .createMandate(
          new BN(args.seed.toString()),
          args.emergency,
          new BN(args.expiresTs.toString()),
          encodePolicy(args.policy),
          encodeStrategyId(args.strategyId),
        )
        .accounts({
          owner: args.owner,
          operator: args.operator,
          quoteMint: args.quoteMint,
          otherMint: args.otherMint,
          mandate,
          vaultQuote: getAssociatedTokenAddressSync(args.quoteMint, mandate, true),
          vaultOther: getAssociatedTokenAddressSync(args.otherMint, mandate, true),
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction(),
    ];
    if (args.fundAmount && args.fundAmount > 0n) {
      const source = args.source ?? getAssociatedTokenAddressSync(args.quoteMint, args.owner, false);
      ixs.push(
        createAssociatedTokenAccountIdempotentInstruction(args.owner, source, args.owner, args.quoteMint),
        await methods(this.program)
          .fund(new BN(args.fundAmount.toString()))
          .accounts({
            owner: args.owner,
            mandate,
            mint: args.quoteMint,
            source,
            vault: getAssociatedTokenAddressSync(args.quoteMint, mandate, true),
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .instruction(),
      );
    }
    const tx = new Transaction().add(...ixs);
    const latest = await this.connection.getLatestBlockhash("confirmed");
    tx.feePayer = args.owner;
    tx.recentBlockhash = latest.blockhash;
    return tx;
  }

  async buildPause(caller: PublicKey, owner: PublicKey, seed: bigint): Promise<Transaction> {
    return this.buildSimple(
      caller,
      await methods(this.program)
        .pause()
        .accounts({
          caller,
          mandate: mandatePda(this.program.programId, owner, seed),
        })
        .instruction(),
    );
  }

  async buildUnpause(owner: PublicKey, seed: bigint): Promise<Transaction> {
    return this.buildSimple(
      owner,
      await methods(this.program)
        .unpause()
        .accounts({
          owner,
          mandate: mandatePda(this.program.programId, owner, seed),
        })
        .instruction(),
    );
  }

  async buildRevoke(caller: PublicKey, owner: PublicKey, seed: bigint): Promise<Transaction> {
    return this.buildSimple(
      caller,
      await methods(this.program)
        .revoke()
        .accounts({
          caller,
          mandate: mandatePda(this.program.programId, owner, seed),
        })
        .instruction(),
    );
  }

  async buildWithdraw(args: {
    owner: PublicKey;
    seed: bigint;
    mint: PublicKey;
    amount: bigint;
    destination: PublicKey;
  }): Promise<Transaction> {
    const mandate = mandatePda(this.program.programId, args.owner, args.seed);
    return this.buildSimple(
      args.owner,
      await methods(this.program)
        .ownerWithdraw(new BN(args.amount.toString()))
        .accounts({
          owner: args.owner,
          mandate,
          mint: args.mint,
          vault: getAssociatedTokenAddressSync(args.mint, mandate, true),
          destination: args.destination,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction(),
    );
  }

  private async buildSimple(feePayer: PublicKey, ix: TransactionInstruction): Promise<Transaction> {
    const tx = new Transaction().add(ix);
    const latest = await this.connection.getLatestBlockhash("confirmed");
    tx.feePayer = feePayer;
    tx.recentBlockhash = latest.blockhash;
    return tx;
  }
}
