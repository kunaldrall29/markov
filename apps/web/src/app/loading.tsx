import { copy } from "@/lib/copy";

export default function Loading() {
  return (
    <main className="wrap" id="main">
      <p className="meta">{copy.marketplace.loading}</p>
    </main>
  );
}
