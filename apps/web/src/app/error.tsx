"use client";

import { copy } from "@/lib/copy";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="wrap" id="main">
      <p className="eyebrow">{copy.errors.tryAgain}</p>
      <h1>{copy.errors.generic}</h1>
      <p className="lede">{error.message || copy.toast.failed}</p>
      <div className="actions">
        <button className="btn" type="button" onClick={reset}>
          {copy.errors.tryAgain}
        </button>
      </div>
    </main>
  );
}
