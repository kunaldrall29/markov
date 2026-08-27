"use client";

import { copy } from "@/lib/copy";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="wrap" id="main">
          <h1>{copy.errors.generic}</h1>
          <p>{error.message || copy.toast.failed}</p>
          <button type="button" onClick={reset}>
            {copy.errors.tryAgain}
          </button>
        </main>
      </body>
    </html>
  );
}
