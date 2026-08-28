import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Intent, Policy } from "@markov/engine";
import { TOKENS } from "@markov/engine";
import { createMandateFromTemplate } from "@markov/sdk";
import {
  assertMainnetAllowed,
  engineDemoAllowed,
  explorerTxUrl,
  isLoopbackHost,
  listenHost,
  markovCluster,
  rpcHost,
  sha256Hex,
} from "@markov/rpc";
import { behindProxy, mutationAllowed, requestActor, treatAsPublic } from "./auth";
import { verifyWalletAuth } from "./wallet-auth";
import { fanOut, fanOutSwap, tickMomentum, tickSteady } from "./agents";
import { fetchPrice } from "./data";
import { runFourBeat } from "./four-beat";
import { exerciseAllBlockReasons } from "./redteam";
import { ACTORS, DEMO_POLICY, publishedStrategies, seed, strategyById } from "./seed";
import { operatorStats, pnlQuote, capProximity, strategyStats } from "./stats";
import { runStrategyVaultDemo } from "./strategy-vault";
import { loadEngine, persist } from "./store";
import {
  buildMandateTx,
  buildSubscribe,
  chainReady,
  confirmChain,
  emergencyChain,
  faucetDemoUsdcd,
  isWalletPubkey,
} from "./chain";

const ROOT = join(import.meta.dir, "../../..");
const DEVNET_FACTS = join(ROOT, "data/devnet.json");
const OWNER_KEY = join(ROOT, "keys/owner.json");
const MAX_FUND = 10_000 * 1_000_000;
const FOUR_BEAT_COOLDOWN_MS = 10_000;
let lastFourBeatAt = 0;
let fourBeatBusy = false;
let lastVaultAt = 0;

assertMainnetAllowed();

const engine = loadEngine();
seed(engine);
persist(engine);

const WEB_ORIGINS = [
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  ...[process.env.WEB_ORIGIN, process.env.CORS_ORIGINS]
    .flatMap((raw) => (raw ?? "").split(","))
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean),
];

function corsOrigin(origin: string): string | undefined {
  if (WEB_ORIGINS.includes(origin)) return origin;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") return undefined;
    if (url.hostname === "markov.fyi" || url.hostname.endsWith(".markov.fyi")) return origin;
    if (url.hostname.endsWith(".vercel.app")) return origin;
  } catch {
    return undefined;
  }
  return undefined;
}

type Vars = { actor: string };
const app = new Hono<{ Variables: Vars }>();
app.use(
  "*",
  cors({
    origin: (origin) => corsOrigin(origin),
    allowHeaders: ["content-type", "x-actor", "x-api-key", "x-owner-ts", "x-owner-sig"],
  }),
);

function actor(c: { get: (k: "actor") => string }) {
  return c.get("actor");
}

function tightenPolicy(incoming: unknown): Policy {
  if (!incoming || typeof incoming !== "object") return { ...DEMO_POLICY };
  const body = incoming as Record<string, unknown>;
  const perTx = Number(body.perTxCap);
  const daily = Number(body.dailyCap);
  const spendCall = Number(body.spendPerCallCap);
  const spendDaily = Number(body.spendDailyCap);
  const slip = Number(body.maxSlippageBps);
  return {
    ...DEMO_POLICY,
    perTxCap: Number.isFinite(perTx) && perTx > 0 ? Math.min(perTx, DEMO_POLICY.perTxCap) : DEMO_POLICY.perTxCap,
    dailyCap: Number.isFinite(daily) && daily > 0 ? Math.min(daily, DEMO_POLICY.dailyCap) : DEMO_POLICY.dailyCap,
    spendPerCallCap:
      Number.isFinite(spendCall) && spendCall > 0
        ? Math.min(spendCall, DEMO_POLICY.spendPerCallCap)
        : DEMO_POLICY.spendPerCallCap,
    spendDailyCap:
      Number.isFinite(spendDaily) && spendDaily > 0
        ? Math.min(spendDaily, DEMO_POLICY.spendDailyCap)
        : DEMO_POLICY.spendDailyCap,
    maxSlippageBps:
      Number.isFinite(slip) && slip >= 0 ? Math.min(slip, DEMO_POLICY.maxSlippageBps) : DEMO_POLICY.maxSlippageBps,
  };
}

function factsHost(rpc?: string) {
  if (!rpc) return rpcHost();
  try {
    return new URL(rpc).host;
  } catch {
    return "invalid-rpc";
  }
}

function stampExplorer(
  local: ReturnType<typeof runFourBeat>,
  chain: { beats: { name: string; receipts: { type: string; sig: string; explorerUrl: string; reason?: string }[] }[] },
) {
  const queue = chain.beats.flatMap((b) => b.receipts);
  for (const beat of local.beats) {
    for (const receipt of beat.receipts) {
      const idx = queue.findIndex((q) => q.type === receipt.type);
      if (idx < 0) continue;
      const [hit] = queue.splice(idx, 1);
      if (!hit) continue;
      (receipt as { sig?: string; explorerUrl?: string }).sig = hit.sig;
      (receipt as { sig?: string; explorerUrl?: string }).explorerUrl = hit.explorerUrl || explorerTxUrl(hit.sig);
    }
  }
}

function cappedAmount(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(n, MAX_FUND);
}

app.use("*", async (c, next) => {
  const method = c.req.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();
  const body = new Uint8Array(await c.req.raw.clone().arrayBuffer());
  const ctx = {
    method,
    path: new URL(c.req.url).pathname,
    bodyHash: await sha256Hex(body),
  };
  const headers = c.req.raw.headers;
  if (!mutationAllowed(headers, ctx)) {
    const wallet = verifyWalletAuth(headers, ctx);
    const reason = wallet.ok ? "unauthorized" : (wallet.error ?? "unauthorized");
    return c.json({ error: reason }, 401);
  }
  const who = requestActor(headers, ctx);
  if (!who) return c.json({ error: "unauthorized" }, 401);
  c.set("actor", who);
  return next();
});

app.onError((err, c) => {
  const message = err instanceof Error ? err.message : "error";
  const status = message.startsWith("unknown mandate") ? 404 : 400;
  return c.json({ error: message }, status);
});

app.get("/health", (c) => {
  const facts = existsSync(DEVNET_FACTS)
    ? (JSON.parse(readFileSync(DEVNET_FACTS, "utf8")) as {
        programs?: Record<string, string>;
        rpc?: string;
      })
    : null;
  return c.json({
    ok: true,
    network: markovCluster() === "devnet" ? "solana-devnet" : markovCluster(),
    cluster: markovCluster(),
    mainnetGate: process.env.MARKOV_MAINNET === "1",
    engineDemo: engineDemoAllowed(),
    walletAuth: true,
    chainReady: chainReady(),
    operators: engine.operators.size,
    mandates: engine.mandates.size,
    receipts: engine.receipts.length,
    programs: facts?.programs ?? null,
    rpcHost: factsHost(facts?.rpc),
  });
});

app.get("/operators", (c) => c.json([...engine.operators.values()]));

app.get("/operators/:id", (c) => {
  const id = c.req.param("id");
  const profile = engine.operators.get(id);
  if (!profile) return c.json({ error: "unknown operator" }, 404);
  const stats = operatorStats(engine.receipts, [...engine.mandates.values()]).find((s) => s.operator === id);
  const strategies = strategyStats(engine.receipts, [...engine.mandates.values()]).filter(
    (s) => s.template.operator === id,
  );
  return c.json({ ...profile, stats: stats?.stats ?? null, strategies });
});

app.get("/stats/operators", (c) =>
  c.json(operatorStats(engine.receipts, [...engine.mandates.values()])),
);

app.get("/strategies", (c) => c.json(strategyStats(engine.receipts, [...engine.mandates.values()])));

app.get("/strategies/:id", (c) => {
  const id = c.req.param("id");
  const row = strategyStats(engine.receipts, [...engine.mandates.values()]).find(
    (s) => s.strategyId === id || s.slug === id,
  );
  if (!row) return c.json({ error: "unknown strategy" }, 404);
  const receipts = engine.receipts.filter(
    (r) => (r.type === "ActionExecuted" || r.type === "ActionRefused") && "strategyId" in r && r.strategyId === row.strategyId,
  );
  return c.json({ ...row, receipts });
});

app.get("/mandates", (c) => {
  const owner = c.req.query("owner")?.trim();
  const rows = [...engine.mandates.values()];
  if (owner) return c.json(rows.filter((m) => m.owner === owner));
  if (isLoopbackHost() && !behindProxy(c.req.raw.headers)) return c.json(rows);
  return c.json([]);
});

app.get("/mandates/:id", (c) => {
  const mandate = engine.mandate(c.req.param("id"));
  const receipts = engine.receipts.filter((r) => "mandateId" in r && r.mandateId === mandate.id);
  const hud = {
    pnl: pnlQuote(receipts),
    capProximity: capProximity(
      mandate.spentToday,
      mandate.policy.dailyCap,
      mandate.spendToday,
      mandate.policy.spendDailyCap,
    ),
  };
  return c.json({ mandate, receipts, hud });
});

app.get("/receipts", (c) => {
  const mandateId = c.req.query("mandateId");
  const rows = mandateId
    ? engine.receipts.filter((r) => "mandateId" in r && r.mandateId === mandateId)
    : engine.receipts;
  return c.json(rows);
});

app.post("/mandates", async (c) => {
  const body = await c.req.json();
  const who = actor(c);
  if (typeof body.owner === "string" && body.owner && body.owner !== who) {
    return c.json({ error: "owner must match signed wallet" }, 400);
  }
  let owner = who;
  let operator = body.operator;
  let policy = tightenPolicy(body.policy);
  let ttlSecs = body.ttlSecs ?? 30 * 24 * 3600;
  let strategyId: string | null = null;
  if (body.strategyId) {
    const published = strategyById(body.strategyId) ?? publishedStrategies().find((s) => s.slug === body.strategyId);
    if (!published) return c.json({ error: "unknown strategy" }, 404);
    try {
      const built = createMandateFromTemplate(published.template, body.overrides);
      operator = built.operator;
      policy = built.policy;
      ttlSecs = built.ttlSecs;
      strategyId = built.strategyId;
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "invalid overrides" }, 400);
    }
  }
  if (!operator) return c.json({ error: "operator required" }, 400);
  if (isWalletPubkey(who) && chainReady()) {
    const fundAmount = cappedAmount(body.fundAmount) ?? 0;
    return c.json(
      await buildSubscribe(who, {
        operator,
        strategyId,
        ttlSecs,
        fundAmount,
        policy,
      }),
    );
  }
  const mandate = engine.createMandate({
    owner,
    operator,
    emergencyKey: ACTORS.emergency,
    policy,
    ttlSecs,
    strategyId,
  });
  const fundAmount = cappedAmount(body.fundAmount);
  if (fundAmount) {
    engine.fund(mandate.id, mandate.owner, TOKENS.usdcd, fundAmount);
  }
  persist(engine);
  return c.json(engine.mandate(mandate.id));
});

app.post("/mandates/:id/fund", async (c) => {
  const body = await c.req.json();
  const amount = cappedAmount(body.amount);
  if (amount == null) return c.json({ error: "invalid amount" }, 400);
  const receipt = engine.fund(c.req.param("id"), actor(c), body.token ?? TOKENS.usdcd, amount);
  persist(engine);
  return c.json(receipt);
});

app.post("/mandates/:id/execute", async (c) => {
  const intent = (await c.req.json()) as Intent;
  const receipt = engine.execute(c.req.param("id"), actor(c), intent);
  persist(engine);
  return c.json(receipt);
});

app.post("/mandates/:id/pause", async (c) => {
  const id = c.req.param("id");
  const who = actor(c);
  const m = engine.mandate(id);
  if (m.chain && isWalletPubkey(who) && chainReady()) {
    return c.json(await buildMandateTx(engine, who, id, "pause"));
  }
  if (m.chain && who === ACTORS.emergency && chainReady()) {
    const chained = await emergencyChain(engine, id, "pause");
    persist(engine);
    return c.json(chained);
  }
  const receipt = engine.pause(id, who);
  persist(engine);
  return c.json(receipt);
});

app.post("/mandates/:id/unpause", async (c) => {
  const id = c.req.param("id");
  const who = actor(c);
  const m = engine.mandate(id);
  if (m.chain && isWalletPubkey(who) && chainReady()) {
    return c.json(await buildMandateTx(engine, who, id, "unpause"));
  }
  const receipt = engine.unpause(id, who);
  persist(engine);
  return c.json(receipt);
});

app.post("/mandates/:id/revoke", async (c) => {
  const id = c.req.param("id");
  const who = actor(c);
  const m = engine.mandate(id);
  if (m.chain && isWalletPubkey(who) && chainReady()) {
    return c.json(await buildMandateTx(engine, who, id, "revoke"));
  }
  if (m.chain && who === ACTORS.emergency && chainReady()) {
    const chained = await emergencyChain(engine, id, "revoke");
    persist(engine);
    return c.json(chained);
  }
  const receipt = engine.revoke(id, who);
  persist(engine);
  return c.json(receipt);
});

app.post("/mandates/:id/withdraw", async (c) => {
  const body = await c.req.json();
  const amount = cappedAmount(body.amount);
  if (amount == null) return c.json({ error: "invalid amount" }, 400);
  const id = c.req.param("id");
  const who = actor(c);
  const m = engine.mandate(id);
  if (m.chain && isWalletPubkey(who) && chainReady()) {
    return c.json(await buildMandateTx(engine, who, id, "withdraw", amount));
  }
  const receipt = engine.ownerWithdraw(id, who, body.token ?? TOKENS.usdcd, amount);
  persist(engine);
  return c.json(receipt);
});

app.post("/chain/confirm", async (c) => {
  const body = await c.req.json();
  if (typeof body.sig !== "string" || !body.sig || !body.intent) {
    return c.json({ error: "sig and intent required" }, 400);
  }
  const out = await confirmChain(engine, actor(c), body.sig, body.intent);
  persist(engine);
  return c.json({
    ...out.mandate,
    sig: body.sig,
    explorerUrl: explorerTxUrl(body.sig),
    receipts: out.receipts,
  });
});

app.post("/chain/faucet", async (c) => {
  const out = await faucetDemoUsdcd(actor(c));
  return c.json(out);
});

app.post("/data/price", async (c) => {
  const body = await c.req.json();
  const out = fetchPrice(engine, body.mandateId, actor(c), body.symbol ?? "DEMO");
  persist(engine);
  return c.json(out);
});

app.post("/agents/:name/tick", async (c) => {
  if (!engineDemoAllowed() || treatAsPublic(c.req.raw.headers)) {
    return c.json({ error: "engine demo disabled" }, 403);
  }
  const body = await c.req.json();
  const name = c.req.param("name");
  const receipts =
    name === "steady" || name === "yield"
      ? tickSteady(engine, body.mandateId, Boolean(body.overCap))
      : name === "redteam"
        ? tickMomentum(engine, body.mandateId, true)
        : tickMomentum(engine, body.mandateId, Boolean(body.overCap));
  persist(engine);
  return c.json({ receipts });
});

app.post("/agents/redteam/sweep", (c) => {
  if (!engineDemoAllowed() || treatAsPublic(c.req.raw.headers)) {
    return c.json({ error: "engine demo disabled" }, 403);
  }
  const out = exerciseAllBlockReasons(engine);
  persist(engine);
  return c.json(out);
});

app.post("/strategies/:id/fan-out", async (c) => {
  if (!engineDemoAllowed() || treatAsPublic(c.req.raw.headers)) {
    return c.json({ error: "engine demo disabled" }, 403);
  }
  const published = strategyById(c.req.param("id")) ?? publishedStrategies().find((s) => s.slug === c.req.param("id"));
  if (!published) return c.json({ error: "unknown strategy" }, 404);
  const body = await c.req.json().catch(() => ({} as { amountIn?: number; overCap?: boolean; agent?: string }));
  if (typeof body.amountIn === "number" && body.amountIn > 0) {
    const rows = fanOutSwap(engine, published.strategyId, body.amountIn);
    persist(engine);
    return c.json({ strategyId: published.strategyId, rows });
  }
  const tick = published.slug === "steady" ? tickSteady : tickMomentum;
  const rows = fanOut(engine, published.strategyId, tick, Boolean(body.overCap));
  persist(engine);
  return c.json({ strategyId: published.strategyId, rows });
});

app.post("/demo/four-beat", async (c) => {
  if (!engineDemoAllowed() || treatAsPublic(c.req.raw.headers)) {
    return c.json({ error: "engine demo disabled" }, 403);
  }
  const now = Date.now();
  if (fourBeatBusy || now - lastFourBeatAt < FOUR_BEAT_COOLDOWN_MS) {
    return c.json({ error: "four-beat cooldown" }, 429);
  }
  fourBeatBusy = true;
  lastFourBeatAt = now;
  try {
    const result = runFourBeat(engine);
    persist(engine);
    if (markovCluster() === "devnet" && existsSync(DEVNET_FACTS) && existsSync(OWNER_KEY)) {
      try {
        const { runFourBeatDevnet } = await import("../../../scripts/four-beat-devnet");
        const chain = await runFourBeatDevnet();
        stampExplorer(result, chain);
        persist(engine);
      } catch (err) {
        console.warn("devnet four-beat overlay skipped:", err instanceof Error ? err.message : err);
      }
    }
    return c.json(result);
  } finally {
    fourBeatBusy = false;
  }
});

app.post("/demo/strategy-vault", (c) => {
  if (!engineDemoAllowed() || treatAsPublic(c.req.raw.headers)) {
    return c.json({ error: "engine demo disabled" }, 403);
  }
  const now = Date.now();
  if (now - lastVaultAt < FOUR_BEAT_COOLDOWN_MS) {
    return c.json({ error: "strategy-vault cooldown" }, 429);
  }
  lastVaultAt = now;
  const result = runStrategyVaultDemo(engine);
  persist(engine);
  return c.json(result);
});

const port = Number(process.env.PORT ?? 8787);
const hostname = listenHost();
export default {
  port,
  hostname,
  fetch: app.fetch,
};

console.log(`markov api on ${hostname}:${port}`);
