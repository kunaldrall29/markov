"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, formatAmount } from "@/lib/api";
import { copy } from "@/lib/copy";
import { KillSwitch } from "@/components/KillSwitch";
import { useToast } from "@/components/Toast";

interface Mandate {
  id: string;
  owner: string;
  operator: string;
  state: string;
  strategyId: string | null;
  vault: Record<string, number>;
}

export default function KillPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Mandate[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);

  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const data = await api<Mandate[]>("/mandates");
    setRows(data);
    setReady(true);
  }, []);

  useEffect(() => {
    refresh().catch((e) => {
      setErr(e instanceof Error ? e.message : String(e));
      setReady(true);
    });
  }, [refresh]);

  async function pauseAll() {
    setBusy(true);
    setErr("");
    try {
      for (const m of rows) {
        if (m.state !== "Active") continue;
        await api(`/mandates/${m.id}/pause`, { method: "POST" });
      }
      toast(copy.kill.pausedAll);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : copy.toast.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap" id="main">
      <p className="eyebrow">{copy.kill.eyebrow}</p>
      <h1>
        {copy.kill.title} <em>{copy.kill.fundsStay}</em>
      </h1>
      <p className="lede">{copy.kill.lede}</p>
      <div className="kill-breaker" style={{ marginBottom: 22 }}>
        <p className="meta authority">{copy.nav.kill}</p>
        <div className="actions">
          <button className="btn authority" type="button" disabled={busy} onClick={pauseAll}>
            {copy.kill.pauseAll}
          </button>
        </div>
      </div>
      {err ? (
        <p className="no" role="alert">
          {err}
        </p>
      ) : null}
      <div className="card">
        {!ready ? <p className="meta">{copy.kill.loading}</p> : null}
        {ready && rows.length === 0 ? <p className="meta">{copy.kill.empty}</p> : null}
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
                <button
                  className="btn authority"
                  type="button"
                  onClick={() => api(`/mandates/${m.id}/pause`, { method: "POST" }).then(refresh)}
                >
                  {copy.console.pause}
                </button>
              ) : null}
              {m.state !== "Revoked" ? (
                <KillSwitch
                  armed={armed === m.id}
                  onArm={() => setArmed(m.id)}
                  onRevoke={() => {
                    setArmed(null);
                    void api(`/mandates/${m.id}/revoke`, { method: "POST" }, "bot_emergency")
                      .then(() => {
                        toast(copy.console.revokedToast);
                        return refresh();
                      })
                      .catch((e) => setErr(e instanceof Error ? e.message : copy.toast.failed));
                  }}
                />
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
