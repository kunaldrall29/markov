import { AnchorProvider, BN, EventParser, Program, Wallet, type Idl } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import mandateIdl from "../idl/mandate.json";
import demoSwapIdl from "../idl/demo_swap.json";
import { variantName, type BlockReason, type GuardedResult, type Quote } from "./types";
import { loadFacts, mandatePda } from "./keys";
import { accounts, methods } from "./anchor";

export class OperatorClient {
  readonly connection: Connection;
  readonly operator: Keypair;
  readonly program: Program;
  readonly swapProgram: Program;
  readonly facts: NonNullable<ReturnType<typeof loadFacts>>;
  readonly maxQuoteAgeMs: number;
  private readonly seen = new Map<string, GuardedResult>();
  private halted: BlockReason | null = null;

  constructor(opts: { operator: Keypair; rpc?: string; factsPath?: string; maxQuoteAgeMs?: number }) {
    const facts = loadFacts(opts.factsPath);
    if (!facts) throw new Error("data/devnet.json missing — run bun run devnet:setup");
    this.facts = facts;
    this.operator = opts.operator;
    this.maxQuoteAgeMs = opts.maxQuoteAgeMs ?? 5_000;
    this.connection = new Connection(opts.rpc ?? facts.rpc, "confirmed");
    const provider = new AnchorProvider(this.connection, new Wallet(this.operator), {
      commitment: "confirmed",
    });
    this.program = new Program(mandateIdl as Idl, provider);
    this.swapProgram = new Program(demoSwapIdl as Idl, provider);
  }

  // Intentionally no withdraw. Operators cannot pull funds.

  async quoteSwap(mintIn: PublicKey, mintOut: PublicKey, amountIn: bigint): Promise<Quote> {
    const pool = await accounts(this.swapProgram).pool.fetch(new PublicKey(this.facts.pools.swap));
    const feeBps = BigInt(pool.feeBps as number);
    const net = amountIn - (amountIn * feeBps) / 10_000n;
    const mintA = (pool.mintA as PublicKey).toBase58();
    const rateNum = BigInt((pool.rateNum as { toString(): string }).toString());
    const rateDen = BigInt((pool.rateDen as { toString(): string }).toString());
    const amountOut = mintIn.toBase58() === mintA ? (net * rateNum) / rateDen : (net * rateDen) / rateNum;
    return { mintIn: mintIn.toBase58(), mintOut: mintOut.toBase58(), amountIn, amountOut, atMs: Date.now() };
  }

  async refreshIfStale(quote: Quote, mintIn: PublicKey, mintOut: PublicKey): Promise<Quote> {
    if (Date.now() - quote.atMs <= this.maxQuoteAgeMs) return quote;
    return this.quoteSwap(mintIn, mintOut, quote.amountIn);
  }

  async proposeSwap(args: {
    owner: PublicKey;
    seed: bigint;
    mintIn: PublicKey;
    mintOut: PublicKey;
    minOut: bigint;
    quote: Quote;
    idempotencyKey: string;
  }): Promise<GuardedResult> {
    const hit = this.cached(args.idempotencyKey);
    if (hit) return hit;
    if (this.halted) return { status: "blocked", sig: "", blockedBy: this.halted };
    const quote = await this.refreshIfStale(args.quote, args.mintIn, args.mintOut);
    const mandate = mandatePda(this.program.programId, args.owner, args.seed);
    const aToB = args.mintIn.toBase58() === this.facts.mints.usdcd;
    const result = await this.send(() =>
      methods(this.program)
        .executeSwap(new BN(quote.amountIn.toString()), new BN(args.minOut.toString()))
        .accounts({
          caller: this.operator.publicKey,
          mandate,
          mintIn: args.mintIn,
          mintOut: args.mintOut,
          vaultIn: getAssociatedTokenAddressSync(args.mintIn, mandate, true),
          vaultOut: getAssociatedTokenAddressSync(args.mintOut, mandate, true),
          swapProgram: new PublicKey(this.facts.programs.demoSwap),
          pool: new PublicKey(this.facts.pools.swap),
          poolSource: new PublicKey(aToB ? this.facts.vaults.swapA : this.facts.vaults.swapB),
          poolDest: new PublicKey(aToB ? this.facts.vaults.swapB : this.facts.vaults.swapA),
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc(),
    );
    return this.remember(args.idempotencyKey, result);
  }

  async proposeDeposit(args: {
    owner: PublicKey;
    seed: bigint;
    mint: PublicKey;
    amount: bigint;
    idempotencyKey: string;
  }): Promise<GuardedResult> {
    const hit = this.cached(args.idempotencyKey);
    if (hit) return hit;
    if (this.halted) return { status: "blocked", sig: "", blockedBy: this.halted };
    const mandate = mandatePda(this.program.programId, args.owner, args.seed);
    const result = await this.send(() =>
      methods(this.program)
        .executeDeposit(new BN(args.amount.toString()))
        .accounts({
          caller: this.operator.publicKey,
          mandate,
          mint: args.mint,
          vault: getAssociatedTokenAddressSync(args.mint, mandate, true),
          yieldProgram: new PublicKey(this.facts.programs.demoYield),
          pool: new PublicKey(this.facts.pools.yield),
          poolVault: new PublicKey(this.facts.vaults.yield),
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc(),
    );
    return this.remember(args.idempotencyKey, result);
  }

  async proposeSpend(args: {
    owner: PublicKey;
    seed: bigint;
    mint: PublicKey;
    destination: PublicKey;
    amount: bigint;
    memo: string;
    idempotencyKey: string;
  }): Promise<GuardedResult> {
    const hit = this.cached(args.idempotencyKey);
    if (hit) return hit;
    if (this.halted) return { status: "blocked", sig: "", blockedBy: this.halted };
    const mandate = mandatePda(this.program.programId, args.owner, args.seed);
    const result = await this.send(() =>
      methods(this.program)
        .spend(new BN(args.amount.toString()), args.memo)
        .accounts({
          caller: this.operator.publicKey,
          mandate,
          mint: args.mint,
          vault: getAssociatedTokenAddressSync(args.mint, mandate, true),
          destination: args.destination,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc(),
    );
    return this.remember(args.idempotencyKey, result);
  }

  async paidFetch<T>(
    spend: {
      owner: PublicKey;
      seed: bigint;
      mint: PublicKey;
      destination: PublicKey;
      amount: bigint;
      memo: string;
      idempotencyKey: string;
    },
    url: string,
  ): Promise<{ pay: GuardedResult; data: T | null }> {
    const pay = await this.proposeSpend(spend);
    if (pay.status !== "executed") return { pay, data: null };
    try {
      const res = await fetch(url);
      if (!res.ok) return { pay, data: null };
      return { pay, data: (await res.json()) as T };
    } catch {
      return { pay, data: null };
    }
  }

  private cached(key: string): GuardedResult | undefined {
    const prev = this.seen.get(key);
    if (prev && prev.status !== "failed") return prev;
    return undefined;
  }

  private remember(key: string, result: GuardedResult): GuardedResult {
    this.seen.set(key, result);
    if (result.status === "blocked" && result.blockedBy === "Revoked") this.halted = "Revoked";
    return result;
  }

  private async send(rpc: () => Promise<string>): Promise<GuardedResult> {
    try {
      const sig = await rpc();
      const tx = await this.connection.getTransaction(sig, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      return this.parseLogs(tx?.meta?.logMessages ?? [], sig);
    } catch (err) {
      return { status: "failed", error: err instanceof Error ? err.message : String(err) };
    }
  }

  private parseLogs(logs: string[], sig: string): GuardedResult {
    const parser = new EventParser(this.program.programId, this.program.coder);
    try {
      for (const ev of parser.parseLogs(logs)) {
        const name = ev.name.toLowerCase();
        if (name === "actionrefused") {
          const blockedBy = variantName(ev.data.reason);
          if (blockedBy === "Revoked") this.halted = "Revoked";
          return { status: "blocked", sig, blockedBy };
        }
        if (name === "actionexecuted") return { status: "executed", sig };
      }
    } catch {
      /* log scrape below */
    }
    const blob = logs.join("\n");
    for (const reason of [
      "OverTxCap",
      "OverDailyCap",
      "OverSpendCap",
      "OverSpendDailyCap",
      "ProgramNotAllowed",
      "TokenNotAllowed",
      "SlippageExceeded",
      "Expired",
      "Paused",
      "Revoked",
      "Unauthorized",
    ] as BlockReason[]) {
      if (blob.includes(reason)) {
        if (reason === "Revoked") this.halted = "Revoked";
        return { status: "blocked", sig, blockedBy: reason };
      }
    }
    return { status: "executed", sig };
  }
}
