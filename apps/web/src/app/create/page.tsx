"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, type FormEvent } from "react";
import { api } from "@/lib/api";

function CreateForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [operator, setOperator] = useState(params.get("operator") ?? "op_dca");
  const [amount, setAmount] = useState("80");
  const [perTx, setPerTx] = useState("25");
  const [daily, setDaily] = useState("100");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fundAmount = useMemo(() => Math.round(Number(amount) * 1_000_000), [amount]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
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
    try {
      const mandate = await api<{ id: string }>("/mandates", {
        method: "POST",
        body: JSON.stringify({
          operator,
          fundAmount,
          policy: {
            perTxCap: Math.round(txCap * 1_000_000),
            dailyCap: Math.round(dayCap * 1_000_000),
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
    <form className="card" onSubmit={onSubmit} style={{ maxWidth: 520 }}>
      <label htmlFor="operator">Operator</label>
      <select id="operator" value={operator} onChange={(e) => setOperator(e.target.value)}>
        <option value="op_dca">DCA (first-party agent)</option>
        <option value="op_dip">Dip buyer (first-party agent)</option>
        <option value="op_yield">Yield rotation (first-party agent)</option>
      </select>
      <label htmlFor="fund">Fund (USDC-d)</label>
      <input
        id="fund"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <label htmlFor="per-tx">Per-tx cap (USDC-d)</label>
      <input
        id="per-tx"
        inputMode="decimal"
        value={perTx}
        onChange={(e) => setPerTx(e.target.value)}
      />
      <label htmlFor="daily">Daily cap (USDC-d)</label>
      <input
        id="daily"
        inputMode="decimal"
        value={daily}
        onChange={(e) => setDaily(e.target.value)}
      />
      <p className="meta" style={{ marginTop: 14 }}>
        Emergency key is the Float bot. It can pause or revoke, never withdraw. Operator cannot
        move funds off the mandate except through allowlisted venues. Caps can only tighten versus
        the demo ceiling.
      </p>
      {err ? (
        <p className="no" role="alert">
          {err}
        </p>
      ) : null}
      <div className="actions">
        <button className="btn" disabled={busy} type="submit" aria-busy={busy}>
          {busy ? "Creating…" : "Create and fund"}
        </button>
      </div>
    </form>
  );
}

export default function CreatePage() {
  return (
    <main className="wrap" id="main">
      <p className="eyebrow">New mandate</p>
      <h1>Configure, then deposit.</h1>
      <p className="lede">
        You stay the owner. The operator gets a fenced right to act — not your keys. Thirty-day
        expiry unless you amend.
      </p>
      <Suspense fallback={<p className="meta">Loading form…</p>}>
        <CreateForm />
      </Suspense>
    </main>
  );
}
