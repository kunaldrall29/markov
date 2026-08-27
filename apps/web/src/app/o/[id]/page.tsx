import Link from "next/link";
import { api, formatAmount, type OperatorRow } from "@/lib/api";
import { copy } from "@/lib/copy";
import { TrackRecordCard } from "@/components/TrackRecordCard";

export default async function OperatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let row: OperatorRow | null = null;
  let error = "";
  try {
    row = await api<OperatorRow>(`/operators/${id}`);
  } catch (e) {
    error = e instanceof Error ? e.message : copy.operator.missing;
  }

  return (
    <main className="wrap" id="main">
      <p className="eyebrow">{copy.operator.eyebrow}</p>
      {error || !row ? (
        <p className="no" role="alert">
          {error || copy.operator.missing}
        </p>
      ) : (
        <>
          <h1>
            {row.name}.{" "}
            <em>{row.authority === "markov-redteam" ? copy.operator.labeled : copy.operator.publicRecord}</em>
          </h1>
          <p className="lede">{row.blurb}</p>
          <TrackRecordCard
            name={row.name}
            handle={row.authority}
            actions={row.stats?.actions ?? 0}
            refusals={row.stats?.refusals ?? 0}
            tenureSecs={row.stats?.tenureSecs ?? 0}
          />
          <div className="actions" style={{ marginTop: 16 }}>
            <Link className="btn ghost" href={`/o/${row.authority}/card`}>
              {copy.operator.publicRecord}
            </Link>
          </div>
          <p className="meta" style={{ marginTop: 16 }}>
            pnl {formatAmount(row.stats?.pnl ?? 0)} · {copy.marketplace.chainLabel}
          </p>
          <div className="grid" style={{ marginTop: 24 }}>
            {row.strategies.map((s) => (
              <article className="card" key={s.strategyId}>
                <p className="meta">{s.slug}</p>
                <h3>{s.name}</h3>
                <p className="meta">
                  {s.stats.actions} actions · {s.stats.refusals} refusals
                </p>
                <div className="actions">
                  <Link className="btn" href={`/s/${s.slug}`}>
                    {copy.strategy.eyebrow}
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
