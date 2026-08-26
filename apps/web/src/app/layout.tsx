import type { ReactNode } from "react";
import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Float — Markov",
  description: "Give an agent your capital. Keep the keys.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <nav className="nav">
          <Link href="/" className="wordmark">
            <svg width="34" height="14" viewBox="0 0 34 14" aria-hidden="true">
              <circle cx="5" cy="7" r="4" fill="none" stroke="#f4f4f0" strokeWidth="1.6" />
              <line x1="12" y1="7" x2="20" y2="7" stroke="#f4f4f0" strokeWidth="1.6" />
              <path d="M18 3.8 L22.4 7 L18 10.2" fill="none" stroke="#f4f4f0" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="29" cy="7" r="4" fill="none" stroke="#f4f4f0" strokeWidth="1.6" />
            </svg>
            FLOAT
          </Link>
          <div className="nav-links">
            <Link href="/">Marketplace</Link>
            <Link href="/create">New mandate</Link>
            <a href={process.env.NEXT_PUBLIC_DOCS_URL ?? "http://127.0.0.1:3001"}>Docs</a>
            <a href="https://markovhq.com" target="_blank" rel="noreferrer">
              Markov
            </a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
