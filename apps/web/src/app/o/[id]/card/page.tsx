import { api, type OperatorRow } from "@/lib/api";
import { copy } from "@/lib/copy";
import { TrackRecordCard } from "@/components/TrackRecordCard";

export default async function OperatorCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let row: OperatorRow | null = null;
  try {
    row = await api<OperatorRow>(`/operators/${id}`);
  } catch {
    row = null;
  }

  return (
    <main className="og-poster" id="main">
      <TrackRecordCard
        name={row?.name ?? copy.operator.missing}
        handle={row?.authority ?? id}
        actions={row?.stats?.actions ?? 0}
        refusals={row?.stats?.refusals ?? 0}
        tenureSecs={row?.stats?.tenureSecs ?? 0}
      />
    </main>
  );
}
