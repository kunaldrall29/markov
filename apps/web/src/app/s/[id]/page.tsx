"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatAmount, type StrategyCard } from "@/lib/api";
import { copy } from "@/lib/copy";
import { useApi } from "@/lib/useApi";
import { engineDemoAllowed } from "@markov/rpc";
import { PolicyChip } from "@/components/PolicyChip";
import { ReceiptRow, type ReceiptLike } from "@/components/ReceiptRow";
import { RecordStrip } from "@/components/RecordStrip";
import { useToast } from "@/components/Toast";

export default function StrategyPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { api } = useApi();
  const [row, setRow] = useState<StrategyCard | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [refusalsOnly, setRefusalsOnly] = useState(false);

  const refresh = useCallback(async () => {
    const data = await api<StrategyCard>(`/strategies/${id}`);
    setRow(data);
  }, [id, api]);

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

  const receipts = useMemo(() => {
    const all = [...(row?.receipts ?? [])].reverse() as ReceiptLike[];
    if (!refusalsOnly) return all;
    return all.filter((r) => r.type === "ActionRefused");
  }, [row, refusalsOnly]);

  async function fanOut() {
    setBusy(true);
    setErr("");
    try {
      await api(`/strategies/${id}/fan-out`, { method: "POST", body: JSON.stringify({}) });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : copy.toast.failed);
    } finally {
      setBusy(false);
    }
  }

  async function sweep() {
    setBusy(true);
    setErr("");
    try {
      await api(`/agents/redteam/sweep`, { method: "POST" });
      toast(copy.strategy.sweepToast);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : copy.toast.failed);
    } finally {
      setBusy(false);
    }
  }

  if (!row) {
    return (
      <main className="wrap" id="main">
        <p className="eyebrow">{copy.strategy.eyebrow}</p>
        {err ? (
          <p className="no" role="alert">
            {err}
          </p>
        ) : (
          <p className="meta">{copy.strategy.loading}</p>
        )}
      </main>
    );
  }

  return (
    <main className="wrap" id="main">
      <p className="eyebrow">
        {copy.strategy.eyebrow} · {row.slug}
        {row.labeled ? ` · ${copy.strategy.labeled}` : ""}
      </p>
      <h1>
        {row.name}. <em>{row.stats.refusals} refusals.</em>
      </h1>
      <p className="lede">{row.blurb}</p>
      <RecordStrip
        actions={row.stats.actions}
        refusals={row.stats.refusals}
        tenureSecs={row.stats.tenureSecs}
        feesBps={row.stats.feesBps ?? row.template.fee_terms?.mgmt_bps ?? 0}
      />
      <div className="chips">
        <PolicyChip tone="authority">per-tx ≤ {formatAmount(row.template.caps.per_tx)}</PolicyChip>
        <PolicyChip>daily ≤ {formatAmount(row.template.caps.daily)}</PolicyChip>
        {row.template.venue_allowlist.map((v) => (
          <PolicyChip key={v}>{v}</PolicyChip>
        ))}
        <PolicyChip>subs {row.stats.subscribers}</PolicyChip>
        <PolicyChip>pnl {formatAmount(row.stats.pnl ?? 0)}</PolicyChip>
      </div>
      <div className="actions" style={{ marginTop: 0, marginBottom: 22 }}>
        <Link className="btn" href={`/create?strategy=${row.slug}`}>
          {copy.strategy.subscribe}
        </Link>
        <Link className="btn ghost" href={`/o/${row.template.operator}`}>
          {copy.strategy.operator}
        </Link>
        {engineDemoAllowed() ? (
          <button className="btn ghost" type="button" disabled={busy} onClick={fanOut}>
            {copy.strategy.fanOut}
          </button>
        ) : null}
        {engineDemoAllowed() && row.slug === "redteam" ? (
          <button className="btn kill" type="button" disabled={busy} onClick={sweep}>
            {copy.strategy.sweep}
          </button>
        ) : null}
        <button className="btn ghost" type="button" onClick={() => setRefusalsOnly((v) => !v)}>
          {refusalsOnly ? copy.strategy.allFilter : copy.strategy.refusalsFilter}
        </button>
      </div>
      {err ? (
        <p className="no" role="alert">
          {err}
        </p>
      ) : null}
      <h3 style={{ fontFamily: "var(--serif)", fontWeight: 500, fontSize: 28 }}>{copy.console.receipts}</h3>
      <div className="card" style={{ marginTop: 12 }}>
        {receipts.length === 0 ? <p className="meta">{copy.strategy.empty}</p> : null}
        {receipts.map((r, i) => (
          <ReceiptRow key={`${r.type}-${r.ts}-${i}`} receipt={r} />
        ))}
      </div>
    </main>
  );
}
