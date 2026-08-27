"use client";

import Link from "next/link";
import { formatAmount } from "@/lib/api";
import { BlockReasonBadge } from "./BlockReasonBadge";
import { heldCopy, isBlockReason } from "@/lib/reasons";

export type ReceiptLike = {
  type: string;
  ts: number;
  mandateId?: string;
  reason?: unknown;
  amountIn?: unknown;
  amount?: unknown;
  requestedAmount?: unknown;
  sig?: unknown;
  explorerUrl?: unknown;
  nonce?: unknown;
};

function clock(ts: number) {
  return new Date(ts * 1000).toISOString().slice(11, 19);
}

function amountBits(r: ReceiptLike) {
  const bits: string[] = [];
  if (typeof r.amountIn === "number") bits.push(`in ${formatAmount(r.amountIn)}`);
  if (typeof r.amount === "number") bits.push(formatAmount(r.amount));
  if (typeof r.requestedAmount === "number") bits.push(`asked ${formatAmount(r.requestedAmount)}`);
  return bits.join(" ");
}

function Explorer({ receipt }: { receipt: ReceiptLike }) {
  if (typeof receipt.sig !== "string" || !receipt.sig) return null;
  const href =
    typeof receipt.explorerUrl === "string" && receipt.explorerUrl
      ? receipt.explorerUrl
      : `https://solscan.io/tx/${receipt.sig}?cluster=devnet`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      explorer
    </a>
  );
}

export function receiptKey(r: ReceiptLike, i: number) {
  return `${r.type}-${r.ts}-${r.nonce ?? i}-${r.mandateId ?? ""}`;
}

export function ReceiptRow({
  receipt,
  arrive,
}: {
  receipt: ReceiptLike;
  arrive?: boolean;
}) {
  if (receipt.type === "ActionRefused") {
    return <RefusalRow receipt={receipt} arrive={arrive} />;
  }
  return (
    <div className={`receipt${arrive ? " receipt-arrive" : ""}`}>
      <span className="receipt-action">{receipt.type}</span>
      <span>
        {receipt.mandateId ? (
          <>
            <Link href={`/m/${receipt.mandateId}`}>{receipt.mandateId}</Link>{" "}
          </>
        ) : null}
        {amountBits(receipt)} <Explorer receipt={receipt} />
      </span>
      <span className="meta">{clock(receipt.ts)}</span>
    </div>
  );
}

export function RefusalRow({
  receipt,
  arrive,
}: {
  receipt: ReceiptLike;
  arrive?: boolean;
}) {
  const held = isBlockReason(receipt.reason) ? heldCopy(receipt.reason) : "";
  return (
    <div
      className={`receipt receipt-refusal${arrive ? " refusal-arrive" : ""}`}
      title={held}
    >
      <span>
        <span className="receipt-glyph" aria-hidden="true">
          ⊘
        </span>
        {receipt.type}
      </span>
      <span>
        {receipt.mandateId ? (
          <>
            <Link href={`/m/${receipt.mandateId}`}>{receipt.mandateId}</Link>{" "}
          </>
        ) : null}
        <BlockReasonBadge reason={receipt.reason} /> {amountBits(receipt)}{" "}
        <Explorer receipt={receipt} />
      </span>
      <span className="meta">{clock(receipt.ts)}</span>
    </div>
  );
}
