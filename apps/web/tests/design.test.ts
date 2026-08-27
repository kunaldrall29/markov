import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { BLOCK_REASONS } from "@markov/engine/types";
import tokens from "../design-tokens.json";
import { BLOCK_HELD, BLOCK_VERNACULAR, badgeFamily } from "../src/lib/reasons";
import { tokenCss } from "../src/lib/tokens";
import { withdrawDisabled } from "../src/lib/withdraw";

const HEX = /#[0-9a-fA-F]{3,8}\b/;
const SRC = join(import.meta.dir, "../src");

function walk(dir: string, acc: string[] = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|css)$/.test(name)) acc.push(p);
  }
  return acc;
}

describe("Float design contract", () => {
  test("every BlockReason has vernacular, held copy, and a badge family", () => {
    expect(BLOCK_REASONS).toHaveLength(11);
    for (const reason of BLOCK_REASONS) {
      expect(BLOCK_VERNACULAR[reason].startsWith("⊘ blocked:")).toBe(true);
      expect(BLOCK_HELD[reason]).toMatch(/^Blocked: .+\. The policy held\.$/);
      expect(badgeFamily(reason)).toBeTruthy();
    }
  });

  test("design badge families match the engine enum exactly", () => {
    const listed = Object.values(tokens.badgeFamily).flat().sort();
    const engine = [...BLOCK_REASONS].sort();
    expect(listed).toEqual(engine);
  });

  test("withdraw is never disabled by mandate state", () => {
    expect(withdrawDisabled(1, "Active")).toBe(false);
    expect(withdrawDisabled(80_000_000, "Paused")).toBe(false);
    expect(withdrawDisabled(80_000_000, "Revoked")).toBe(false);
    expect(withdrawDisabled(0, "Active")).toBe(true);
    expect(withdrawDisabled(0, "Revoked")).toBe(true);
  });

  test("no hex literals outside design-tokens.json", () => {
    const hits: string[] = [];
    for (const file of walk(SRC)) {
      const text = readFileSync(file, "utf8");
      if (HEX.test(text)) hits.push(file.replace(SRC + "/", ""));
    }
    expect(hits).toEqual([]);
  });

  test("tokenCss injects every color token", () => {
    const css = tokenCss();
    for (const [key, value] of Object.entries(tokens.color)) {
      expect(css).toContain(`--${key}: ${value};`);
    }
  });
});
