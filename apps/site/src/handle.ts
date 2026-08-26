import { pageFor, render, STYLE } from "./pages";

export function handleSiteRequest(req: Request): Response {
  const url = new URL(req.url);
  if (url.pathname === "/style.css") {
    return new Response(STYLE, { headers: { "content-type": "text/css; charset=utf-8" } });
  }
  if (url.pathname === "/llms.txt") {
    return new Response(LLMS, { headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  if (url.pathname === "/health") {
    return Response.json({ service: "markov-site", ok: true });
  }
  const page = pageFor(url.pathname);
  if (!page) return new Response("not found", { status: 404 });
  return new Response(render(page), { headers: { "content-type": "text/html; charset=utf-8" } });
}

const LLMS = `# Markov

The mandate layer for Solana. Owner deposits; operator acts only through policy; withdraw never leaves the owner. Receipts for actions and refusals. Float is the console in this same repository.

This file is served from apps/site. Source of truth: repo llms.txt and SPEC.md.

Docs: /docs  BlockReason: /docs/block-reason  Security: /docs/security
Marketing (other property): https://markovhq.com
`;
