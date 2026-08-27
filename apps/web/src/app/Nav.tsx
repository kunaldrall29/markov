"use client";

import Link from "next/link";
import { useState } from "react";
import { copy } from "@/lib/copy";

const DOCS = process.env.NEXT_PUBLIC_DOCS_URL ?? "http://127.0.0.1:3001";

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="nav" aria-label="Primary">
      <Link href="/" className="wordmark" onClick={() => setOpen(false)}>
        <svg width="34" height="14" viewBox="0 0 34 14" aria-hidden="true">
          <circle cx="5" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <line x1="12" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M18 3.8 L22.4 7 L18 10.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="29" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        FLOAT
      </Link>
      <button
        type="button"
        className="nav-toggle-btn"
        aria-expanded={open}
        aria-controls="nav-links"
        onClick={() => setOpen((v) => !v)}
      >
        {copy.nav.menu}
      </button>
      <div className={open ? "nav-links open" : "nav-links"} id="nav-links">
        <Link href="/" onClick={() => setOpen(false)}>
          {copy.nav.marketplace}
        </Link>
        <Link href="/create" onClick={() => setOpen(false)}>
          {copy.nav.subscribe}
        </Link>
        <Link href="/kill" onClick={() => setOpen(false)}>
          {copy.nav.kill}
        </Link>
        <Link href="/bot" onClick={() => setOpen(false)}>
          {copy.nav.bot}
        </Link>
        <a href={DOCS}>{copy.nav.docs}</a>
        <a href="https://markovhq.com" target="_blank" rel="noopener noreferrer">
          {copy.nav.markov}
        </a>
      </div>
    </nav>
  );
}
