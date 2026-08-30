"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { explorerTxUrl } from "@markov/rpc";
import { badgeFamily, isBlockReason } from "@/lib/reasons";
import { fetchJsonWithBackoff } from "@/lib/receiptsFetch";
import { publicDocsUrl, publicReceiptsApiUrl } from "@/lib/hosted";

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
  by_reason?: Record<string, number>;
};

type Filter = "all" | "allowed" | "refused";

const EMPTY = "No receipts yet — devnet warming up.";
const DOCS = publicDocsUrl();

function formatTs(ts: number): string {
  return new Date(ts * 1000).toISOString().replace(".000Z", "Z");
}

function clock(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(11, 19);
}

function formatAmount(amount: number | null): string {
  if (amount == null) return "—";
  return String(amount);
}

export function ReceiptsFeed() {
  const api = publicReceiptsApiUrl();
  const [filter, setFilter] = useState<Filter>("all");
  const [receipts, setReceipts] = useState<PublicReceipt[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, allowed: 0, blocked: 0 });
  const [error, setError] = useState("");

  const listUrl = useMemo(() => {
    const url = new URL("/v1/receipts", `${api}/`);
    url.searchParams.set("limit", "50");
    if (filter === "allowed") url.searchParams.set("result", "allowed");
    if (filter === "refused") url.searchParams.set("result", "blocked");
    return url.toString();
  }, [api, filter]);

  const loadReceipts = useCallback(async () => {
    try {
      const res = await fetchJsonWithBackoff(listUrl);
      if (res.status === 429) {
        setError("Rate limited — backing off.");
        return;
      }
      if (!res.ok) return;
      const body = res.body as { receipts?: PublicReceipt[] };
      setReceipts(Array.isArray(body.receipts) ? body.receipts : []);
      setError("");
    } catch {
      setError("Feed unreachable.");
    }
  }, [listUrl]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetchJsonWithBackoff(`${api}/v1/receipts/stats`);
      if (!res.ok) return;
      const body = res.body as Partial<Stats>;
      setStats({
        total: Number(body.total) || 0,
        allowed: Number(body.allowed) || 0,
        blocked: Number(body.blocked) || 0,
        by_reason: body.by_reason,
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

  const reasonCount = stats.by_reason ? Object.keys(stats.by_reason).length : 0;

  return (
    <>
      <p className="record-strip" aria-live="polite">
        {stats.total} actions gated · {stats.blocked} refusals emitted
        {reasonCount ? ` · ${reasonCount} BlockReason keys` : ""}
      </p>
      {error ? (
        <p className="no" role="status">
          {error}
        </p>
      ) : null}
      <div className="chips" role="group" aria-label="Filter receipts">
        {(["all", "allowed", "refused"] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={filter === key ? "chip is-on" : "chip"}
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
        <div className="live-stream">
          {receipts.map((row) =>
            row.result === "blocked" ? <RefusalRow key={row.receipt_id} row={row} /> : <AllowedRow key={row.receipt_id} row={row} />,
          )}
        </div>
      )}
      <p className="foot">
        Feed: <code>/v1/receipts</code>. Spec:{" "}
        <a href={`${DOCS}/docs/receipts`}>receipts</a> · <a href={`${DOCS}/docs/block-reason`}>BlockReason</a>.
      </p>
    </>
  );
}

function TxLink({ sig }: { sig: string | null }) {
  if (!sig) return null;
  return (
    <a href={explorerTxUrl(sig)} target="_blank" rel="noreferrer">
      explorer
    </a>
  );
}

function AmountBits({ row }: { row: PublicReceipt }) {
  const amount = formatAmount(row.amount);
  const token = row.token ? ` ${row.token}` : "";
  return (
    <>
      {amount}
      {token} <TxLink sig={row.tx_sig} />
    </>
  );
}

function AllowedRow({ row }: { row: PublicReceipt }) {
  return (
    <div className="receipt">
      <span className="receipt-action">{row.action_type ?? "allowed"}</span>
      <span>
        {row.mandate} <AmountBits row={row} />
      </span>
      <time className="meta" dateTime={formatTs(row.ts)}>
        {clock(row.ts)}
      </time>
    </div>
  );
}

function RefusalRow({ row }: { row: PublicReceipt }) {
  const reason = row.block_reason ?? "blocked";
  const family = isBlockReason(row.block_reason) ? badgeFamily(row.block_reason) : "state";
  return (
    <div className="receipt receipt-refusal">
      <span>
        <span className="receipt-glyph" aria-hidden="true">
          ⊘
        </span>
        {row.action_type ?? "refused"}
      </span>
      <span>
        {row.mandate} <span className={`badge badge-${family}`}>{reason}</span> <AmountBits row={row} />
      </span>
      <time className="meta" dateTime={formatTs(row.ts)}>
        {clock(row.ts)}
      </time>
    </div>
  );
}
