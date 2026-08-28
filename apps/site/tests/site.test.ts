import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import webTokens from "../../web/design-tokens.json";
import { badgeFamily, tokenCss, tokens } from "../src/lib/tokens";

const ROOT = join(import.meta.dir, "..");
const DOCS = join(ROOT, "docs");
const SRC = join(ROOT, "src");
const HEX = /#[0-9a-fA-F]{3,8}\b/;

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function walk(dir: string, acc: string[] = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|css)$/.test(name)) acc.push(p);
  }
  return acc;
}

describe("markov-site docs", () => {
  test("home is protocol docs, not a markovhq restyle", () => {
    const home = read("src/pages/index.tsx");
    const css = read("src/css/custom.css");
    const config = read("docusaurus.config.ts");
    expect(home).toContain("https://markovhq.com");
    expect(home).toContain("Docusaurus");
    expect(css).toContain("Not the markovhq.com marketing site");
    expect(config).toContain("Not a restyle of that site");
    expect(`${home}\n${css}`).not.toMatch(/seamless|robust/i);
  });

  test("docs chrome matches Float tokens and stays Docusaurus", () => {
    const css = read("src/css/custom.css");
    const config = read("docusaurus.config.ts");
    const home = read("src/pages/index.tsx");
    expect(config).toContain('defaultMode: "dark"');
    expect(config).toContain("Fraunces");
    expect(config).toContain("IBM+Plex+Sans");
    expect(config).toContain("IBM+Plex+Mono");
    expect(config).toContain("tokenCss");
    expect(home).toContain('className="wrap home-page"');
    expect(css).toContain("var(--base)");
    expect(css).toContain("var(--authority)");
    expect(css).toContain("var(--serif)");
    expect(css).toContain(".receipt-refusal");
    expect(css).toContain("--ifm-navbar-height: 3.75rem");
    expect(css).not.toContain("--ifm-navbar-height: auto");
    expect(css).toContain(".navbar::before");
    expect(tokens).toEqual(webTokens);
    expect(tokenCss()).toContain(`--base: ${webTokens.color.base};`);
  });

  test("no hex literals outside Float design-tokens.json", () => {
    const hits: string[] = [];
    for (const file of walk(SRC)) {
      const text = readFileSync(file, "utf8");
      if (HEX.test(text)) hits.push(file.replace(SRC + "/", ""));
    }
    expect(hits).toEqual([]);
  });

  test("docs index lists all six products as paths in this repo", () => {
    const html = read("docs/index.md");
    for (const name of [
      "markov-program",
      "markov-sdk",
      "float-web",
      "float-agents",
      "float-bot",
      "markov-site",
    ]) {
      expect(html).toContain(name);
    }
    expect(html).not.toContain("migrate later");
  });

  test("BlockReason page lists every variant", () => {
    const html = read("docs/block-reason.md");
    for (const reason of [
      "Paused",
      "Revoked",
      "Expired",
      "Unauthorized",
      "ProgramNotAllowed",
      "TokenNotAllowed",
      "OverTxCap",
      "OverDailyCap",
      "OverSpendCap",
      "OverSpendDailyCap",
      "SlippageExceeded",
    ]) {
      expect(html).toContain(reason);
    }
  });

  test("every registered markdown page exists", () => {
    const pages = [
      "index.md",
      "mandates.md",
      "policy.md",
      "receipts.md",
      "kill-switch.md",
      "owners.md",
      "operators.md",
      "venues.md",
      "program.md",
      "sdk.md",
      "block-reason.md",
      "data-api.md",
      "security.md",
    ];
    for (const page of pages) {
      expect(existsSync(join(DOCS, page))).toBe(true);
    }
    const files = readdirSync(DOCS).filter((f) => f.endsWith(".md"));
    expect(files.length).toBe(pages.length);
  });

  test("llms.txt is a static asset", () => {
    expect(read("static/llms.txt")).toContain("https://markovhq.com");
  });

  test("live receipts page polls the public feed", () => {
    const page = read("src/pages/receipts.tsx");
    const config = read("docusaurus.config.ts");
    expect(config).toContain('label: "Live receipts"');
    expect(config).toContain("receiptsApiUrl");
    expect(config).toContain("RECEIPTS_API_URL");
    expect(page).toContain("No receipts yet — devnet warming up.");
    expect(page).toContain("actions gated");
    expect(page).toContain("refusals emitted");
    expect(page).toContain("5_000");
    expect(page).toContain("15_000");
    expect(page).toContain("/v1/receipts");
    expect(page).toContain("cluster=devnet");
    expect(page).toContain("All");
    expect(page).toContain("Allowed");
    expect(page).toContain("Refused");
    expect(page).toContain("receipt-refusal");
    expect(page).toContain("live-stream");
    expect(page).toContain("badgeFamily");
    expect(page).not.toMatch(/SERVICE_ROLE|SUPABASE_|sk-|api[_-]?key/i);
    expect(badgeFamily("OverTxCap")).toBe("cap");
    expect(badgeFamily("Paused")).toBe("state");
  });
});
