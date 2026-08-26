import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "bun:test";

test("placeholder points at markovhq.com and does not restyle it", () => {
  const html = readFileSync(join(import.meta.dir, "../public/index.html"), "utf8");
  expect(html).toContain("https://markovhq.com");
  expect(html).not.toMatch(/seamless|robust/i);
});
