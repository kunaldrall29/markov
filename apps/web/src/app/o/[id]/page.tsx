import Link from "next/link";
import { api, formatAmount, type StrategyCard } from "@/lib/api";

interface OperatorRow {
  authority: string;
  name: string;
  blurb: string;
  kind: string;
  feeBps: number;
  stats: {
    actions: number;
    refusals: number;
    volume: number;
    mandates: number;
  } | null;
  strategies: StrategyCard[];
}

export default async function OperatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let row: OperatorRow | null = null;
  let error = "";
  try {
    row = await api<OperatorRow>(`/operators/${id}`);
  } catch (e) {
    error = e instanceof Error ? e.message : "failed";
  }

  return (
    <main className="wrap" id="main">
      <p className="eyebrow">Operator</p>
      {error || !row ? (
        <p className="no" role="alert">
          {error || "Unknown operator."}
        </p>
      ) : (
        <>
          <h1>
            {row.name}. <em>{row.authority === "markov-redteam" ? "Labeled adversary." : "Public record."}</em>
          </h1>
          <p className="lede">{row.blurb}</p>
          <div className="chips">
            <span className="chip">{row.kind}</span>
            <span className="chip">fee {row.feeBps / 100}%</span>
            <span className="chip">actions {row.stats?.actions ?? 0}</span>
            <span className={`chip ${row.stats?.refusals ? "warn" : ""}`}>
              refusals {row.stats?.refusals ?? 0}
            </span>
            <span className="chip">vol {formatAmount(row.stats?.volume ?? 0)}</span>
            <span className="chip">mandates {row.stats?.mandates ?? 0}</span>
          </div>
          <div className="grid" style={{ marginTop: 24 }}>
            {row.strategies.map((s) => (
              <article className="card" key={s.strategyId}>
                <p className="meta">{s.slug}</p>
                <h3>{s.name}</h3>
                <p className="meta">
                  actions {s.stats.actions} · refusals {s.stats.refusals}
                </p>
                <div className="actions">
                  <Link className="btn" href={`/s/${s.slug}`}>
                    Strategy
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
