import Link from "next/link";
import { copy } from "@/lib/copy";

export default function NotFound() {
  return (
    <main className="wrap" id="main">
      <p className="eyebrow">{copy.errors.marketplace}</p>
      <h1>{copy.errors.notFound}</h1>
      <div className="actions">
        <Link className="btn" href="/">
          {copy.errors.marketplace}
        </Link>
        <Link className="btn ghost" href="/create">
          {copy.nav.subscribe}
        </Link>
      </div>
    </main>
  );
}
