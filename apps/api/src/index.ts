import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Intent } from "@markov/engine";
import { TOKENS } from "@markov/engine";
import { tickDca, tickDip, tickYield } from "./agents";
import { fetchPrice } from "./data";
import { runFourBeat } from "./four-beat";
import { ACTORS, DEMO_POLICY, seed } from "./seed";
import { loadEngine, persist } from "./store";

const engine = loadEngine();
seed(engine);
persist(engine);

const app = new Hono();
app.use(
  "*",
  cors({
    origin: ["http://127.0.0.1:3000", "http://localhost:3000"],
    allowHeaders: ["content-type", "x-actor"],
  }),
);

function actor(c: { req: { header: (n: string) => string | undefined } }) {
  return c.req.header("x-actor") ?? ACTORS.owner;
}

app.get("/health", (c) =>
  c.json({
    ok: true,
    network: "markov-localnet",
    operators: engine.operators.size,
    mandates: engine.mandates.size,
    receipts: engine.receipts.length,
  }),
);

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
    emergencyKey: body.emergencyKey ?? ACTORS.emergency,
    policy: { ...DEMO_POLICY, ...body.policy },
    ttlSecs: body.ttlSecs ?? 30 * 24 * 3600,
  });
  if (body.fundAmount) {
    engine.fund(mandate.id, mandate.owner, TOKENS.usdcd, Number(body.fundAmount));
  }
  persist(engine);
  return c.json(engine.mandate(mandate.id));
});

app.post("/mandates/:id/fund", async (c) => {
  const body = await c.req.json();
  const receipt = engine.fund(c.req.param("id"), actor(c), body.token ?? TOKENS.usdcd, Number(body.amount));
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
  const receipt = engine.ownerWithdraw(
    c.req.param("id"),
    actor(c),
    body.token ?? TOKENS.usdcd,
    Number(body.amount),
  );
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

app.post("/demo/four-beat", (c) => {
  const result = runFourBeat(engine);
  persist(engine);
  return c.json(result);
});

const port = Number(process.env.PORT ?? 8787);
export default {
  port,
  fetch: app.fetch,
};

console.log(`markov api on :${port}`);
