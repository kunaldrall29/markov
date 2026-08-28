import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import type { ReactNode } from "react";

export default function Home(): ReactNode {
  return (
    <Layout
      title="Markov"
      description="Protocol documentation in this repository. Marketing is markovhq.com, a different property."
    >
      <main className="wrap home-page" id="main">
        <p className="eyebrow">Protocol docs · this repository</p>
        <h1>
          Give an agent your capital. <em>Keep the keys.</em>
        </h1>
        <p className="lede">
          The mandate layer for Solana. An owner deposits capital. An operator — agent or human —
          may act only inside a policy the account enforces. Withdrawal never leaves the owner.
          Every action and every refusal is a receipt.
        </p>
        <div className="actions">
          <Link className="btn authority" to="/docs">
            Documentation index
          </Link>
          <Link className="btn ghost" to="/receipts">
            Live receipts
          </Link>
          <a className="btn ghost" href="http://127.0.0.1:3000">
            Float
          </a>
        </div>
        <p className="foot">
          This host is protocol documentation in this repository, built with Docusaurus. Marketing
          is <a href="https://markovhq.com">markovhq.com</a> (a different property). Float, the
          consumer console, runs in this same repo at{" "}
          <a href="http://127.0.0.1:3000">http://127.0.0.1:3000</a> when you <code>bun run dev</code>
          .
        </p>
      </main>
    </Layout>
  );
}
