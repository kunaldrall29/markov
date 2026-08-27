"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="wrap" id="main">
      <p className="eyebrow">Error</p>
      <h1>
        Something broke. <em>Your keys are still yours.</em>
      </h1>
      <p className="lede">{error.message || "The page failed to render."}</p>
      <div className="actions">
        <button className="btn" type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
