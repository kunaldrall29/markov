import { copy } from "@/lib/copy";

export function RecordStrip({
  actions,
  refusals,
  tenureSecs,
  feesBps,
}: {
  actions: number;
  refusals: number;
  tenureSecs: number;
  feesBps: number;
}) {
  const days = Math.max(0, Math.floor(tenureSecs / 86400));
  return (
    <p className="record-strip">
      {copy.marketplace.chainLabel}: {actions} actions · {refusals} refusals · {days}d tenure · {feesBps / 100}%
      fees
    </p>
  );
}
