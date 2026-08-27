"use client";

import { useEffect, useState } from "react";
import { copy } from "@/lib/copy";

const KEY = "float.refusalBurst";

export default function BotPage() {
  const [threshold, setThreshold] = useState(5);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(KEY);
    const n = raw ? Number(raw) : 5;
    if (Number.isFinite(n) && n > 0) setThreshold(n);
  }, []);

  function persist(n: number) {
    setThreshold(n);
    window.localStorage.setItem(KEY, String(n));
    setSaved(true);
  }

  return (
    <main className="wrap" id="main">
      <p className="eyebrow">{copy.bot.eyebrow}</p>
      <h1>
        {copy.bot.title} <em>{copy.console.botLinked}</em>
      </h1>
      <p className="lede">{copy.bot.lede}</p>
      <section className="card" style={{ maxWidth: 560 }}>
        <p className="linked">{copy.bot.linked}</p>
        <label htmlFor="burst">{copy.bot.threshold}</label>
        <input
          id="burst"
          inputMode="numeric"
          value={String(threshold)}
          onChange={(e) => persist(Math.max(1, Number(e.target.value) || 1))}
        />
        <p className="meta">{copy.bot.thresholdHelp}</p>
        {saved ? <p className="meta authority">{copy.bot.threshold} · {threshold}</p> : null}
      </section>
    </main>
  );
}
