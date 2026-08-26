import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PAGES, STYLE, render } from "../src/pages";

const out = join(import.meta.dir, "../public");
mkdirSync(out, { recursive: true });
mkdirSync(join(out, "docs"), { recursive: true });
writeFileSync(join(out, "style.css"), STYLE);
for (const page of PAGES) {
  const file = page.path === "/" ? "index.html" : `${page.path.replace(/^\//, "")}.html`;
  const dest = join(out, file);
  mkdirSync(join(dest, ".."), { recursive: true });
  writeFileSync(dest, render(page));
}
writeFileSync(
  join(out, "llms.txt"),
  `# Markov

The mandate layer for Solana. Docs in this repository under apps/site. Marketing: https://markovhq.com
`,
);
console.log("wrote", PAGES.length, "pages to", out);
