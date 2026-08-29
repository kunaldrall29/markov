/**
 * Track C on public Solana devnet: house ticks, fan-out with strategy_id, 11 BlockReasons.
 * Evidence is transaction signatures. Engine ledger is not proof.
 *
 *   bun scripts/chain-sprint.ts ticks
 *   bun scripts/chain-sprint.ts fanout
 *   bun scripts/chain-sprint.ts redteam
 *   bun scripts/chain-sprint.ts revoke
 *   bun scripts/chain-sprint.ts all
 */
import { join } from "node:path";
import { PublicKey } from "@solana/web3.js";
import { MOMENTUM_TEMPLATE, REDTEAM_TEMPLATE, strategyIdFromTemplate } from "../packages/sdk/src/template";
import { loadKeypair } from "../packages/operator/src/keys";
import {
  ROOT,
  createFundedMandate,
  deposit,
  ensureSol,
  expectBlocked,
  expectExecuted,
  fullPolicy,
  houseKey,
  line,
  loadHouseMap,
  momentumPolicy,
  ownersClient,
  sleep,
  spend,
  sprintFacts,
  swap,
  withRetry,
  yieldOnlyPolicy,
  type HouseName,
} from "./chain-kit";

type Row = { name: string; sig: string; reason?: string; strategyId?: string; mandate?: string };

function ownerKp() {
  return loadKeypair(join(ROOT, "keys/owner.json"));
}

function emergencyKp() {
  return loadKeypair(join(ROOT, "keys/emergency.json"));
}

async function ticks(): Promise<Row[]> {
  console.log("# C2 house ticks");
  const owner = ownerKp().publicKey;
  const rows: Row[] = [];
  const names: HouseName[] = ["markov-steady", "markov-momentum", "markov-redteam"];
  for (const name of names) {
    const op = houseKey(name);
    await ensureSol(op);
    const isSteady = name === "markov-steady";
    const funded = await createFundedMandate({
      operator: op.publicKey,
      policy: isSteady ? yieldOnlyPolicy() : momentumPolicy(100_000_000n),
      strategyId: strategyIdFromTemplate(name === "markov-momentum" ? MOMENTUM_TEMPLATE : REDTEAM_TEMPLATE),
      fund: 80_000_000n,
    });
    const result = isSteady
      ? await deposit({ operator: op, owner, seed: funded.seed, amount: 5_000_000n, key: `tick-${name}` })
      : await swap({ operator: op, owner, seed: funded.seed, amountIn: 5_000_000n, key: `tick-${name}` });
    const sig = expectExecuted(result, name);
    line(name, result);
    rows.push({ name, sig, mandate: funded.mandate.toBase58() });
  }
  return rows;
}

async function fanout(): Promise<Row[]> {
  console.log("# C3 fan-out (A-ok, B-ok, C-OverTxCap) same strategy_id");
  const strategyId = strategyIdFromTemplate(MOMENTUM_TEMPLATE);
  const op = houseKey("markov-momentum");
  await ensureSol(op);
  const owner = ownerKp().publicKey;
  const rows: Row[] = [];
  const caps: { label: string; perTx: bigint }[] = [
    { label: "A-ok", perTx: 100_000_000n },
    { label: "B-ok", perTx: 100_000_000n },
    { label: "C-OverTxCap", perTx: 40_000_000n },
  ];
  const mandates: { label: string; seed: bigint; mandate: PublicKey }[] = [];
  for (const cap of caps) {
    const funded = await createFundedMandate({
      operator: op.publicKey,
      policy: momentumPolicy(cap.perTx),
      strategyId,
      fund: 200_000_000n,
    });
    mandates.push({ label: cap.label, seed: funded.seed, mandate: funded.mandate });
    console.log(`  created ${cap.label} ${funded.mandate.toBase58()} perTx=${cap.perTx}`);
  }
  for (const m of mandates) {
    const result = await swap({
      operator: op,
      owner,
      seed: m.seed,
      amountIn: 60_000_000n,
      key: `fanout-${m.label}`,
    });
    line(m.label, result);
    if (m.label === "C-OverTxCap") {
      rows.push({
        name: m.label,
        sig: expectBlocked(result, "OverTxCap", m.label),
        reason: "OverTxCap",
        strategyId,
        mandate: m.mandate.toBase58(),
      });
    } else {
      rows.push({
        name: m.label,
        sig: expectExecuted(result, m.label),
        strategyId,
        mandate: m.mandate.toBase58(),
      });
    }
  }
  return rows;
}

async function redteam(): Promise<Row[]> {
  console.log("# C4 eleven on-chain BlockReasons");
  const red = houseKey("markov-redteam");
  const stranger = houseKey("markov-steady");
  await ensureSol(red);
  await ensureSol(stranger);
  const owner = ownerKp();
  const emergency = emergencyKp();
  await ensureSol(emergency);
  const owners = ownersClient(owner);
  const strategyId = strategyIdFromTemplate(REDTEAM_TEMPLATE);
  const rows: Row[] = [];
  const facts = sprintFacts();

  const live = await createFundedMandate({
    operator: red.publicKey,
    policy: fullPolicy(),
    strategyId,
    fund: 80_000_000n,
  });

  await withRetry(() => owners.pause(emergency, owner.publicKey, live.seed));
  const paused = await swap({ operator: red, owner: owner.publicKey, seed: live.seed, amountIn: 1_000_000n, key: "rt-paused" });
  rows.push({ name: "Paused", sig: expectBlocked(paused, "Paused", "Paused"), reason: "Paused", strategyId });
  line("Paused", paused);
  await withRetry(() => owners.unpause(owner, live.seed));

  const revokedM = await createFundedMandate({
    operator: red.publicKey,
    policy: fullPolicy(),
    strategyId,
    fund: 10_000_000n,
  });
  const revokeSig = await withRetry(() => owners.revoke(emergency, owner.publicKey, revokedM.seed));
  line("revoke-setup", { sig: revokeSig, status: "ok" });
  const revoked = await swap({
    operator: red,
    owner: owner.publicKey,
    seed: revokedM.seed,
    amountIn: 1_000_000n,
    key: "rt-revoked",
  });
  rows.push({ name: "Revoked", sig: expectBlocked(revoked, "Revoked", "Revoked"), reason: "Revoked", strategyId });
  line("Revoked", revoked);

  const expired = await createFundedMandate({
    operator: red.publicKey,
    policy: fullPolicy(),
    strategyId,
    fund: 10_000_000n,
    expiresTs: BigInt(Math.floor(Date.now() / 1000) + 12),
  });
  console.log("  waiting for expiry…");
  await sleep(16_000);
  const expiredSwap = await swap({
    operator: red,
    owner: owner.publicKey,
    seed: expired.seed,
    amountIn: 1_000_000n,
    key: "rt-expired",
  });
  rows.push({ name: "Expired", sig: expectBlocked(expiredSwap, "Expired", "Expired"), reason: "Expired", strategyId });
  line("Expired", expiredSwap);

  const unauth = await swap({
    operator: stranger,
    owner: owner.publicKey,
    seed: live.seed,
    amountIn: 1_000_000n,
    key: "rt-unauth",
  });
  rows.push({
    name: "Unauthorized",
    sig: expectBlocked(unauth, "Unauthorized", "Unauthorized"),
    reason: "Unauthorized",
    strategyId,
  });
  line("Unauthorized", unauth);

  const noSwap = await createFundedMandate({
    operator: red.publicKey,
    policy: {
      ...fullPolicy(),
      programs: [new PublicKey(facts.programs.demoYield), new PublicKey(facts.programs.mandate)],
    },
    strategyId,
    fund: 10_000_000n,
  });
  const programRefused = await swap({
    operator: red,
    owner: owner.publicKey,
    seed: noSwap.seed,
    amountIn: 1_000_000n,
    key: "rt-program",
  });
  rows.push({
    name: "ProgramNotAllowed",
    sig: expectBlocked(programRefused, "ProgramNotAllowed", "ProgramNotAllowed"),
    reason: "ProgramNotAllowed",
    strategyId,
  });
  line("ProgramNotAllowed", programRefused);

  const noDemo = await createFundedMandate({
    operator: red.publicKey,
    policy: {
      ...fullPolicy(),
      tokens: [new PublicKey(facts.mints.usdcd)],
    },
    strategyId,
    fund: 10_000_000n,
  });
  const tokenRefused = await swap({
    operator: red,
    owner: owner.publicKey,
    seed: noDemo.seed,
    amountIn: 1_000_000n,
    key: "rt-token",
  });
  rows.push({
    name: "TokenNotAllowed",
    sig: expectBlocked(tokenRefused, "TokenNotAllowed", "TokenNotAllowed"),
    reason: "TokenNotAllowed",
    strategyId,
  });
  line("TokenNotAllowed", tokenRefused);

  const overTx = await swap({
    operator: red,
    owner: owner.publicKey,
    seed: live.seed,
    amountIn: 11_000_000n,
    key: "rt-overtx",
  });
  rows.push({ name: "OverTxCap", sig: expectBlocked(overTx, "OverTxCap", "OverTxCap"), reason: "OverTxCap", strategyId });
  line("OverTxCap", overTx);

  const dailyOk = await swap({
    operator: red,
    owner: owner.publicKey,
    seed: live.seed,
    amountIn: 8_000_000n,
    key: "rt-daily-ok",
  });
  expectExecuted(dailyOk, "daily-ok");
  line("daily-ok", dailyOk);
  const overDaily = await swap({
    operator: red,
    owner: owner.publicKey,
    seed: live.seed,
    amountIn: 8_000_000n,
    key: "rt-overdaily",
  });
  rows.push({
    name: "OverDailyCap",
    sig: expectBlocked(overDaily, "OverDailyCap", "OverDailyCap"),
    reason: "OverDailyCap",
    strategyId,
  });
  line("OverDailyCap", overDaily);

  const overSpend = await spend({
    operator: red,
    owner: owner.publicKey,
    seed: live.seed,
    amount: 60_000n,
    key: "rt-overspend",
  });
  rows.push({
    name: "OverSpendCap",
    sig: expectBlocked(overSpend, "OverSpendCap", "OverSpendCap"),
    reason: "OverSpendCap",
    strategyId,
  });
  line("OverSpendCap", overSpend);

  const spendOk = await spend({
    operator: red,
    owner: owner.publicKey,
    seed: live.seed,
    amount: 50_000n,
    key: "rt-spend-ok",
  });
  expectExecuted(spendOk, "spend-ok");
  line("spend-ok", spendOk);
  const overSpendDaily = await spend({
    operator: red,
    owner: owner.publicKey,
    seed: live.seed,
    amount: 50_000n,
    key: "rt-overspend-daily",
  });
  rows.push({
    name: "OverSpendDailyCap",
    sig: expectBlocked(overSpendDaily, "OverSpendDailyCap", "OverSpendDailyCap"),
    reason: "OverSpendDailyCap",
    strategyId,
  });
  line("OverSpendDailyCap", overSpendDaily);

  const slip = await swap({
    operator: red,
    owner: owner.publicKey,
    seed: live.seed,
    amountIn: 1_000_000n,
    minOut: 99_000_000n,
    key: "rt-slip",
  });
  rows.push({
    name: "SlippageExceeded",
    sig: expectBlocked(slip, "SlippageExceeded", "SlippageExceeded"),
    reason: "SlippageExceeded",
    strategyId,
  });
  line("SlippageExceeded", slip);

  const missing = [
    "Paused",
    "Revoked",
    "Expired",
    "Unauthorized",
    "ProgramNotAllowed",
    "TokenNotAllowed",
    "OverTxCap",
    "OverDailyCap",
    "OverSpendCap",
    "OverSpendDailyCap",
    "SlippageExceeded",
  ].filter((n) => !rows.some((r) => r.name === n));
  if (missing.length) throw new Error(`redteam missed ${missing.join(", ")}`);
  return rows;
}

async function revokePair(): Promise<Row[]> {
  console.log("# C6 revoke + subsequent Revoked refusal (chain, not phone)");
  const red = houseKey("markov-redteam");
  await ensureSol(red);
  const owner = ownerKp();
  const emergency = emergencyKp();
  const owners = ownersClient(owner);
  const funded = await createFundedMandate({
    operator: red.publicKey,
    policy: fullPolicy(),
    strategyId: strategyIdFromTemplate(REDTEAM_TEMPLATE),
    fund: 10_000_000n,
  });
  const revokeSig = await withRetry(() => owners.revoke(emergency, owner.publicKey, funded.seed));
  line("revoke", { sig: revokeSig, status: "ok" });
  const after = await swap({
    operator: red,
    owner: owner.publicKey,
    seed: funded.seed,
    amountIn: 1_000_000n,
    key: "c6-revoked",
  });
  const refuseSig = expectBlocked(after, "Revoked", "C6-Revoked");
  line("Revoked", after);
  return [
    { name: "revoke", sig: revokeSig, mandate: funded.mandate.toBase58() },
    { name: "Revoked", sig: refuseSig, reason: "Revoked", mandate: funded.mandate.toBase58() },
  ];
}

function printRows(title: string, rows: Row[]) {
  console.log(`\n${title}`);
  for (const row of rows) {
    console.log(
      JSON.stringify({
        name: row.name,
        sig: row.sig,
        reason: row.reason ?? null,
        strategyId: row.strategyId ?? null,
        mandate: row.mandate ?? null,
        explorer: `https://solscan.io/tx/${row.sig}?cluster=devnet`,
      }),
    );
  }
}

async function main() {
  const mode = (Bun.argv[2] ?? "all").toLowerCase();
  loadHouseMap();
  const all: Row[] = [];
  if (mode === "ticks" || mode === "all") all.push(...(await ticks()));
  if (mode === "fanout" || mode === "all") all.push(...(await fanout()));
  if (mode === "redteam" || mode === "all") all.push(...(await redteam()));
  if (mode === "revoke" || mode === "all") all.push(...(await revokePair()));
  printRows("SIGNATURES", all);
  console.log("ok", mode, all.length);
}

await main();
