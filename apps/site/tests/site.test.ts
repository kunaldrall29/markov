import { describe, expect, test } from "bun:test";
import { handleSiteRequest } from "../src/handle";
import { PAGES } from "../src/pages";

async function get(path: string) {
  return handleSiteRequest(new Request(`http://docs.test${path}`));
}

describe("markov-site docs", () => {
  test("home is protocol docs, not a markovhq restyle", async () => {
    const res = await get("/");
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain("https://markovhq.com");
    expect(html).toContain("Not a restyle");
    expect(html).not.toMatch(/seamless|robust/i);
  });

  test("docs index lists all six products as paths in this repo", async () => {
    const html = await (await get("/docs")).text();
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

  test("BlockReason page lists every variant", async () => {
    const html = await (await get("/docs/block-reason")).text();
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

  test("every registered page returns 200", async () => {
    for (const page of PAGES) {
      const res = await get(page.path);
      expect(res.status).toBe(200);
    }
  });

  test("unknown path 404", async () => {
    expect((await get("/nope")).status).toBe(404);
  });
});
