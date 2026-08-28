import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fromEngineReceipt, insertReceipt, listReceipts, listStrategyStats, openDb } from "../src/db";

const PUBLIC_FIELDS = [
  "receipt_id",
  "ts",
  "mandate",
  "operator",
  "action_type",
  "venue",
  "token",
  "amount",
  "result",
  "block_reason",
  "tx_sig",
];

describe("indexer sqlite", () => {
  test("stores ActionRefused with BlockReason", () => {
    const db = openDb(":memory:");
    insertReceipt(
      db,
      fromEngineReceipt({
        type: "ActionRefused",
        mandateId: "mdt_0001",
        reason: "OverTxCap",
        nonce: 2,
        ts: 1,
      }),
    );
    const rows = listReceipts(db, "mdt_0001") as { kind: string; refused: number; reason: string }[];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe("ActionRefused");
    expect(rows[0]?.refused).toBe(1);
    expect(rows[0]?.reason).toBe("OverTxCap");
  });

  test("stores strategy_id on receipts and aggregates strategy_stats", () => {
    const db = openDb(":memory:");
    const hash = "ab".repeat(32);
    insertReceipt(
      db,
      fromEngineReceipt({
        type: "ActionExecuted",
        mandateId: "mdt_0001",
        operator: "markov-momentum",
        strategyId: hash,
        amountIn: 60_000_000,
        venue: "demo_swap",
        tokenIn: "USDC-d",
        nonce: 1,
        ts: 1,
      }),
    );
    insertReceipt(
      db,
      fromEngineReceipt({
        type: "ActionRefused",
        mandateId: "mdt_0002",
        operator: "markov-momentum",
        strategyId: hash,
        reason: "OverTxCap",
        requestedAmount: 60_000_000,
        nonce: 1,
        ts: 2,
      }),
    );
    const stats = listStrategyStats(db) as {
      strategy_id: string;
      actions: number;
      refusals: number;
    }[];
    expect(stats).toHaveLength(1);
    expect(stats[0]?.strategy_id).toBe(hash);
    expect(stats[0]?.actions).toBe(1);
    expect(stats[0]?.refusals).toBe(1);
  });

  test("public_receipts view exposes only the SPEC read-model fields", () => {
    const db = openDb(":memory:");
    insertReceipt(
      db,
      fromEngineReceipt({
        type: "ActionExecuted",
        mandateId: "mdt_0001",
        operator: "markov-momentum",
        kind: "swap",
        venue: "demo_swap",
        tokenIn: "USDC-d",
        amountIn: 8_000_000,
        nonce: 1,
        ts: 10,
        sig: "sigAllow111",
      }),
    );
    insertReceipt(
      db,
      fromEngineReceipt({
        type: "ActionRefused",
        mandateId: "mdt_0001",
        operator: "markov-momentum",
        kind: "swap",
        reason: "OverTxCap",
        requestedAmount: 30_000_000,
        nonce: 2,
        ts: 11,
        sig: "sigBlock222",
      }),
    );
    insertReceipt(
      db,
      fromEngineReceipt({
        type: "Paused",
        mandateId: "mdt_0001",
        by: "owner",
        ts: 12,
      }),
    );
    const cols = (
      db.query(`pragma table_info(public_receipts)`).all() as { name: string }[]
    ).map((c) => c.name);
    expect(cols).toEqual(PUBLIC_FIELDS);
    const rows = db
      .query(
        `select receipt_id, ts, mandate, operator, action_type, venue, token, amount, result, block_reason, tx_sig
         from public_receipts order by ts desc`,
      )
      .all() as Record<string, unknown>[];
    expect(rows).toHaveLength(2);
    expect(rows[0]?.result).toBe("blocked");
    expect(rows[0]?.block_reason).toBe("OverTxCap");
    expect(rows[0]?.action_type).toBe("swap");
    expect(rows[1]?.result).toBe("allowed");
    expect(rows[1]?.block_reason).toBeNull();
    const sql = readFileSync(join(import.meta.dir, "../migrations/0003_public_receipts.sql"), "utf8");
    expect(sql).not.toMatch(/\bjoin\b/i);
  });
});
