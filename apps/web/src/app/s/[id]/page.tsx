"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, formatAmount, type StrategyCard } from "@/lib/api";
import { blockLabel } from "@/lib/reasons";

export default function StrategyPage() {
  const { id } = useParams<{ id: string }>();
  const [row, setRow] = useState<StrategyCard | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const data = await api<StrategyCard>(`/strategies/${id}`);
    setRow(data);
  }, [id]);

  useEffect(() => {
    let alive = true;
    refresh().catch((e) => {
      if (!alive) return;
      setErr(e instanceof Error ? e.message : String(e));
    });
    const t = setInterval(() => refresh().catch(() => undefined), 2000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [refresh]);

  async function fanOut() {
    setBusy(true);
    setErr("");
    try {
      await api(`/strategies/${id}/fan-out`, { method: "POST", body: JSON.stringify({}) });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  async function sweep() {
    setBusy(true);
    setErr("");
    try {
      await api(`/agents/redteam/sweep`, { method: "POST" });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  if (!row) {
    return (
      <main className="wrap" id="main">
        <p className="eyebrow">Strategy</p>
        {err ? (
          <p className="no" role="alert">
            {err}
          </p>
        ) : (
          <p className="meta">Loading strategy…</p>
        )}
      </main>
    );
  }

  const receipts = [...(row.receipts ?? [])].reverse();

  return (
    <main className="wrap" id="main">
      <p className="eyebrow">
        Strategy · {row.slug}
        {row.labeled ? " · labeled redteam" : ""}
      </p>
      <h1>
        {row.name}. <em>{row.stats.refusals} refusals.</em>
      </h1>
      <p className="lede">{row.blurb}</p>
      <div className="chips">
        <span className="chip">actions {row.stats.actions}</span>
        <span className={`chip ${row.stats.refusals ? "warn" : ""}`}>refusals {row.stats.refusals}</span>
        <span className="chip">subs {row.stats.subscribers}</span>
        <span className="chip">vol {formatAmount(row.stats.volume)}</span>
        <span className="chip gold">per-tx {formatAmount(row.template.caps.per_tx)}</span>
        <span className="chip">operator {row.template.operator}</span>
      </div>
      <p className="meta" style={{ marginBottom: 18 }}>
        strategy_id {row.strategyId.slice(0, 16)}…
      </p>
      <div className="actions" style={{ marginTop: 0, marginBottom: 22 }}>
        <Link className="btn" href={`/create?strategy=${row.slug}`}>
          Subscribe
        </Link>
        <Link className="btn ghost" href={`/o/${row.template.operator}`}>
          Operator
        </Link>
        <button className="btn ghost" type="button" disabled={busy} onClick={fanOut}>
          Fan-out tick
        </button>
        {row.slug === "redteam" ? (
          <button className="btn ember" type="button" disabled={busy} onClick={sweep}>
            Redteam sweep
          </button>
        ) : null}
      </div>
      {err ? (
        <p className="no" role="alert">
          {err}
        </p>
      ) : null}
      <h3 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontSize: 28 }}>Receipts</h3>
      <p className="meta">Refusals are receipts. Same strategy_id on every row — not a pool.</p>
      <div className="card" style={{ marginTop: 12 }}>
        {receipts.length === 0 ? <p className="meta">No strategy receipts yet.</p> : null}
        {receipts.map((r, i) => (
          <div className="receipt" key={`${r.type}-${r.ts}-${i}`}>
            <span className={r.type.includes("Refused") || r.type === "Revoked" ? "no" : "ok"}>{r.type}</span>
            <span>
              {"mandateId" in r && r.mandateId ? (
                <>
                  <Link href={`/m/${String(r.mandateId)}`}>{String(r.mandateId)}</Link>{" "}
                </>
              ) : null}
              {"reason" in r && r.reason ? blockLabel(r.reason) : ""}
              {"amountIn" in r && r.amountIn ? ` in ${formatAmount(Number(r.amountIn))}` : ""}
              {"requestedAmount" in r && r.requestedAmount
                ? ` asked ${formatAmount(Number(r.requestedAmount))}`
                : ""}
            </span>
            <span className="meta">{new Date(r.ts * 1000).toISOString().slice(11, 19)}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
