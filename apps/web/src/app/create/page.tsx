"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { applyOverrides, type PolicyTemplate } from "@markov/sdk/overrides";
import { api, type StrategyCard } from "@/lib/api";
import { copy } from "@/lib/copy";
import { CapStepper } from "@/components/CapStepper";
import { PolicyChip } from "@/components/PolicyChip";
import { TemplateDiff } from "@/components/TemplateDiff";
import { useToast } from "@/components/Toast";

function asTemplate(s: StrategyCard): PolicyTemplate {
  return {
    template_version: "0",
    operator: s.template.operator,
    venue_allowlist: s.template.venue_allowlist,
    token_allowlist: s.template.token_allowlist,
    caps: s.template.caps,
    execution_bounds: s.template.execution_bounds,
    x402_budget: s.template.x402_budget,
    fee_terms: s.template.fee_terms ?? { mgmt_bps: 0, perf_bps: 0 },
    expiry_default_days: s.template.expiry_default_days,
  };
}

function CreateForm() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const requested = params.get("strategy") ?? params.get("operator") ?? "momentum";
  const [strategies, setStrategies] = useState<StrategyCard[]>([]);
  const [slug, setSlug] = useState(requested);
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState("80");
  const [perTx, setPerTx] = useState(0);
  const [daily, setDaily] = useState(0);
  const [days, setDays] = useState(30);
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
          setPerTx(match.template.caps.per_tx / 1_000_000);
          setDaily(match.template.caps.daily / 1_000_000);
          setDays(match.template.expiry_default_days);
        }
      })
      .catch((e) => setErr(e instanceof Error ? e.message : copy.marketplace.error));
  }, [requested]);

  const selected = strategies.find((s) => s.slug === slug) ?? strategies[0];
  const templateTx = selected ? selected.template.caps.per_tx / 1_000_000 : 0;
  const templateDaily = selected ? selected.template.caps.daily / 1_000_000 : 0;
  const templateDays = selected?.template.expiry_default_days ?? 30;

  function tightenError(): string {
    if (!selected) return copy.subscribe.loading;
    try {
      applyOverrides(asTemplate(selected), {
        caps: {
          per_tx: Math.round(perTx * 1_000_000),
          daily: Math.round(daily * 1_000_000),
        },
        expiry_default_days: days,
      });
      return "";
    } catch (error) {
      return error instanceof Error ? error.message : copy.subscribe.tightenOnly;
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const blocked = tightenError();
    if (blocked) {
      setErr(blocked);
      setStep(2);
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const mandate = await api<{ id: string }>("/mandates", {
        method: "POST",
        body: JSON.stringify({
          strategyId: selected.strategyId,
          fundAmount: Math.round(Number(amount) * 1_000_000),
          overrides: {
            caps: {
              per_tx: Math.round(perTx * 1_000_000),
              daily: Math.round(daily * 1_000_000),
            },
            expiry_default_days: days,
          },
        }),
      });
      toast(copy.subscribe.created);
      router.push(`/m/${mandate.id}`);
    } catch (error) {
      setErr(error instanceof Error ? error.message : copy.toast.failed);
      setBusy(false);
    }
  }

  if (!selected && !err) {
    return <p className="meta">{copy.subscribe.loading}</p>;
  }

  return (
    <form className="card" onSubmit={onSubmit} style={{ maxWidth: 640 }} aria-busy={busy}>
      <p className="steps">
        {copy.subscribe.stepTemplate} → {copy.subscribe.stepCaps} → {copy.subscribe.stepDiff} →{" "}
        {copy.subscribe.stepFund}
      </p>
      {step === 0 ? (
        <>
          <label htmlFor="strategy">{copy.strategy.eyebrow}</label>
          <select
            id="strategy"
            value={slug}
            onChange={(e) => {
              const next = strategies.find((s) => s.slug === e.target.value);
              setSlug(e.target.value);
              if (next) {
                setPerTx(next.template.caps.per_tx / 1_000_000);
                setDaily(next.template.caps.daily / 1_000_000);
                setDays(next.template.expiry_default_days);
              }
            }}
          >
            {strategies.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name} ({s.template.operator})
              </option>
            ))}
          </select>
          {selected ? (
            <div className="chips" style={{ marginTop: 16 }}>
              <PolicyChip tone="authority">per-tx ≤ {templateTx}</PolicyChip>
              <PolicyChip>daily ≤ {templateDaily}</PolicyChip>
              <PolicyChip>expiry {templateDays}d</PolicyChip>
              {selected.template.venue_allowlist.map((v) => (
                <PolicyChip key={v}>{v}</PolicyChip>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
      {step === 1 && selected ? (
        <>
          <CapStepper id="per-tx" label={copy.subscribe.perTx} value={perTx} max={templateTx} onChange={setPerTx} />
          <CapStepper id="daily" label={copy.subscribe.daily} value={daily} max={templateDaily} onChange={setDaily} />
          <CapStepper id="days" label={copy.subscribe.expiry} value={days} max={templateDays} onChange={setDays} />
        </>
      ) : null}
      {step === 2 && selected ? (
        <>
          <TemplateDiff
            name={selected.name}
            templateTx={templateTx}
            yoursTx={perTx}
            templateDaily={templateDaily}
            yoursDaily={daily}
            templateDays={templateDays}
            yoursDays={days}
          />
          {tightenError() ? (
            <p className="no" role="alert">
              {tightenError()}
            </p>
          ) : null}
        </>
      ) : null}
      {step === 3 ? (
        <>
          <label htmlFor="fund">{copy.subscribe.fundLabel}</label>
          <input id="fund" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <p className="meta">{copy.subscribe.tightenOnly}</p>
        </>
      ) : null}
      {err ? (
        <p className="no" role="alert">
          {err}
        </p>
      ) : null}
      <div className="actions">
        {step > 0 ? (
          <button className="btn ghost" type="button" onClick={() => setStep((s) => s - 1)}>
            {copy.subscribe.back}
          </button>
        ) : null}
        {step < 3 ? (
          <button
            className="btn"
            type="button"
            onClick={() => {
              const blocked = tightenError();
              if (blocked) {
                setErr(blocked);
                setStep(2);
                return;
              }
              setErr("");
              setStep((s) => s + 1);
            }}
            disabled={!selected}
          >
            {copy.subscribe.next}
          </button>
        ) : (
          <button className="btn" disabled={busy || !selected} type="submit">
            {busy ? copy.subscribe.pending : copy.subscribe.fund}
          </button>
        )}
      </div>
    </form>
  );
}

export default function CreatePage() {
  return (
    <main className="wrap" id="main">
      <p className="eyebrow">{copy.subscribe.eyebrow}</p>
      <h1>{copy.subscribe.title}</h1>
      <p className="lede">{copy.subscribe.lede}</p>
      <Suspense fallback={<p className="meta">{copy.subscribe.loading}</p>}>
        <CreateForm />
      </Suspense>
    </main>
  );
}
