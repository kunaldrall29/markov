import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(import.meta.dir, "../src/app/globals.css"), "utf8");

describe("Float mobile layout", () => {
  test("phone breakpoint exists", () => {
    expect(css).toContain("@media (max-width: 760px)");
    expect(css).toContain("overflow-x: clip");
    expect(css).toContain("min-height: 44px");
  });

  test("receipts stack instead of a three-column squeeze", () => {
    expect(css).toContain(".receipt > :nth-child(2)");
    expect(css).toContain("flex: 1 1 100%");
    expect(css).toContain("order: 3");
  });

  test("phone nav uses a Menu control", () => {
    expect(css).toContain(".nav-toggle-btn");
    expect(css).toContain(".nav-links.open");
    expect(css).toContain(".nav-end");
    expect(css).toContain(".wallet-btn");
  });

  test("posters scale instead of overflowing 1200px", () => {
    expect(css).toContain("aspect-ratio: 1200 / 630");
    expect(css).toContain("max-width: 1200px");
  });

  test("kill rows stack on a phone", () => {
    expect(css).toContain(".kill-row");
    expect(css).toContain("flex-direction: column");
  });

  test("safe-area insets pad nav wrap and toast", () => {
    expect(css).toContain("env(safe-area-inset-top)");
    expect(css).toContain("env(safe-area-inset-bottom)");
    expect(css).toContain("env(safe-area-inset-left)");
  });

  test("strategy cards use chip chips", () => {
    expect(css).toContain(".chips");
    expect(css).toContain(".chip.warn");
    expect(css).toContain(".policy-chip.refusal");
    expect(css).toContain(".policy-chip.authority");
  });

  test("keyboard focus is visible", () => {
    expect(css).toContain(":focus-visible");
    expect(css).toContain(".skip");
  });

  test("operator select is styled, not native-only", () => {
    expect(css).toContain("color-scheme: dark");
    expect(css).toContain("appearance: none");
  });
});
