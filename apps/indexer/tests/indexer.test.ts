import { describe, expect, test } from "bun:test";
import { fromEngineReceipt, insertReceipt, listReceipts, openDb } from "../src/db";

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
});
