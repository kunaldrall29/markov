import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Intent, Policy } from "@markov/engine";
import { TOKENS } from "@markov/engine";
import { listenHost, rpcHost } from "@markov/rpc";
import { mutationAllowed } from "./auth";
import { tickDca, tickDip, tickYield } from "./agents";
import { fetchPrice } from "./data";
import { runFourBeat } from "./four-beat";
import { ACTORS, DEMO_POLICY, seed } from "./seed";
import { loadEngine, persist } from "./store";

const ROOT = join(import.meta.dir, "../../..");
const DEVNET_FACTS = join(ROOT, "data/devnet.json");
const OWNER_KEY = join(ROOT, "keys/owner.json");
const MAX_FUND = 10_000 * 1_000_000;
const FOUR_BEAT_COOLDOWN_MS = 10_000;
let lastFourBeatAt = 0;
let fourBeatBusy = false;

const engine = loadEngine();
seed(engine);
persist(engine);

const WEB_ORIGINS = [
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  ...(process.env.WEB_ORIGIN ? [process.env.WEB_ORIGIN] : []),
];

const app = new Hono();
app.use(
  "*",
  cors({
    origin: WEB_ORIGINS,
    allowHeaders: ["content-type", "x-actor", "x-api-key"],
  }),
);

function actor(c: { req: { header: (n: string) => string | undefined } }) {
  return c.req.header("x-actor") ?? ACTORS.owner;
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

function explorerTxUrl(sig: string) {
  return `https://solscan.io/tx/${sig}?cluster=devnet`;
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
  if (mutationAllowed(c.req.raw.headers)) return next();
  return c.json({ error: "unauthorized" }, 401);
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
    network: process.env.MARKOV_CLUSTER === "devnet" ? "solana-devnet" : "markov-localnet",
    cluster: process.env.MARKOV_CLUSTER ?? "local",
    operators: engine.operators.size,
    mandates: engine.mandates.size,
    receipts: engine.receipts.length,
    programs: facts?.programs ?? null,
    rpcHost: factsHost(facts?.rpc),
  });
});

app.get("/operators", (c) => c.json([...engine.operators.values()]));

app.get("/mandates", (c) => c.json([...engine.mandates.values()]));

app.get("/mandates/:id", (c) => {
  const mandate = engine.mandate(c.req.param("id"));
  const receipts = engine.receipts.filter((r) => "mandateId" in r && r.mandateId === mandate.id);
  return c.json({ mandate, receipts });
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
  const mandate = engine.createMandate({
    owner: body.owner ?? actor(c),
    operator: body.operator,
    emergencyKey: ACTORS.emergency,
    policy: tightenPolicy(body.policy),
    ttlSecs: body.ttlSecs ?? 30 * 24 * 3600,
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

app.post("/mandates/:id/pause", (c) => {
  const receipt = engine.pause(c.req.param("id"), actor(c));
  persist(engine);
  return c.json(receipt);
});

app.post("/mandates/:id/unpause", (c) => {
  const receipt = engine.unpause(c.req.param("id"), actor(c));
  persist(engine);
  return c.json(receipt);
});

app.post("/mandates/:id/revoke", (c) => {
  const receipt = engine.revoke(c.req.param("id"), actor(c));
  persist(engine);
  return c.json(receipt);
});

app.post("/mandates/:id/withdraw", async (c) => {
  const body = await c.req.json();
  const amount = cappedAmount(body.amount);
  if (amount == null) return c.json({ error: "invalid amount" }, 400);
  const receipt = engine.ownerWithdraw(c.req.param("id"), actor(c), body.token ?? TOKENS.usdcd, amount);
  persist(engine);
  return c.json(receipt);
});

app.post("/data/price", async (c) => {
  const body = await c.req.json();
  const out = fetchPrice(engine, body.mandateId, actor(c), body.symbol ?? "DEMO");
  persist(engine);
  return c.json(out);
});

app.post("/agents/:name/tick", async (c) => {
  const body = await c.req.json();
  const name = c.req.param("name");
  const receipts =
    name === "dip"
      ? tickDip(engine, body.mandateId, Boolean(body.overCap))
      : name === "yield"
        ? tickYield(engine, body.mandateId, Boolean(body.overCap))
        : tickDca(engine, body.mandateId, Boolean(body.overCap));
  persist(engine);
  return c.json({ receipts });
});

app.post("/demo/four-beat", async (c) => {
  const now = Date.now();
  if (fourBeatBusy || now - lastFourBeatAt < FOUR_BEAT_COOLDOWN_MS) {
    return c.json({ error: "four-beat cooldown" }, 429);
  }
  fourBeatBusy = true;
  lastFourBeatAt = now;
  try {
    const result = runFourBeat(engine);
    persist(engine);
    if (process.env.MARKOV_CLUSTER === "devnet" && existsSync(DEVNET_FACTS) && existsSync(OWNER_KEY)) {
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

const port = Number(process.env.PORT ?? 8787);
const hostname = listenHost();
export default {
  port,
  hostname,
  fetch: app.fetch,
};

console.log(`markov api on ${hostname}:${port}`);
