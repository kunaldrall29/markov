export const STYLE = `/* Protocol docs. Not the markovhq.com marketing site. */
:root { --ink:#1a1a1a; --muted:#555; --line:#ddd; --bg:#fafafa; }
* { box-sizing:border-box }
html,body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.55 system-ui,sans-serif }
a { color:#0645ad }
header,footer { border-bottom:1px solid var(--line); padding:12px 20px }
footer { border-bottom:0; border-top:1px solid var(--line); color:var(--muted); font-size:14px }
nav a { margin-right:14px; text-decoration:none }
nav a[aria-current="page"] { text-decoration:underline }
main { max-width:46rem; padding:24px 20px 64px }
h1 { font-size:1.6rem; font-weight:600; margin:0 0 12px }
h2 { font-size:1.15rem; margin:28px 0 8px }
p,li { color:var(--ink) }
.muted { color:var(--muted) }
code,pre { font-family:ui-monospace,monospace; font-size:0.92em }
pre { background:#f0f0f0; padding:12px; overflow:auto }
table { border-collapse:collapse; width:100% }
th,td { border:1px solid var(--line); padding:6px 8px; text-align:left; font-size:14px }
`;

export type Page = { path: string; title: string; body: string };

export const PAGES: Page[] = [
  {
    path: "/",
    title: "Markov",
    body: `
<h1>Markov</h1>
<p>The mandate layer for Solana. An owner deposits capital. An operator — agent or human — may act only inside a policy the account enforces. Withdrawal never leaves the owner. Every action and every refusal is a receipt.</p>
<p>Give an agent your capital. Keep the keys.</p>
<p class="muted">This host is protocol documentation in this repository. Marketing is <a href="https://markovhq.com">markovhq.com</a> (a different property). Float, the consumer console, runs in this same repo at <a href="http://127.0.0.1:3000">http://127.0.0.1:3000</a> when you <code>bun run dev</code>.</p>
<p><a href="/docs">Documentation index</a> · <a href="/llms.txt">llms.txt</a></p>
`,
  },
  {
    path: "/docs",
    title: "Docs",
    body: `
<h1>Docs</h1>
<p>All six products live in this repository. Paths, not remotes.</p>
<ul>
  <li><strong>markov-program</strong> — <code>programs/</code>, <a href="/docs/program">program reference</a></li>
  <li><strong>markov-sdk</strong> — <code>packages/sdk</code>, <code>packages/operator</code>, <a href="/docs/sdk">SDK</a></li>
  <li><strong>float-web</strong> — <code>apps/web</code>, <code>apps/api</code>, <code>apps/indexer</code></li>
  <li><strong>float-agents</strong> — <code>apps/agents</code>, <code>apps/data-api</code></li>
  <li><strong>float-bot</strong> — <code>apps/bot</code></li>
  <li><strong>markov-site</strong> — this docs host, <code>apps/site</code></li>
</ul>
<h2>Concepts</h2>
<ul>
  <li><a href="/docs/mandates">Mandates</a></li>
  <li><a href="/docs/policy">Policy</a></li>
  <li><a href="/docs/receipts">Receipts and refusals</a></li>
  <li><a href="/docs/kill-switch">The kill switch</a></li>
</ul>
<h2>Guides</h2>
<ul>
  <li><a href="/docs/owners">For owners</a></li>
  <li><a href="/docs/operators">For operators</a></li>
  <li><a href="/docs/venues">For venues</a></li>
</ul>
<h2>Reference</h2>
<ul>
  <li><a href="/docs/program">Program</a></li>
  <li><a href="/docs/sdk">SDK</a></li>
  <li><a href="/docs/block-reason">BlockReason</a></li>
  <li><a href="/docs/data-api">Data API</a></li>
  <li><a href="/docs/security">Security</a></li>
</ul>
`,
  },
  {
    path: "/docs/mandates",
    title: "Mandates",
    body: `
<h1>Mandates</h1>
<p>A mandate is a fenced account: owner, operator, optional emergency key, policy, vault, expiry. State is Active, Paused, or Revoked. Revoked is terminal.</p>
<p>PDA (on-chain): <code>[b"mandate", owner, nonce]</code>. Live engine ids look like <code>mdt_0001</code>.</p>
<p>Only the owner credits the vault (<code>fund</code>) or takes funds out (<code>owner_withdraw</code>, any state). The operator never receives vault tokens. Operator movement is allowlisted venue apply or budgeted <code>spend</code>.</p>
`,
  },
  {
    path: "/docs/policy",
    title: "Policy",
    body: `
<h1>Policy</h1>
<p>Copied onto the mandate at create and replaceable by the owner via <code>amend_policy</code> (not when Revoked).</p>
<ul>
  <li>program allowlist: 1–4 program ids</li>
  <li>token allowlist: 1–4 mints (this prototype: USDC-d, DEMO)</li>
  <li>per-tx cap and UTC-day notional cap</li>
  <li>spend per-call and UTC-day spend caps (x402)</li>
  <li>max slippage bps (swaps)</li>
</ul>
<p>Empty or oversized allowlists throw at create/amend. They are not a <code>BlockReason</code>.</p>
<p>Gate order: <a href="/docs/block-reason">BlockReason</a>.</p>
`,
  },
  {
    path: "/docs/receipts",
    title: "Receipts and refusals",
    body: `
<h1>Receipts and refusals</h1>
<p>Events: MandateCreated, MandateFunded, PolicyAmended, ActionExecuted, ActionRefused, Paused, Unpaused, Revoked, OwnerWithdrew.</p>
<p>Exactly one of ActionExecuted or ActionRefused per execute or spend. A refusal increments nonce and mutates no vault, no spentToday, no spendToday.</p>
<p>Refusals are successful transactions. <code>GuardedResult.status === "blocked"</code> is data. Do not treat it as <code>err</code>.</p>
<p>Anchor EventParser emits camelCase (<code>actionRefused</code>). Compare case-insensitively.</p>
`,
  },
  {
    path: "/docs/kill-switch",
    title: "The kill switch",
    body: `
<h1>The kill switch</h1>
<p>Owner or emergency key: pause and revoke. Unpause is owner-only. A compromised emergency key can only over-protect.</p>
<p>Float console exposes Pause, Revoke via bot, and owner withdraw. The Telegram bot is the same emergency surface: <code>/pause</code>, <code>/revoke</code>, <code>/status</code>, <code>/link</code>. No trade, spend, or withdraw commands.</p>
`,
  },
  {
    path: "/docs/owners",
    title: "For owners",
    body: `
<h1>For owners</h1>
<ol>
  <li>Hire an operator on Float (or <code>create_mandate</code>).</li>
  <li>Fund USDC-d. You remain the only withdraw authority.</li>
  <li>Watch receipts. Over-cap and revoke show as ActionRefused, not crashes.</li>
  <li>Pause, revoke, or withdraw at any time. Withdraw works in Active, Paused, and Revoked.</li>
</ol>
<p>Local: <a href="http://127.0.0.1:3000">Float</a>. No browser wallet on this prototype; demo owner is <code>owner_demo</code>.</p>
`,
  },
  {
    path: "/docs/operators",
    title: "For operators",
    body: `
<h1>For operators</h1>
<p>Use <code>@markovfyi/operator</code>. Propose swap, deposit, or spend. Read <code>GuardedResult</code>. Never call venue programs with the operator key. Never withdraw.</p>
<p>On <code>blockedBy: "Revoked"</code>, halt that mandate. Do not retry the same intent after a block; change size, route, or stop.</p>
<p>Skill: <code>packages/sdk/SKILL.md</code>. HTTP client: <code>@markov/sdk</code> against <code>apps/api</code>.</p>
`,
  },
  {
    path: "/docs/venues",
    title: "For venues",
    body: `
<h1>For venues</h1>
<p>Phase 0 ships stub adapters: <code>demo_swap</code> (constant-rate USDC-d/DEMO) and <code>demo_yield</code> (share accounting). They fake liquidity. They do not enforce policy. The mandate gate stack still runs in full. Every accept or refuse is a real receipt.</p>
<p>x402 is budgeted <code>spend</code> with a nonce memo, then the caller fetches. HTTP 402 on unpaid <code>GET /price/:symbol</code>.</p>
`,
  },
  {
    path: "/docs/program",
    title: "Program",
    body: `
<h1>Program</h1>
<p>Instructions: register_operator, create_mandate, fund, amend_policy, pause, unpause (owner only), revoke, owner_withdraw, execute_swap, execute_deposit, execute_withdraw_venue, spend.</p>
<p>Live semantics today: TypeScript <code>packages/engine</code>. Anchor port: <code>programs/mandate</code>. Quote program ids from <code>docs/FACTS.md</code> only.</p>
<p>Full tables: repo <code>SPEC.md</code>.</p>
`,
  },
  {
    path: "/docs/sdk",
    title: "SDK",
    body: `
<h1>SDK</h1>
<p><code>@markov/sdk</code> is the HTTP client for <code>apps/api</code>. <code>@markovfyi/operator</code> signs guarded on-chain proposes and returns GuardedResult.</p>
<pre><code>import { OperatorClient } from "@markovfyi/operator";

const result = await ops.proposeSwap({ owner, seed, mintIn, mintOut, minOut, quote, idempotencyKey });
if (result.status === "blocked") {
  // result.blockedBy is a BlockReason. The tx is a receipt.
}
</code></pre>
<p>Quickstart in <code>packages/sdk/README.md</code> and <code>packages/operator/README.md</code>.</p>
`,
  },
  {
    path: "/docs/block-reason",
    title: "BlockReason",
    body: `
<h1>BlockReason</h1>
<pre><code>Paused | Revoked | Expired | Unauthorized
ProgramNotAllowed | TokenNotAllowed
OverTxCap | OverDailyCap
OverSpendCap | OverSpendDailyCap
SlippageExceeded
</code></pre>
<p>Gate order, fail-closed, first match wins:</p>
<ol>
  <li>Paused</li>
  <li>Revoked</li>
  <li>Expired</li>
  <li>Unauthorized (caller ≠ operator)</li>
  <li>ProgramNotAllowed</li>
  <li>TokenNotAllowed</li>
  <li>OverSpendCap / OverSpendDailyCap (spend only)</li>
  <li>OverTxCap / OverDailyCap (non-spend)</li>
  <li>SlippageExceeded (swap)</li>
  <li>CPI / apply</li>
</ol>
<p>UTC day is <code>floor(unix_ts / 86400)</code>, not a rolling 24h window. Source: <code>MandateEngine.gate</code>.</p>
`,
  },
  {
    path: "/docs/data-api",
    title: "Data API",
    body: `
<h1>Data API</h1>
<p><code>GET /price/:symbol</code> returns HTTP 402 with amount, memo, and recipient. It does not return a free quote.</p>
<p><code>POST /price/:symbol</code> with <code>{ mandateId }</code> runs mandate <code>spend</code> (20_000 units, memo <code>x402:SYMBOL</code>) then returns the quote. A refused spend is still a receipt.</p>
<p>Local: <code>http://127.0.0.1:8788</code> (<code>bun run dev:services</code>).</p>
`,
  },
  {
    path: "/docs/security",
    title: "Security",
    body: `
<h1>Security</h1>
<p>Three keys: owner (withdraw, amend, unpause), operator (execute/spend only), emergency (pause and revoke only).</p>
<p>Devnet software, pre-audit. Do not use with real value. Report issues to <a href="mailto:security@markov.fyi">security@markov.fyi</a>. Do not file public GitHub issues for key exposure.</p>
<p>Full model: repo <code>SECURITY.md</code>.</p>
`,
  },
];

export function pageFor(pathname: string): Page | undefined {
  const path = pathname.replace(/\/$/, "") || "/";
  return PAGES.find((p) => p.path === path);
}

export function render(page: Page): string {
  const links = [
    ["/", "Markov"],
    ["/docs", "Docs"],
    ["http://127.0.0.1:3000", "Float"],
    ["https://markovhq.com", "markovhq.com"],
  ];
  const nav = links
    .map(([href, label]) => {
      const current = href === page.path ? ' aria-current="page"' : "";
      return `<a href="${href}"${current}>${label}</a>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${page.title} — Markov</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="stylesheet" href="/style.css"/>
</head>
<body>
<header><nav>${nav}</nav></header>
<main>${page.body}</main>
<footer>Protocol docs in this repository. Marketing: markovhq.com. Not a restyle of that site.</footer>
</body>
</html>`;
}
