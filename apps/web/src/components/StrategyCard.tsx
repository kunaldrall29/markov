import Link from "next/link";
import { formatAmount, type StrategyCard } from "@/lib/api";
import { copy } from "@/lib/copy";
import { PolicyChip } from "./PolicyChip";
import { RecordStrip } from "./RecordStrip";

export function StrategyCardView({ s }: { s: StrategyCard }) {
  return (
    <article className="card">
      <p className="meta">
        {s.template.operator}
        {s.labeled ? ` · ${copy.strategy.labeled}` : ""}
      </p>
      <h3>{s.name}</h3>
      <p className="lede" style={{ marginBottom: 0 }}>
        {s.blurb}
      </p>
      <RecordStrip
        actions={s.stats.actions}
        refusals={s.stats.refusals}
        tenureSecs={s.stats.tenureSecs}
        feesBps={s.stats.feesBps ?? s.template.fee_terms?.mgmt_bps ?? 0}
      />
      <div className="chips">
        <PolicyChip tone="refusal">refusals {s.stats.refusals}</PolicyChip>
        <PolicyChip tone="authority">per-tx ≤ {formatAmount(s.template.caps.per_tx)}</PolicyChip>
        <PolicyChip>daily ≤ {formatAmount(s.template.caps.daily)}</PolicyChip>
      </div>
      <div className="actions">
        <Link className="btn" href={`/create?strategy=${s.slug}`}>
          {copy.marketplace.subscribe}
        </Link>
        <Link className="btn ghost" href={`/s/${s.slug}`}>
          {copy.marketplace.record}
        </Link>
      </div>
    </article>
  );
}
