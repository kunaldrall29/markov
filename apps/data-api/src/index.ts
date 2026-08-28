import { Hono } from "hono";
import { listenHost, rpcHost } from "@markov/rpc";
import { isAllowedOrigin } from "./cors";
import {
  decodeCursor,
  isBlockReason,
  encodeCursor,
  memoryStore,
  openConfiguredStore,
  type PublicReceipt,
  type PublicReceiptsStore,
  type PublicResult,
} from "./public-receipts";
import { clientIp, createRateLimiter } from "./rate-limit";

export const PRICE_AMOUNT = 20_000;
const API = process.env.API_URL ?? "http://127.0.0.1:8787";
const STATS_TTL_MS = 10_000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

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

export type DataApiOptions = {
  store?: PublicReceiptsStore | null;
  now?: () => number;
  rateLimitMax?: number;
};

function parseLimit(raw: string | undefined): { ok: true; limit: number } | { ok: false } {
  if (raw === undefined || raw === "") return { ok: true, limit: DEFAULT_LIMIT };
  if (!/^\d+$/.test(raw)) return { ok: false };
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) return { ok: false };
  return { ok: true, limit: n };
}

function parseResult(raw: string | undefined): { ok: true; result?: PublicResult } | { ok: false } {
  if (raw === undefined || raw === "") return { ok: true };
  if (raw === "allowed" || raw === "blocked") return { ok: true, result: raw };
  return { ok: false };
}

export function createDataApi(opts: DataApiOptions = {}) {
  const app = new Hono();
  const store = opts.store === undefined ? openConfiguredStore() : opts.store;
  const now = opts.now ?? Date.now;
  const limiter = createRateLimiter({ max: opts.rateLimitMax ?? 60, windowMs: 60_000 });
  let statsCache: { at: number; body: unknown } | null = null;

  app.use("*", async (c, next) => {
    const origin = c.req.header("origin");
    if (c.req.method === "OPTIONS") {
      if (!isAllowedOrigin(origin)) return c.json({ error: "origin not allowed" }, 403);
      c.header("Access-Control-Allow-Origin", origin!);
      c.header("Vary", "Origin");
      c.header("Access-Control-Allow-Methods", "GET, OPTIONS");
      c.header("Access-Control-Allow-Headers", "Content-Type");
      c.header("Access-Control-Max-Age", "600");
      return c.body(null, 204);
    }
    await next();
    if (origin && isAllowedOrigin(origin)) {
      c.header("Access-Control-Allow-Origin", origin);
      c.header("Vary", "Origin");
    }
  });

  app.get("/health", (c) =>
    c.json({
      service: "data-api",
      ok: true,
      rpcHost: rpcHost(),
      publicReceipts: Boolean(store),
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

  const gated = async (c: { req: { header: (n: string) => string | undefined }; json: (b: unknown, s?: number) => Response; header: (k: string, v: string) => void }, next: () => Promise<void>) => {
    const hit = limiter.check(clientIp(c.req), now());
    if (!hit.ok) {
      c.header("Retry-After", String(hit.retryAfter));
      return c.json({ error: "rate limit" }, 429);
    }
    await next();
  };

  app.use("/v1/*", gated);

  app.get("/v1/receipts/stats", async (c) => {
    if (!store) return c.json({ error: "public_receipts unavailable" }, 503);
    const t = now();
    if (statsCache && t - statsCache.at < STATS_TTL_MS) {
      return c.json(statsCache.body);
    }
    try {
      const body = await store.stats();
      statsCache = { at: t, body };
      return c.json(body);
    } catch {
      return c.json({ error: "public_receipts unavailable" }, 503);
    }
  });

  app.get("/v1/receipts", async (c) => {
    if (!store) return c.json({ error: "public_receipts unavailable" }, 503);
    const limitParsed = parseLimit(c.req.query("limit"));
    if (!limitParsed.ok) return c.json({ error: "invalid limit" }, 400);
    const resultParsed = parseResult(c.req.query("result"));
    if (!resultParsed.ok) return c.json({ error: "invalid result" }, 400);
    const reasonRaw = c.req.query("reason");
    if (reasonRaw !== undefined && reasonRaw !== "") {
      if (!isBlockReason(reasonRaw)) {
        return c.json({ error: "invalid reason", reason: reasonRaw }, 400);
      }
    }
    const cursorRaw = c.req.query("cursor");
    if (cursorRaw !== undefined && cursorRaw !== "" && !decodeCursor(cursorRaw)) {
      return c.json({ error: "invalid cursor" }, 400);
    }
    try {
      const rows = await store.list({
        limit: limitParsed.limit + 1,
        result: resultParsed.result,
        reason: reasonRaw && isBlockReason(reasonRaw) ? reasonRaw : undefined,
        cursor: cursorRaw || undefined,
      });
      const receipts = rows.slice(0, limitParsed.limit);
      const next_cursor =
        rows.length > limitParsed.limit ? encodeCursor(receipts[receipts.length - 1] as PublicReceipt) : null;
      return c.json({ receipts, next_cursor });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "invalid cursor") return c.json({ error: "invalid cursor" }, 400);
      return c.json({ error: "public_receipts unavailable" }, 503);
    }
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

export { memoryStore };
