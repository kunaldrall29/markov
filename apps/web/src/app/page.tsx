import Link from "next/link";
import { FourBeatButton } from "./FourBeatButton";
import { api, formatAmount, type StrategyCard } from "@/lib/api";

function rate(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "0%";
  return `${Math.round(n * 1000) / 10}%`;
}

export default async function HomePage() {
  let strategies: StrategyCard[] = [];
  let error = "";
  try {
    strategies = await api<StrategyCard[]>("/strategies");
  } catch (e) {
    error = e instanceof Error ? e.message : "api offline";
  }

  return (
    <main className="wrap" id="main">
      <p className="eyebrow">Float · strategy marketplace</p>
      <h1>
        Give an agent your capital. <em>Keep the keys.</em>
      </h1>
      <p className="lede">
        Subscribe to a strategy — a published policy template. You get your own mandate, with
        tighten-only overrides. Funds stay in that account. Every action and every refusal is a
        receipt stamped with the strategy id. The Telegram bot can pause or revoke, nothing else.
      </p>
      <FourBeatButton />
      {error ? (
        <p className="no">API not reachable ({error}). Start it with bun run dev.</p>
      ) : strategies.length === 0 ? (
        <section className="card">
          <p className="meta">Marketplace</p>
          <h3>No strategies yet.</h3>
          <p className="lede" style={{ marginBottom: 0 }}>
            Restart with bun run dev so Steady-Demo, Momentum-Demo, and Redteam-Demo seed.
          </p>
        </section>
      ) : (
        <div className="grid">
          {strategies.map((s) => (
            <article className="card" key={s.strategyId}>
              <p className="meta">
                {s.template.operator}
                {s.labeled ? " · labeled redteam" : ""}
              </p>
              <h3>{s.name}</h3>
              <p className="lede" style={{ marginBottom: 12 }}>
                {s.blurb}
              </p>
              <div className="chips">
                <span className="chip">actions {s.stats.actions}</span>
                <span className={`chip ${s.stats.refusals ? "warn" : ""}`}>
                  refusals {s.stats.refusals}
                </span>
                <span className="chip">refusal {rate(s.stats.refusalRate)}</span>
                <span className="chip">subs {s.stats.subscribers}</span>
                <span className="chip gold">per-tx {formatAmount(s.template.caps.per_tx)}</span>
                <span className="chip">daily {formatAmount(s.template.caps.daily)}</span>
              </div>
              <div className="actions">
                <Link className="btn" href={`/create?strategy=${s.slug}`}>
                  Subscribe
                </Link>
                <Link className="btn ghost" href={`/s/${s.slug}`}>
                  Record
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="foot">
        Funds sit in mandate accounts only the owner can withdraw from — no Float component, no bot,
        and no operator can send them anywhere else. House operators run on the public operator SDK.
        Local prototype: USDC-d / DEMO on stub venues.
      </p>
    </main>
  );
}
