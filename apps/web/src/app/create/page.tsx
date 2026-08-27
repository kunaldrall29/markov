"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { api, formatAmount, type StrategyCard } from "@/lib/api";

function CreateForm() {
  const params = useSearchParams();
  const router = useRouter();
  const requested = params.get("strategy") ?? params.get("operator") ?? "momentum";
  const [strategies, setStrategies] = useState<StrategyCard[]>([]);
  const [slug, setSlug] = useState(requested);
  const [amount, setAmount] = useState("80");
  const [perTx, setPerTx] = useState("");
  const [daily, setDaily] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<StrategyCard[]>("/strategies")
      .then((rows) => {
        setStrategies(rows);
        const match =
          rows.find((s) => s.slug === requested || s.template.operator === requested || s.strategyId === requested) ??
          rows[0];
        if (match) {
          setSlug(match.slug);
          setPerTx(String(match.template.caps.per_tx / 1_000_000));
          setDaily(String(match.template.caps.daily / 1_000_000));
        }
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "failed to load strategies"));
  }, [requested]);

  const selected = strategies.find((s) => s.slug === slug) ?? strategies[0];
  const fundAmount = useMemo(() => Math.round(Number(amount) * 1_000_000), [amount]);
  const templateTx = selected ? selected.template.caps.per_tx / 1_000_000 : 0;
  const templateDaily = selected ? selected.template.caps.daily / 1_000_000 : 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setErr("");
    const fund = Number(amount);
    const txCap = Number(perTx);
    const dayCap = Number(daily);
    if (!Number.isFinite(fund) || fund <= 0 || !Number.isFinite(txCap) || txCap <= 0 || !Number.isFinite(dayCap) || dayCap <= 0) {
      setErr("Fund and caps must be positive numbers.");
      setBusy(false);
      return;
    }
    if (txCap > templateTx || dayCap > templateDaily) {
      setErr("Overrides may only tighten the published template.");
      setBusy(false);
      return;
    }
    try {
      const mandate = await api<{ id: string }>("/mandates", {
        method: "POST",
        body: JSON.stringify({
          strategyId: selected.strategyId,
          fundAmount,
          overrides: {
            caps: {
              per_tx: Math.round(txCap * 1_000_000),
              daily: Math.round(dayCap * 1_000_000),
            },
          },
        }),
      });
      router.push(`/m/${mandate.id}`);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "failed");
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} style={{ maxWidth: 560 }}>
      <label htmlFor="strategy">Strategy</label>
      <select
        id="strategy"
        value={slug}
        onChange={(e) => {
          const next = strategies.find((s) => s.slug === e.target.value);
          setSlug(e.target.value);
          if (next) {
            setPerTx(String(next.template.caps.per_tx / 1_000_000));
            setDaily(String(next.template.caps.daily / 1_000_000));
          }
        }}
      >
        {strategies.map((s) => (
          <option key={s.slug} value={s.slug}>
            {s.name} ({s.template.operator})
          </option>
        ))}
      </select>
      <label htmlFor="fund">Fund (USDC-d)</label>
      <input id="fund" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <label htmlFor="per-tx">Per-tx cap (USDC-d)</label>
      <input id="per-tx" inputMode="decimal" value={perTx} onChange={(e) => setPerTx(e.target.value)} />
      <label htmlFor="daily">Daily cap (USDC-d)</label>
      <input id="daily" inputMode="decimal" value={daily} onChange={(e) => setDaily(e.target.value)} />
      {selected ? (
        <p className="meta" style={{ marginTop: 14 }}>
          Template {selected.name}: per-tx {formatAmount(selected.template.caps.per_tx)}, daily{" "}
          {formatAmount(selected.template.caps.daily)}. Your mandate: per-tx {perTx || "—"}, daily {daily || "—"}.
          Overrides may only lower caps. Funds stay in your mandate account.
        </p>
      ) : null}
      <p className="meta">
        Emergency key is the Float bot. It can pause or revoke, never withdraw. Operator cannot move
        funds off the mandate except through allowlisted venues.
      </p>
      {err ? (
        <p className="no" role="alert">
          {err}
        </p>
      ) : null}
      <div className="actions">
        <button className="btn" disabled={busy || !selected} type="submit" aria-busy={busy}>
          {busy ? "Subscribing…" : "Subscribe and fund"}
        </button>
      </div>
    </form>
  );
}

export default function CreatePage() {
  return (
    <main className="wrap" id="main">
      <p className="eyebrow">Subscribe</p>
      <h1>Template, then tighten.</h1>
      <p className="lede">
        You stay the owner. The operator gets a fenced right to act — not your keys. Caps and
        allowlists can only tighten versus the published strategy.
      </p>
      <Suspense fallback={<p className="meta">Loading form…</p>}>
        <CreateForm />
      </Suspense>
    </main>
  );
}
