"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { copy } from "@/lib/copy";
import { useToast } from "@/components/Toast";

export function FourBeatButton() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<"four" | "vault" | "">("");
  const [err, setErr] = useState("");

  async function runFour() {
    setBusy("four");
    setErr("");
    try {
      const result = await api<{ mandateId: string }>("/demo/four-beat", { method: "POST" });
      toast(copy.subscribe.created);
      router.push(`/m/${result.mandateId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : copy.toast.failed);
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
      setErr(e instanceof Error ? e.message : copy.toast.failed);
      setBusy("");
    }
  }

  return (
    <div style={{ margin: "0 0 28px" }}>
      <div className="actions" style={{ marginTop: 0 }}>
        <button
          className="btn authority"
          disabled={Boolean(busy)}
          onClick={runFour}
          type="button"
          aria-busy={busy === "four"}
        >
          {busy === "four" ? copy.demo.fourBusy : copy.demo.four}
        </button>
        <button
          className="btn ghost"
          disabled={Boolean(busy)}
          onClick={runVault}
          type="button"
          aria-busy={busy === "vault"}
        >
          {busy === "vault" ? copy.demo.vaultBusy : copy.demo.vault}
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
