export function CapProximity({ label, pct }: { label: string; pct: number }) {
  const n = Math.max(0, Math.min(1, pct));
  const warn = n >= 0.8;
  return (
    <div>
      <p className="meta">
        {label} {Math.round(n * 100)}%
      </p>
      <div className={`cap-meter${warn ? " warn" : ""}`}>
        <span style={{ width: `${Math.round(n * 100)}%` }} />
      </div>
    </div>
  );
}
