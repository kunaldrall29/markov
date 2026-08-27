"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatAmount } from "@/lib/api";
import { copy } from "@/lib/copy";
import { useApi } from "@/lib/useApi";
import { engineDemoAllowed } from "@markov/rpc";
import { CapProximity } from "@/components/CapProximity";
import { KillSwitch, WithdrawButton } from "@/components/KillSwitch";
import { ReceiptRow, receiptKey, type ReceiptLike } from "@/components/ReceiptRow";
import { useToast } from "@/components/Toast";

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
  policy: { perTxCap: number; dailyCap: number; spendDailyCap: number };
  strategyId: string | null;
}

interface Hud {
  pnl: number;
  capProximity: { dailyPct: number; spendPct: number };
}

function tickName(operator: string): "steady" | "momentum" | "redteam" {
  if (operator.includes("steady") || operator === "op_yield") return "steady";
  if (operator.includes("redteam")) return "redteam";
  return "momentum";
}

function headline(state: string) {
  if (state === "Active") return copy.console.live;
  if (state === "Paused") return copy.console.paused;
  return copy.console.revoked;
}

export default function MandatePage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { api, publicKey, connected } = useApi();
  const [mandate, setMandate] = useState<Mandate | null>(null);
  const [receipts, setReceipts] = useState<ReceiptLike[]>([]);
  const [hud, setHud] = useState<Hud | null>(null);
  const [err, setErr] = useState("");
  const [missing, setMissing] = useState(false);
  const [pending, setPending] = useState("");
  const [armed, setArmed] = useState(false);
  const seen = useRef(new Set<string>());
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const data = await api<{ mandate: Mandate; receipts: ReceiptLike[]; hud?: Hud }>(`/mandates/${id}`);
    const next = [...data.receipts].reverse();
    const arrived = new Set<string>();
    for (const [i, r] of next.entries()) {
      const k = receiptKey(r, i);
      if (seen.current.size && !seen.current.has(k)) arrived.add(k);
    }
    seen.current = new Set(next.map((r, i) => receiptKey(r, i)));
    setFresh(arrived);
    setMandate(data.mandate);
    setReceipts(next);
    setHud(data.hud ?? null);
    setMissing(false);
  }, [id, api]);

  useEffect(() => {
    let alive = true;
    refresh().catch((e) => {
      if (!alive) return;
      setErr(e instanceof Error ? e.message : String(e));
      setMissing(true);
    });
    if (missing) {
      return () => {
        alive = false;
      };
    }
    const t = setInterval(() => refresh().catch(() => undefined), 2000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [refresh, missing]);

  async function act(path: string, body?: unknown, done?: string) {
    setErr("");
    setPending(path);
    try {
      const out = await api<{ sig?: string; explorerUrl?: string }>(path, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
      if (done) toast(done);
      if (out && typeof out.sig === "string" && out.sig) {
        toast(`${done ?? "Confirmed"} · ${out.sig.slice(0, 8)}`);
      }
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : copy.toast.failed);
    } finally {
      setPending("");
    }
  }

  if (!mandate) {
    return (
      <main className="wrap" id="main">
        <p className="eyebrow">{copy.console.eyebrow}</p>
        {missing ? (
          <>
            <h1>{copy.console.missing}</h1>
            <p className="no" role="alert">
              {err}
            </p>
            <div className="actions">
              <Link className="btn" href="/">
                {copy.errors.marketplace}
              </Link>
            </div>
          </>
        ) : (
          <p className="meta">{copy.console.loading}</p>
        )}
      </main>
    );
  }

  const usdcd = mandate.vault["USDC-d"] ?? 0;
  const demo = mandate.vault.DEMO ?? 0;
  const agent = tickName(mandate.operator);
  const ownerOk = !publicKey || publicKey === mandate.owner;
  const locked = Boolean(pending) || !ownerOk;

  return (
    <main className="wrap" id="main">
      <p className="eyebrow">
        {copy.console.eyebrow} · {mandate.id}
      </p>
      <h1>
        {headline(mandate.state)} <em>{copy.console.withdrawLine}</em>
      </h1>
      <p className="linked">{copy.console.botLinked}</p>
      <p className="meta pubkey">
        {copy.console.eyebrow} owner {mandate.owner}
        {connected && !ownerOk ? ` · ${copy.wallet.notOwner}` : ""}
      </p>
      <div className="grid">
        <section className={`card${mandate.state === "Active" ? " mandate-live" : ""}`}>
          <p className="meta">{copy.console.balances}</p>
          <h3>{formatAmount(usdcd)} USDC-d</h3>
          <p className="meta">{formatAmount(demo)} DEMO</p>
          <p className="meta" style={{ marginTop: 12 }}>
            {mandate.operator} · pnl {formatAmount(hud?.pnl ?? 0)}
          </p>
          <p className="meta">
            per-tx {formatAmount(mandate.policy.perTxCap)} · daily {formatAmount(mandate.policy.dailyCap)}
          </p>
          <CapProximity label="daily cap" pct={hud?.capProximity.dailyPct ?? 0} />
          <CapProximity label="spend cap" pct={hud?.capProximity.spendPct ?? 0} />
          {mandate.strategyId ? (
            <p className="meta" style={{ marginTop: 8 }}>
              strategy{" "}
              <Link href={`/s/${mandate.strategyId}`}>{mandate.strategyId.slice(0, 12)}…</Link>
            </p>
          ) : null}
        </section>
        <section className="kill-breaker">
          <p className="meta authority">{copy.nav.kill}</p>
          <p className="lede" style={{ margin: "8px 0 14px" }}>
            {copy.console.pauseHelp}
          </p>
          {!connected ? <p className="meta">{copy.wallet.required}</p> : null}
          <div className="actions">
            {mandate.state === "Active" ? (
              <button
                className="btn authority"
                type="button"
                disabled={locked}
                onClick={() => act(`/mandates/${id}/pause`, undefined, copy.console.pausedToast)}
              >
                {copy.console.pause}
              </button>
            ) : null}
            {mandate.state === "Paused" ? (
              <button
                className="btn ghost"
                type="button"
                disabled={locked}
                onClick={() => act(`/mandates/${id}/unpause`, undefined, copy.console.resumedToast)}
              >
                {copy.console.resume}
              </button>
            ) : null}
            {mandate.state !== "Revoked" ? (
              <KillSwitch
                armed={armed}
                pending={locked}
                onArm={() => setArmed(true)}
                onRevoke={() => {
                  setArmed(false);
                  void act(`/mandates/${id}/revoke`, undefined, copy.console.revokedToast);
                }}
              />
            ) : null}
            <WithdrawButton
              amount={usdcd}
              state={mandate.state}
              pending={locked}
              label={copy.console.withdraw}
              onWithdraw={() =>
                void act(
                  `/mandates/${id}/withdraw`,
                  { token: "USDC-d", amount: usdcd },
                  copy.console.withdrawnToast,
                )
              }
            />
          </div>
        </section>
      </div>

      {engineDemoAllowed() ? (
        <div className="actions" style={{ margin: "22px 0" }}>
          <p className="meta" style={{ flex: "1 1 100%" }}>
            {copy.demo.engineNotWallet}
          </p>
          <button
            className="btn"
            type="button"
            disabled={Boolean(pending)}
            onClick={() => act(`/agents/${agent}/tick`, { mandateId: id })}
          >
            {copy.console.tick}
          </button>
          <button
            className="btn ghost"
            type="button"
            disabled={Boolean(pending)}
            onClick={() => act(`/agents/${agent}/tick`, { mandateId: id, overCap: true })}
          >
            {copy.console.overCap}
          </button>
        </div>
      ) : null}
      {pending ? <p className="pending">{copy.subscribe.pending}</p> : null}
      {err ? (
        <p className="no" role="alert">
          {err}
        </p>
      ) : null}

      <h3 style={{ fontFamily: "var(--serif)", fontWeight: 500, fontSize: 28 }}>{copy.console.receipts}</h3>
      <div className="card" style={{ marginTop: 12 }} aria-live="polite">
        {receipts.length === 0 ? <p className="meta">{copy.console.receiptsEmpty}</p> : null}
        {receipts.map((r, i) => (
          <ReceiptRow key={receiptKey(r, i)} receipt={r} arrive={fresh.has(receiptKey(r, i))} />
        ))}
      </div>
    </main>
  );
}
