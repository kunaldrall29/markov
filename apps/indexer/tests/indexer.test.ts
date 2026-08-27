import { describe, expect, test } from "bun:test";
import { fromEngineReceipt, insertReceipt, listReceipts, listStrategyStats, openDb } from "../src/db";

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
});
