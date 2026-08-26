# Markov docs (`apps/site`)

Protocol documentation for this repository, built with [Docusaurus](https://docusaurus.io). Free, in-repo, no vendor account. Not the marketing site at markovhq.com.

```bash
bun run --filter @markov/site dev
```

http://127.0.0.1:3001 — concepts, guides, BlockReason, SDK, security.

`bun run --filter @markov/site build` writes static files under `build/` (Vercel `outputDirectory`).

Mintlify Hobby can replace hosting later if you want a `.mintlify.app` URL. The MDX/IA here is the product docs; this host stays Docusaurus until then.
