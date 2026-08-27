import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap" id="main">
      <p className="eyebrow">404</p>
      <h1>
        Page not found. <em>The marketplace is still here.</em>
      </h1>
      <p className="lede">That URL does not match a Float route.</p>
      <div className="actions">
        <Link className="btn" href="/">
          Marketplace
        </Link>
        <Link className="btn ghost" href="/create">
          New mandate
        </Link>
      </div>
    </main>
  );
}
