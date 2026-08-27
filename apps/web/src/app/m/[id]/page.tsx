"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, formatAmount } from "@/lib/api";
import { blockLabel } from "@/lib/reasons";

interface Mandate {
  id: string;
  owner: string;
  operator: string;
  emergencyKey: string | null;
  state: string;
  expiresTs: number;
  spentToday: number;
  spendToday: number;
  vault: Record<string, number>;
  policy: { perTxCap: number; dailyCap: number };
  strategyId: string | null;
}

interface Receipt {
  type: string;
  ts: number;
  [k: string]: unknown;
}

function tickName(operator: string): "steady" | "momentum" | "redteam" {
  if (operator.includes("steady") || operator === "op_yield") return "steady";
  if (operator.includes("redteam")) return "redteam";
  return "momentum";
}

export default function MandatePage() {
  const { id } = useParams<{ id: string }>();
  const [mandate, setMandate] = useState<Mandate | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [err, setErr] = useState("");
  const [missing, setMissing] = useState(false);

  const refresh = useCallback(async () => {
    const data = await api<{ mandate: Mandate; receipts: Receipt[] }>(`/mandates/${id}`);
    setMandate(data.mandate);
    setReceipts([...data.receipts].reverse());
    setMissing(false);
  }, [id]);

  useEffect(() => {
    let alive = true;
    refresh().catch((e) => {
      if (!alive) return;
      setErr(e instanceof Error ? e.message : String(e));
      setMissing(true);
    });
    if (missing) return () => {
      alive = false;
    };
    const t = setInterval(() => refresh().catch(() => undefined), 2000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [refresh, missing]);

  async function act(path: string, body?: unknown, actor?: string) {
    setErr("");
    try {
      await api(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }, actor);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    }
  }

  if (!mandate) {
    return (
      <main className="wrap" id="main">
        <p className="eyebrow">Console</p>
        {missing ? (
          <>
            <h1>
              Mandate not found. <em>Nothing moved.</em>
            </h1>
            <p className="no" role="alert">
              {err || "Unknown mandate."}
            </p>
            <div className="actions">
              <Link className="btn" href="/">
                Marketplace
              </Link>
            </div>
          </>
        ) : (
          <p className="meta">Loading mandate…</p>
        )}
      </main>
    );
  }

  const usdcd = mandate.vault["USDC-d"] ?? 0;
  const demo = mandate.vault.DEMO ?? 0;
  const agent = tickName(mandate.operator);

  return (
    <main className="wrap" id="main">
      <p className="eyebrow">Console · {mandate.id}</p>
      <h1>
        {mandate.state === "Active" ? "Live." : mandate.state === "Paused" ? "Paused." : "Revoked."}{" "}
        <em>Withdrawal still points at you.</em>
      </h1>
      <div className="grid">
        <section className="card">
          <p className="meta">Balances</p>
          <h3>{formatAmount(usdcd)} USDC-d</h3>
          <p className="meta">{formatAmount(demo)} DEMO</p>
          <p className="meta" style={{ marginTop: 12 }}>
            operator {mandate.operator} · spent today {formatAmount(mandate.spentToday)} · data spend{" "}
            {formatAmount(mandate.spendToday)}
          </p>
          <p className="meta">
            per-tx {formatAmount(mandate.policy.perTxCap)} · daily {formatAmount(mandate.policy.dailyCap)}
          </p>
          {mandate.strategyId ? (
            <p className="meta" style={{ marginTop: 8 }}>
              strategy{" "}
              <Link href={`/s/${mandate.strategyId}`}>{mandate.strategyId.slice(0, 12)}…</Link>
            </p>
          ) : null}
        </section>
        <section className="kill">
          <p className="meta gold">Kill switch · owner or emergency bot</p>
          <p className="lede" style={{ margin: "8px 0 14px" }}>
            Pause freezes the operator. Revoke is terminal. Neither moves your funds. A compromised
            bot can only protect you.
          </p>
          <div className="actions">
            {mandate.state === "Active" ? (
              <button className="btn gold" type="button" onClick={() => act(`/mandates/${id}/pause`)}>
                Pause
              </button>
            ) : null}
            {mandate.state === "Paused" ? (
              <button className="btn ghost" type="button" onClick={() => act(`/mandates/${id}/unpause`)}>
                Resume
              </button>
            ) : null}
            {mandate.state !== "Revoked" ? (
              <button
                className="btn ember"
                type="button"
                onClick={() => {
                  if (!window.confirm(`Revoke ${id}? This is terminal. Funds stay in the vault for you.`)) return;
                  void act(`/mandates/${id}/revoke`, undefined, "bot_emergency");
                }}
              >
                Revoke via bot
              </button>
            ) : null}
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                if (!window.confirm(`Withdraw ${formatAmount(usdcd)} USDC-d to the owner?`)) return;
                void act(`/mandates/${id}/withdraw`, { token: "USDC-d", amount: usdcd });
              }}
              disabled={usdcd <= 0}
            >
              Withdraw USDC-d
            </button>
          </div>
        </section>
      </div>

      <div className="actions" style={{ margin: "22px 0" }}>
        <button
          className="btn"
          type="button"
          onClick={() => act(`/agents/${agent}/tick`, { mandateId: id })}
        >
          Tick {agent} agent
        </button>
        <button
          className="btn ghost"
          type="button"
          onClick={() => act(`/agents/${agent}/tick`, { mandateId: id, overCap: true })}
        >
          Force over-cap
        </button>
      </div>
      {err ? (
        <p className="no" role="alert">
          {err}
        </p>
      ) : null}

      <h3 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontSize: 28 }}>Receipts</h3>
      <p className="meta">
        Refusals are receipts. The climax is a live <code>blocked: over_cap</code>.
      </p>
      <div className="card" style={{ marginTop: 12 }}>
        {receipts.length === 0 ? <p className="meta">No receipts yet.</p> : null}
        {receipts.map((r, i) => (
          <div className="receipt" key={`${r.type}-${r.ts}-${i}`}>
            <span className={r.type.includes("Refused") || r.type === "Revoked" ? "no" : "ok"}>{r.type}</span>
            <span>
              {"reason" in r && r.reason ? blockLabel(r.reason) : ""}
              {"amountIn" in r && r.amountIn ? ` in ${formatAmount(Number(r.amountIn))}` : ""}
              {"amount" in r && r.amount ? ` ${formatAmount(Number(r.amount))}` : ""}
              {"requestedAmount" in r && r.requestedAmount
                ? ` asked ${formatAmount(Number(r.requestedAmount))}`
                : ""}
              {"sig" in r && r.sig ? (
                <>
                  {" "}
                  <a
                    href={
                      typeof r.explorerUrl === "string" && r.explorerUrl
                        ? r.explorerUrl
                        : `https://solscan.io/tx/${String(r.sig)}?cluster=devnet`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    solscan
                  </a>
                </>
              ) : null}
            </span>
            <span className="meta">{new Date(r.ts * 1000).toISOString().slice(11, 19)}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
