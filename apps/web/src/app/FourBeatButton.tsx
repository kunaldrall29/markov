"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

export function FourBeatButton() {
  const router = useRouter();
  const [busy, setBusy] = useState<"four" | "vault" | "">("");
  const [err, setErr] = useState("");

  async function runFour() {
    setBusy("four");
    setErr("");
    try {
      const result = await api<{ mandateId: string }>("/demo/four-beat", { method: "POST" });
      router.push(`/m/${result.mandateId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "demo failed");
      setBusy("");
    }
  }

  async function runVault() {
    setBusy("vault");
    setErr("");
    try {
      await api("/demo/strategy-vault", { method: "POST" });
      router.push("/s/momentum");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "demo failed");
      setBusy("");
    }
  }

  return (
    <div style={{ margin: "0 0 28px" }}>
      <div className="actions" style={{ marginTop: 0 }}>
        <button
          className="btn gold"
          disabled={Boolean(busy)}
          onClick={runFour}
          type="button"
          aria-busy={busy === "four"}
        >
          {busy === "four" ? "Running four-beat…" : "Run four-beat demo"}
        </button>
        <button
          className="btn ghost"
          disabled={Boolean(busy)}
          onClick={runVault}
          type="button"
          aria-busy={busy === "vault"}
        >
          {busy === "vault" ? "Running strategy-vault…" : "Run strategy-vault demo"}
        </button>
      </div>
      {err ? (
        <p className="no" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
