import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BLOCK_REASONS } from "@markov/engine/types";
import {
  formatRow,
  marketingReceiptsHits,
  parseFactsHouseTickSigs,
  parseFactsRefusalTable,
  verdictOf,
  type Row,
} from "./mvp-status-audit";

const ROOT = join(import.meta.dir, "..");

describe("FACTS chain evidence tables", () => {
  test("refusal table has one signature per BlockReason", () => {
    const md = readFileSync(join(ROOT, "docs/FACTS.md"), "utf8");
    const table = parseFactsRefusalTable(md);
    expect(table.size).toBe(11);
    for (const code of BLOCK_REASONS) {
      expect(table.get(code)?.length).toBeGreaterThan(60);
    }
  });

  test("house tick signatures parse from FACTS", () => {
    const md = readFileSync(join(ROOT, "docs/FACTS.md"), "utf8");
    const sigs = parseFactsHouseTickSigs(md);
    expect(sigs).toHaveLength(3);
    expect(new Set(sigs).size).toBe(3);
  });
});

describe("audit status DEFERRED", () => {
  const deferred: Row = {
    name: "grant application outside repo",
    status: "DEFERRED",
    detail: "pointer",
    decisionId: "D-08",
    owner: "Kunal",
    reactivates: "Never — the grant pack lives outside the code repo by design",
  };

  test("GO requires zero FAIL; deferred is not silently green", () => {
    const v = verdictOf([{ name: "float", status: "OK", detail: "200" }, deferred]);
    expect(v.go).toBe(true);
    expect(v.ok).toBe(1);
    expect(v.fail).toBe(0);
    expect(v.deferred).toBe(1);
    expect(v.headline).toBe("GO");
    expect(v.deferredBlock).toContain("Deferred by decision — reactivates when:");
    expect(v.deferredBlock).toContain("Never — the grant pack lives outside the code repo by design");
    expect(formatRow(deferred)).toMatch(/^DEFERRED /);
    expect(formatRow(deferred)).not.toMatch(/^OK /);
  });

  test("any FAIL is NO-GO even with deferred rows", () => {
    const v = verdictOf([
      { name: "chain", status: "FAIL", detail: "unevaluable" },
      deferred,
    ]);
    expect(v.go).toBe(false);
    expect(v.headline).toBe("NO-GO");
    expect(v.fail).toBe(1);
    expect(v.deferred).toBe(1);
  });

  test("formatRow throws if DEFERRED is missing decision fields", () => {
    expect(() =>
      formatRow({ name: "broken", status: "DEFERRED", detail: "x" }),
    ).toThrow(/missing decision fields/);
  });

  test("marketing receipts grep ignores the float canonical path", () => {
    const hits = marketingReceiptsHits(ROOT);
    expect(hits).toEqual([]);
  });
});
