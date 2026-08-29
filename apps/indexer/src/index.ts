import { Hono } from "hono";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { listenHost } from "@markov/rpc";
import { listOperatorStats, listReceipts, listStrategyStats, openDb } from "./db";
import { applyPostgresSchema, postgresUrl } from "./pg";
import { backfill, chainConnection, chainHealth, subscribeLogs } from "./chain";

const sqlitePath = process.env.INDEXER_SQLITE ?? join(import.meta.dir, "../../../data/indexer.sqlite");

mkdirSync(dirname(sqlitePath), { recursive: true });
const db = openDb(sqlitePath.endsWith(":memory:") ? ":memory:" : sqlitePath);

export function createIndexer(database = db) {
  const app = new Hono();

  app.get("/health", async (c) => {
    const health = await chainHealth(database);
    return c.json({
      service: "indexer",
      ok: true,
      db: postgresUrl() ? "sqlite+postgres" : "sqlite",
      rpcOk: health.rpcOk,
      lastIndexedSlot: health.lastIndexedSlot,
      lagSlots: health.lagSlots,
      chainReady: health.chainReady,
    });
  });

  app.get("/receipts", (c) => {
    const mandateId = c.req.query("mandateId") ?? undefined;
    return c.json(listReceipts(database, mandateId));
  });

  app.get("/strategy_stats", (c) => c.json(listStrategyStats(database)));
  app.get("/operator_stats", (c) => c.json(listOperatorStats(database)));

  return app;
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
  const connection = chainConnection();
  console.log(`indexer on ${hostname}:${port} chain-native`);
  if (postgresUrl()) {
    applyPostgresSchema()
      .then(() => console.log("postgres schema ready"))
      .catch((err) => console.warn("postgres schema", err));
  }
  backfill(db, connection)
    .then((stats) => console.log("backfill", stats))
    .catch((err) => console.warn("backfill", err))
    .finally(() => {
      subscribeLogs(db, connection, (sig, result) => {
        if (result.inserted > 0) console.log("indexed", sig, result);
      });
      console.log("subscribed to program logs");
    });
}
