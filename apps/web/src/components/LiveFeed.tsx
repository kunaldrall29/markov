"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { copy } from "@/lib/copy";
import { ReceiptRow, receiptKey, type ReceiptLike } from "./ReceiptRow";

export function LiveFeed({
  path = "/receipts",
  limit = 8,
}: {
  path?: string;
  limit?: number;
}) {
  const [rows, setRows] = useState<ReceiptLike[]>([]);
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);
  const seen = useRef(new Set<string>());
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    async function pull() {
      try {
        const data = await api<ReceiptLike[]>(path);
        if (!alive) return;
        const filtered = data.filter((r) => r.type === "ActionExecuted" || r.type === "ActionRefused");
        const next = filtered.slice(-limit).reverse();
        const arrived = new Set<string>();
        for (const [i, r] of next.entries()) {
          const k = receiptKey(r, i);
          if (seen.current.size && !seen.current.has(k)) arrived.add(k);
        }
        seen.current = new Set(next.map((r, i) => receiptKey(r, i)));
        setFresh(arrived);
        setRows(next);
        setErr("");
        setReady(true);
      } catch (e) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : copy.marketplace.error);
        setReady(true);
      }
    }
    void pull();
    const t = setInterval(pull, 2000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [path, limit]);

  if (err) {
    return (
      <section className="live-stream">
        <p className="eyebrow">{copy.marketplace.stream}</p>
        <p className="no" role="alert">
          {err}
        </p>
      </section>
    );
  }

  return (
    <section className="live-stream" aria-live="polite">
      <p className="eyebrow">{copy.marketplace.stream}</p>
      {!ready ? <p className="meta">{copy.marketplace.loading}</p> : null}
      {ready && rows.length === 0 ? <p className="meta">{copy.marketplace.streamEmpty}</p> : null}
      {rows.map((r, i) => (
        <ReceiptRow key={receiptKey(r, i)} receipt={r} arrive={fresh.has(receiptKey(r, i))} />
      ))}
    </section>
  );
}
