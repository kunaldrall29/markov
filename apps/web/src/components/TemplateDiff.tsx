import { formatAmount } from "@/lib/api";
import { copy } from "@/lib/copy";

export function TemplateDiff({
  name,
  templateTx,
  yoursTx,
  templateDaily,
  yoursDaily,
  templateDays,
  yoursDays,
}: {
  name: string;
  templateTx: number;
  yoursTx: number;
  templateDaily: number;
  yoursDaily: number;
  templateDays: number;
  yoursDays: number;
}) {
  return (
    <div className="template-diff">
      <div className="col">
        <p className="eyebrow">{copy.subscribe.stepTemplate}</p>
        <p className="meta">{name}</p>
        <p className="meta">per-tx {formatAmount(templateTx * 1_000_000)}</p>
        <p className="meta">daily {formatAmount(templateDaily * 1_000_000)}</p>
        <p className="meta">expiry {templateDays}d</p>
      </div>
      <div className="col yours">
        <p className="eyebrow">{copy.subscribe.yoursCol}</p>
        <p className="meta">{copy.subscribe.yourCaps}</p>
        <p className="meta">per-tx {formatAmount(yoursTx * 1_000_000)}</p>
        <p className="meta">daily {formatAmount(yoursDaily * 1_000_000)}</p>
        <p className="meta">expiry {yoursDays}d</p>
      </div>
    </div>
  );
}
