import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { OperatorClient } from "../packages/operator/src/operator";
import { OwnerClient } from "../packages/operator/src/owner";
import { explorerTxUrl, type GuardedResult } from "../packages/operator/src/types";
import { loadFacts, loadKeypair } from "../packages/operator/src/keys";

export type ChainReceipt = {
  type: string;
  sig: string;
  explorerUrl: string;
  reason?: string;
  status?: string;
};

export type ChainFourBeat = {
  mandate: string;
  beats: { name: string; receipts: ChainReceipt[] }[];
};

function asReceipt(type: string, result: GuardedResult | { sig: string }): ChainReceipt {
  if ("status" in result) {
    return {
      type,
      sig: result.sig ?? "",
      explorerUrl: result.sig ? explorerTxUrl(result.sig) : "",
      reason: result.status === "blocked" ? result.blockedBy : undefined,
      status: result.status,
    };
  }
  return { type, sig: result.sig, explorerUrl: explorerTxUrl(result.sig), status: "executed" };
}

function line(label: string, result: GuardedResult | { sig: string }) {
  const r = asReceipt(label, result);
  console.log(
    `  ${label}: ${r.status ?? "executed"}${r.reason ? ` ${r.reason}` : ""}${r.explorerUrl ? ` ${r.explorerUrl}` : ""}`,
  );
}

export async function runFourBeatDevnet(): Promise<ChainFourBeat> {
  const facts = loadFacts();
  if (!facts) throw new Error("run bun run devnet:setup first");

  const owner = loadKeypair("keys/owner.json");
  const emergency = loadKeypair("keys/emergency.json");
  const operator = loadKeypair("keys/op_dca.json");
  const treasury = loadKeypair("keys/treasury.json");
  const seed = BigInt(Date.now());
  const quoteMint = new PublicKey(facts.mints.usdcd);
  const demoMint = new PublicKey(facts.mints.demo);
  const connection = new Connection(facts.rpc, "confirmed");

  const owners = new OwnerClient({ payer: owner });
  const ops = new OperatorClient({ operator });

  const expires = BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 3600);
  const created = await owners.createMandate({
    owner,
    operator: operator.publicKey,
    emergency: emergency.publicKey,
    seed,
    expiresTs: expires,
    quoteMint,
    otherMint: demoMint,
    policy: {
      programs: [
        new PublicKey(facts.programs.demoSwap),
        new PublicKey(facts.programs.demoYield),
        new PublicKey(facts.programs.mandate),
      ],
      tokens: [quoteMint, demoMint],
      perTxCap: 25_000_000n,
      dailyCap: 100_000_000n,
      spendPerCallCap: 100_000n,
      spendDailyCap: 400_000n,
      maxSlippageBps: 80,
    },
  });
  const source = getAssociatedTokenAddressSync(quoteMint, owner.publicKey);
  const dest = getAssociatedTokenAddressSync(quoteMint, owner.publicKey);
  const payDest = getAssociatedTokenAddressSync(quoteMint, treasury.publicKey);

  console.log("four-beat devnet");
  console.log("mandate", created.mandate.toBase58());

  const funded = await owners.fund({ owner, seed, mint: quoteMint, amount: 80_000_000n, source });
  console.log("\n# fund");
  line("fund", { sig: funded });

  console.log("\n# agent-under-policy");
  const pay = await ops.paidFetch(
    {
      owner: owner.publicKey,
      seed,
      mint: quoteMint,
      destination: payDest,
      amount: 20_000n,
      memo: "x402:DEMO",
      idempotencyKey: `pay-${seed}-1`,
    },
    "data:application/json,{\"ok\":true}",
  );
  line("spend", pay.pay);
  const quote = await ops.quoteSwap(quoteMint, demoMint, 8_000_000n);
  const swap = await ops.proposeSwap({
    owner: owner.publicKey,
    seed,
    mintIn: quoteMint,
    mintOut: demoMint,
    minOut: quote.amountOut,
    quote,
    idempotencyKey: `swap-${seed}-ok`,
  });
  line("swap", swap);

  console.log("\n# over-cap-refused");
  const pay2 = await ops.proposeSpend({
    owner: owner.publicKey,
    seed,
    mint: quoteMint,
    destination: payDest,
    amount: 20_000n,
    memo: "x402:DEMO",
    idempotencyKey: `pay-${seed}-2`,
  });
  line("spend", pay2);
  const quoteOver = await ops.quoteSwap(quoteMint, demoMint, 30_000_000n);
  const over = await ops.proposeSwap({
    owner: owner.publicKey,
    seed,
    mintIn: quoteMint,
    mintOut: demoMint,
    minOut: quoteOver.amountOut,
    quote: quoteOver,
    idempotencyKey: `swap-${seed}-over`,
  });
  line("swap-over", over);

  console.log("\n# revoke-mid-flight");
  const revoked = await owners.revoke(emergency, owner.publicKey, seed);
  line("revoke", { sig: revoked });
  const quoteAfter = await ops.quoteSwap(quoteMint, demoMint, 1_000_000n);
  const after = await ops.proposeSwap({
    owner: owner.publicKey,
    seed,
    mintIn: quoteMint,
    mintOut: demoMint,
    minOut: quoteAfter.amountOut,
    quote: quoteAfter,
    idempotencyKey: `swap-${seed}-revoked`,
  });
  line("swap-after-revoke", after);

  const vault = getAssociatedTokenAddressSync(quoteMint, created.mandate, true);
  const bal = await connection.getTokenAccountBalance(vault);
  const left = BigInt(bal.value.amount);
  const withdrew = await owners.ownerWithdraw({
    owner,
    seed,
    mint: quoteMint,
    amount: left > 0n ? left : 1n,
    destination: dest,
  });
  line("owner-withdraw", { sig: withdrew });

  if (over.status !== "blocked" || over.blockedBy !== "OverTxCap") {
    throw new Error(`expected OverTxCap refusal, got ${over.status} ${over.blockedBy ?? ""}`);
  }
  if (after.status !== "blocked" || after.blockedBy !== "Revoked") {
    throw new Error(`expected Revoked refusal, got ${after.status} ${after.blockedBy ?? ""}`);
  }

  const beats = [
    { name: "fund", receipts: [asReceipt("MandateFunded", { sig: funded })] },
    {
      name: "agent-under-policy",
      receipts: [asReceipt("ActionExecuted", pay.pay), asReceipt("ActionExecuted", swap)],
    },
    {
      name: "over-cap-refused",
      receipts: [asReceipt("ActionExecuted", pay2), asReceipt("ActionRefused", over)],
    },
    {
      name: "revoke-mid-flight",
      receipts: [asReceipt("Revoked", { sig: revoked }), asReceipt("ActionRefused", after)],
    },
    { name: "owner-withdraw", receipts: [asReceipt("OwnerWithdrew", { sig: withdrew })] },
  ];

  console.log("\nok — funded, acted, refused over_cap, revoked mid-flight, owner withdrew");
  console.log("mandate", created.mandate.toBase58());
  return { mandate: created.mandate.toBase58(), beats };
}

if (import.meta.main) {
  await runFourBeatDevnet();
}
