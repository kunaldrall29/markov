import Link from "next/link";
import { FourBeatButton } from "./FourBeatButton";
import { api } from "@/lib/api";

interface Operator {
  authority: string;
  name: string;
  blurb: string;
  kind: string;
  feeBps: number;
}

export default async function HomePage() {
  let operators: Operator[] = [];
  let error = "";
  try {
    operators = await api<Operator[]>("/operators");
  } catch (e) {
    error = e instanceof Error ? e.message : "api offline";
  }

  return (
    <main className="wrap">
      <p className="eyebrow">Float · marketplace</p>
      <h1>
        Give an agent your capital. <em>Keep the keys.</em>
      </h1>
      <p className="lede">
        Hire an operator — agent or human — under a mandate the account itself enforces. Allowlists,
        caps, spend budgets, expiry. Every action and every refusal is a receipt. Withdrawal only
        ever points at you. The Telegram bot can pause or revoke, nothing else.
      </p>
      <FourBeatButton />
      {error ? (
        <p className="no">API not reachable ({error}). Start it with bun run dev.</p>
      ) : (
        <div className="grid">
          {operators.map((op) => (
            <article className="card" key={op.authority}>
              <p className="meta">
                {op.kind} · fee {op.feeBps / 100}%
              </p>
              <h3>{op.name}</h3>
              <p className="lede" style={{ marginBottom: 18 }}>
                {op.blurb}
              </p>
              <Link className="btn" href={`/create?operator=${op.authority}`}>
                Hire in one click
              </Link>
            </article>
          ))}
        </div>
      )}
      <p className="foot">
        Funds sit in mandate accounts only the owner can withdraw from — no Float component, no bot,
        and no operator can send them anywhere else. First-party agents run on the public operator
        SDK. Local prototype: USDC-d / DEMO on stub venues.
      </p>
    </main>
  );
}
