import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import type { ReactNode } from "react";

export default function Home(): ReactNode {
  return (
    <Layout
      title="Markov"
      description="Protocol documentation in this repository. Marketing is markovhq.com, a different property."
    >
      <main className="container margin-vert--lg">
        <h1>Markov</h1>
        <p>
          The mandate layer for Solana. An owner deposits capital. An operator — agent or human —
          may act only inside a policy the account enforces. Withdrawal never leaves the owner.
          Every action and every refusal is a receipt.
        </p>
        <p>Give an agent your capital. Keep the keys.</p>
        <p>
          This host is protocol documentation in this repository, built with Docusaurus. Marketing
          is <a href="https://markovhq.com">markovhq.com</a> (a different property). Float, the
          consumer console, runs in this same repo at{" "}
          <a href="http://127.0.0.1:3000">http://127.0.0.1:3000</a> when you <code>bun run dev</code>
          .
        </p>
        <p>
          <Link to="/docs">Documentation index</Link> · <a href="/llms.txt">llms.txt</a>
        </p>
      </main>
    </Layout>
  );
}
