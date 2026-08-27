"use client";

export function CapStepper({
  id,
  label,
  value,
  max,
  min = 1,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  max: number;
  min?: number;
  onChange: (n: number) => void;
}) {
  const step = Math.max(1, Math.round(max / 20));
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <div className="cap-stepper">
        <button type="button" aria-label={`Lower ${label}`} onClick={() => onChange(Math.max(min, value - step))}>
          −
        </button>
        <input
          id={id}
          inputMode="decimal"
          value={Number.isFinite(value) ? String(value) : ""}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n)) return;
            onChange(Math.min(max, Math.max(min, n)));
          }}
        />
        <button type="button" aria-label={`Raise ${label}`} onClick={() => onChange(Math.min(max, value + step))}>
          +
        </button>
      </div>
    </div>
  );
}
