"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, formatAmount } from "@/lib/api";

interface Mandate {
  id: string;
  owner: string;
  operator: string;
  state: string;
  strategyId: string | null;
  vault: Record<string, number>;
}

export default function KillPage() {
  const [rows, setRows] = useState<Mandate[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const data = await api<Mandate[]>("/mandates");
    setRows(data);
  }, []);

  useEffect(() => {
    refresh().catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [refresh]);

  async function act(id: string, path: string, actor?: string) {
    setErr("");
    try {
      await api(path, { method: "POST" }, actor);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    }
  }

  async function pauseAll() {
    setBusy(true);
    setErr("");
    try {
      for (const m of rows) {
        if (m.state !== "Active") continue;
        await api(`/mandates/${m.id}/pause`, { method: "POST" });
      }
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap" id="main">
      <p className="eyebrow">Portfolio · kill switch</p>
      <h1>
        Freeze every operator. <em>Funds stay put.</em>
      </h1>
      <p className="lede">
        Pause all active mandates, or revoke one. Neither path moves capital. Owner withdraw still
        works in every state, including Revoked.
      </p>
      <div className="kill" style={{ marginBottom: 22 }}>
        <p className="meta gold">Emergency</p>
        <div className="actions">
          <button className="btn gold" type="button" disabled={busy} onClick={pauseAll}>
            Pause all active
          </button>
        </div>
      </div>
      {err ? (
        <p className="no" role="alert">
          {err}
        </p>
      ) : null}
      <div className="card">
        {rows.length === 0 ? <p className="meta">No mandates.</p> : null}
        {rows.map((m) => (
          <div className="receipt" key={m.id}>
            <span>
              <Link href={`/m/${m.id}`}>{m.id}</Link>
            </span>
            <span>
              {m.state} · {m.operator} · {formatAmount(m.vault["USDC-d"] ?? 0)} USDC-d
            </span>
            <span className="actions" style={{ marginTop: 0 }}>
              {m.state === "Active" ? (
                <button className="btn gold" type="button" onClick={() => act(m.id, `/mandates/${m.id}/pause`)}>
                  Pause
                </button>
              ) : null}
              {m.state !== "Revoked" ? (
                <button
                  className="btn ember"
                  type="button"
                  onClick={() => {
                    if (!window.confirm(`Revoke ${m.id}? Terminal. Funds stay in the vault.`)) return;
                    void act(m.id, `/mandates/${m.id}/revoke`, "bot_emergency");
                  }}
                >
                  Revoke
                </button>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
