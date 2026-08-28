import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

type PublicResult = "allowed" | "blocked";

type PublicReceipt = {
  receipt_id: string;
  ts: number;
  mandate: string;
  operator: string | null;
  action_type: string | null;
  venue: string | null;
  token: string | null;
  amount: number | null;
  result: PublicResult;
  block_reason: string | null;
  tx_sig: string | null;
};

type Stats = {
  total: number;
  allowed: number;
  blocked: number;
};

type Filter = "all" | "allowed" | "refused";

const EMPTY = "No receipts yet — devnet warming up.";

function receiptsApiUrl(custom: unknown): string {
  if (typeof custom === "string" && custom.trim()) return custom.trim().replace(/\/$/, "");
  return "http://127.0.0.1:8788";
}

function explorerUrl(sig: string): string {
  return `https://explorer.solana.com/tx/${encodeURIComponent(sig)}?cluster=devnet`;
}

function formatTs(ts: number): string {
  return new Date(ts * 1000).toISOString().replace(".000Z", "Z");
}

function formatAmount(amount: number | null): string {
  if (amount == null) return "—";
  return String(amount);
}

export default function LiveReceipts(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const api = receiptsApiUrl(siteConfig.customFields?.receiptsApiUrl);
  const [filter, setFilter] = useState<Filter>("all");
  const [receipts, setReceipts] = useState<PublicReceipt[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, allowed: 0, blocked: 0 });

  const listUrl = useMemo(() => {
    const url = new URL("/v1/receipts", `${api}/`);
    url.searchParams.set("limit", "50");
    if (filter === "allowed") url.searchParams.set("result", "allowed");
    if (filter === "refused") url.searchParams.set("result", "blocked");
    return url.toString();
  }, [api, filter]);

  const loadReceipts = useCallback(async () => {
    try {
      const res = await fetch(listUrl);
      if (!res.ok) return;
      const body = (await res.json()) as { receipts?: PublicReceipt[] };
      setReceipts(Array.isArray(body.receipts) ? body.receipts : []);
    } catch {
      setReceipts([]);
    }
  }, [listUrl]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(`${api}/v1/receipts/stats`);
      if (!res.ok) return;
      const body = (await res.json()) as Partial<Stats>;
      setStats({
        total: Number(body.total) || 0,
        allowed: Number(body.allowed) || 0,
        blocked: Number(body.blocked) || 0,
      });
    } catch {
      /* keep last counters */
    }
  }, [api]);

  useEffect(() => {
    void loadReceipts();
    const id = setInterval(() => void loadReceipts(), 5_000);
    return () => clearInterval(id);
  }, [loadReceipts]);

  useEffect(() => {
    void loadStats();
    const id = setInterval(() => void loadStats(), 15_000);
    return () => clearInterval(id);
  }, [loadStats]);

  return (
    <Layout title="Live receipts" description="Public ActionExecuted and ActionRefused receipts on Solana devnet.">
      <main className="receipts-page">
        <h1>Live receipts</h1>
        <p className="receipts-lead">
          Every allow and every block is a receipt. BlockReason codes are the SPEC registry — append-only once
          emitted on devnet.
        </p>
        <p className="receipts-counters" aria-live="polite">
          {stats.total} actions gated · {stats.blocked} refusals emitted
        </p>
        <div className="receipts-filters" role="group" aria-label="Filter receipts">
          {(["all", "allowed", "refused"] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={filter === key ? "is-on" : undefined}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {key === "all" ? "All" : key === "allowed" ? "Allowed" : "Refused"}
            </button>
          ))}
        </div>
        {receipts.length === 0 ? (
          <p className="receipts-empty">{EMPTY}</p>
        ) : (
          <>
            <ul className="receipts-cards">
              {receipts.map((row) => (
                <li
                  key={row.receipt_id}
                  className={row.result === "blocked" ? "receipts-card is-blocked" : "receipts-card"}
                >
                  <ReceiptBody row={row} />
                </li>
              ))}
            </ul>
            <div className="receipts-table-wrap">
              <table className="receipts-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Result</th>
                    <th>Action</th>
                    <th>Mandate</th>
                    <th>Amount</th>
                    <th>Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((row) => (
                    <tr key={row.receipt_id} className={row.result === "blocked" ? "is-blocked" : undefined}>
                      <td>{formatTs(row.ts)}</td>
                      <td>
                        <ResultBadge row={row} />
                      </td>
                      <td>{row.action_type ?? "—"}</td>
                      <td className="receipts-mono">{row.mandate}</td>
                      <td>
                        {formatAmount(row.amount)}
                        {row.token ? ` ${row.token}` : ""}
                      </td>
                      <td>
                        <TxLink sig={row.tx_sig} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <p className="receipts-foot">
          Feed: <code>/v1/receipts</code>. Spec: <Link to="/docs/receipts">receipts</Link> ·{" "}
          <Link to="/docs/block-reason">BlockReason</Link>.
        </p>
      </main>
    </Layout>
  );
}

function ResultBadge({ row }: { row: PublicReceipt }) {
  if (row.result === "blocked") {
    return <span className="receipts-badge">{row.block_reason ?? "blocked"}</span>;
  }
  return <span className="receipts-ok">allowed</span>;
}

function TxLink({ sig }: { sig: string | null }) {
  if (!sig) return <span>—</span>;
  return (
    <a href={explorerUrl(sig)} target="_blank" rel="noreferrer">
      {sig.slice(0, 8)}…
    </a>
  );
}

function ReceiptBody({ row }: { row: PublicReceipt }) {
  return (
    <>
      <div className="receipts-card-top">
        <ResultBadge row={row} />
        <time dateTime={formatTs(row.ts)}>{formatTs(row.ts)}</time>
      </div>
      <p>
        {row.action_type ?? "action"} · {row.mandate}
      </p>
      <p>
        {formatAmount(row.amount)}
        {row.token ? ` ${row.token}` : ""} · <TxLink sig={row.tx_sig} />
      </p>
    </>
  );
}
