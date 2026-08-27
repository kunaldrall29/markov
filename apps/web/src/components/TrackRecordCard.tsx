import { copy } from "@/lib/copy";

export function TrackRecordCard({
  name,
  handle,
  actions,
  refusals,
  tenureSecs,
}: {
  name: string;
  handle: string;
  actions: number;
  refusals: number;
  tenureSecs: number;
}) {
  const days = Math.max(0, Math.floor(tenureSecs / 86400));
  return (
    <section className="track-card">
      <div>
        <p className="eyebrow">{copy.product}</p>
        <h3>{name}</h3>
        <p className="meta">{handle}</p>
      </div>
      <p className="refusals">
        {refusals} {refusals === 1 ? "refusal" : "refusals"}
      </p>
      <p className="meta">
        {actions} actions · {days}d tenure
      </p>
      <p className="meta">{copy.marketplace.chainLabel}</p>
    </section>
  );
}
