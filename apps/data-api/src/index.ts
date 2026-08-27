import { Hono } from "hono";
import { listenHost, rpcHost } from "@markov/rpc";

export const PRICE_AMOUNT = 20_000;
const API = process.env.API_URL ?? "http://127.0.0.1:8787";

function apiHeaders(actor: string): Record<string, string> {
  const secret = process.env.MARKOV_API_SECRET?.trim();
  return {
    "content-type": "application/json",
    "x-actor": actor,
    ...(secret ? { "x-api-key": secret } : {}),
  };
}

export function paymentRequired(symbol: string) {
  const memo = `x402:${symbol}`;
  return {
    error: "payment required",
    amount: PRICE_AMOUNT,
    memo,
    recipient: "data_api",
    next: "POST this path with { mandateId } after a mandate spend using the same memo",
  };
}

export function createDataApi() {
  const app = new Hono();

  app.get("/health", (c) =>
    c.json({
      service: "data-api",
      ok: true,
      rpcHost: rpcHost(),
    }),
  );

  app.get("/price/:symbol", (c) => {
    const symbol = c.req.param("symbol") || "DEMO";
    return c.json(paymentRequired(symbol), 402);
  });

  app.post("/price/:symbol", async (c) => {
    const symbol = c.req.param("symbol") || "DEMO";
    const body = await c.req.json<{ mandateId?: string }>();
    if (!body.mandateId) {
      return c.json(paymentRequired(symbol), 402);
    }
    const mandateRes = await fetch(`${API}/mandates/${body.mandateId}`);
    if (!mandateRes.ok) {
      return c.json({ error: "unknown mandate" }, 404);
    }
    const payload = (await mandateRes.json()) as { mandate?: { operator?: string } };
    const actor = payload.mandate?.operator;
    if (!actor) {
      return c.json({ error: "unknown mandate" }, 404);
    }
    const res = await fetch(`${API}/data/price`, {
      method: "POST",
      headers: apiHeaders(actor),
      body: JSON.stringify({ mandateId: body.mandateId, symbol }),
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  });

  return app;
}

const app = createDataApi();
const port = Number(process.env.PORT ?? 8788);
const hostname = listenHost();

export default {
  port,
  hostname,
  fetch: app.fetch,
};

if (import.meta.main) {
  console.log(`data-api on ${hostname}:${port}`);
}
