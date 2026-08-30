import type { Metadata } from "next";
import { ReceiptsFeed } from "./ReceiptsFeed";

export const metadata: Metadata = {
  title: "Live receipts — Float",
  description: "Public ActionExecuted and ActionRefused receipts on Solana devnet.",
};

export default function ReceiptsPage() {
  return (
    <main className="wrap receipts-page" id="main">
      <p className="eyebrow">Public feed · Solana devnet</p>
      <h1>Live receipts</h1>
      <p className="lede">
        Every allow and every block is a receipt. BlockReason codes are the SPEC registry — append-only once
        emitted on devnet.
      </p>
      <ReceiptsFeed />
    </main>
  );
}
