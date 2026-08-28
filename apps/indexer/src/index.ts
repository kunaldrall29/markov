import { Hono } from "hono";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { isLoopbackHost, listenHost } from "@markov/rpc";
import {
  fromEngineReceipt,
  insertReceipt,
  listOperatorStats,
  listReceipts,
  listStrategyStats,
  openDb,
  upsertMandate,
  upsertStrategy,
} from "./db";
import { postgresUrl, replacePostgresReceipts } from "./pg";

const API = process.env.API_URL ?? "http://127.0.0.1:8787";
const sqlitePath = process.env.INDEXER_SQLITE ?? join(import.meta.dir, "../../../data/indexer.sqlite");

mkdirSync(dirname(sqlitePath), { recursive: true });
const db = openDb(sqlitePath.endsWith(":memory:") ? ":memory:" : sqlitePath);

function syncAllowed(c: { req: { header: (n: string) => string | undefined } }) {
  const secret = process.env.MARKOV_API_SECRET?.trim();
  if (secret) return c.req.header("x-api-key") === secret;
  const forwarded = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || c.req.header("forwarded");
  if (forwarded) return false;
  return isLoopbackHost();
}

export function createIndexer(database = db) {
  const app = new Hono();

  app.get("/health", (c) =>
    c.json({
      service: "indexer",
      ok: true,
      db: postgresUrl() ? "sqlite+postgres" : "sqlite",
    }),
  );

  app.get("/receipts", (c) => {
    const mandateId = c.req.query("mandateId") ?? undefined;
    return c.json(listReceipts(database, mandateId));
  });

  app.get("/strategy_stats", (c) => c.json(listStrategyStats(database)));
  app.get("/operator_stats", (c) => c.json(listOperatorStats(database)));

  app.post("/sync", async (c) => {
    if (!syncAllowed(c)) return c.json({ error: "unauthorized" }, 401);
    const pulled = await syncFromApi(database);
    return c.json({ pulled });
  });

  return app;
}

export async function syncFromApi(database = db): Promise<number> {
  const [mandatesRes, receiptsRes, strategiesRes] = await Promise.all([
    fetch(`${API}/mandates`),
    fetch(`${API}/receipts`),
    fetch(`${API}/strategies`),
  ]);
  if (!mandatesRes.ok || !receiptsRes.ok) {
    throw new Error("api sync failed");
  }
  if (strategiesRes.ok) {
    const strategies = (await strategiesRes.json()) as {
      strategyId: string;
      slug?: string;
      name?: string;
      template?: { operator?: string };
      operator?: string;
    }[];
    const publishedAt = Math.floor(Date.now() / 1000);
    for (const s of strategies) {
      upsertStrategy(database, {
        strategy_id: s.strategyId,
        operator: s.template?.operator ?? s.operator ?? "",
        name: s.name ?? null,
        slug: s.slug ?? null,
        template_json: JSON.stringify(s.template ?? s),
        published_at: publishedAt,
      });
    }
  }
  const mandates = (await mandatesRes.json()) as {
    id: string;
    owner: string;
    operator: string;
    state: string;
    createdTs?: number;
    strategyId?: string | null;
  }[];
  for (const m of mandates) {
    upsertMandate(database, {
      id: m.id,
      owner: m.owner,
      operator: m.operator,
      state: m.state,
      created_ts: m.createdTs ?? null,
      strategy_id: m.strategyId ?? null,
    });
  }
  database.run("delete from receipts");
  const receipts = (await receiptsRes.json()) as Record<string, unknown>[];
  for (const r of receipts) {
    insertReceipt(database, fromEngineReceipt(r));
  }
  await replacePostgresReceipts(database);
  return receipts.length;
}

const app = createIndexer();
const port = Number(process.env.PORT ?? 8790);
const hostname = listenHost();

export default {
  port,
  hostname,
  fetch: app.fetch,
};

if (import.meta.main) {
  const cadence = Number(process.env.INDEXER_SYNC_MS ?? 5000);
  if (cadence > 0) {
    setInterval(() => {
      syncFromApi().catch((err) => console.warn("indexer sync", err));
    }, cadence);
  }
  console.log(`indexer on ${hostname}:${port}`);
}
