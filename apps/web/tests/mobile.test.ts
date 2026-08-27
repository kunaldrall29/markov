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
  });

  test("keyboard focus is visible", () => {
    expect(css).toContain(":focus-visible");
    expect(css).toContain(".skip");
  });
});
