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
    try {
      const mandate = await api<{ id: string }>("/mandates", {
        method: "POST",
        body: JSON.stringify({
          operator,
          fundAmount,
          policy: {
            perTxCap: Math.round(Number(perTx) * 1_000_000),
            dailyCap: Math.round(Number(daily) * 1_000_000),
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
      <label>Operator</label>
      <select value={operator} onChange={(e) => setOperator(e.target.value)}>
        <option value="op_dca">DCA (first-party agent)</option>
        <option value="op_dip">Dip buyer (first-party agent)</option>
        <option value="op_yield">Yield rotation (first-party agent)</option>
      </select>
      <label>Fund (USDC-d)</label>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} />
      <label>Per-tx cap (USDC-d)</label>
      <input value={perTx} onChange={(e) => setPerTx(e.target.value)} />
      <label>Daily cap (USDC-d)</label>
      <input value={daily} onChange={(e) => setDaily(e.target.value)} />
      <p className="meta" style={{ marginTop: 14 }}>
        Emergency key is the Float bot. It can pause or revoke, never withdraw. Operator cannot
        move funds off the mandate except through allowlisted venues.
      </p>
      {err ? <p className="no">{err}</p> : null}
      <div className="actions">
        <button className="btn" disabled={busy} type="submit">
          {busy ? "Creating…" : "Create and fund"}
        </button>
      </div>
    </form>
  );
}

export default function CreatePage() {
  return (
    <main className="wrap">
      <p className="eyebrow">New mandate</p>
      <h1>Configure, then deposit.</h1>
      <p className="lede">
        You stay the owner. The operator gets a fenced right to act — not your keys. Thirty-day
        expiry unless you amend.
      </p>
      <Suspense>
        <CreateForm />
      </Suspense>
    </main>
  );
}
