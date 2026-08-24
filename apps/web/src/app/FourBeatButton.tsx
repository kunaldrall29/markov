"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

export function FourBeatButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    setBusy(true);
    setErr("");
    try {
      const result = await api<{ mandateId: string }>("/demo/four-beat", { method: "POST" });
      router.push(`/m/${result.mandateId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "demo failed");
      setBusy(false);
    }
  }

  return (
    <div style={{ margin: "0 0 28px" }}>
      <button className="btn gold" disabled={busy} onClick={run} type="button">
        {busy ? "Running four-beat…" : "Run four-beat demo"}
      </button>
      {err ? <p className="no">{err}</p> : null}
    </div>
  );
}
