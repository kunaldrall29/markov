import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BLOCK_REASONS } from "@markov/engine/types";
import { parseFactsHouseTickSigs, parseFactsRefusalTable } from "./mvp-status-audit";

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
