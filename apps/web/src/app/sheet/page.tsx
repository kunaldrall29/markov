"use client";

import { useState } from "react";
import { BlockReasonBadge } from "@/components/BlockReasonBadge";
import { CapProximity } from "@/components/CapProximity";
import { CapStepper } from "@/components/CapStepper";
import { KillSwitch, WithdrawButton } from "@/components/KillSwitch";
import { PolicyChip } from "@/components/PolicyChip";
import { ReceiptRow, type ReceiptLike } from "@/components/ReceiptRow";
import { RecordStrip } from "@/components/RecordStrip";
import { StrategyCardView } from "@/components/StrategyCard";
import { TemplateDiff } from "@/components/TemplateDiff";
import { TrackRecordCard } from "@/components/TrackRecordCard";
import { copy } from "@/lib/copy";
import { BLOCK_REASONS } from "@/lib/reasons";

const action: ReceiptLike = {
  type: "ActionExecuted",
  ts: 1_700_000_000,
  mandateId: "mdt_sheet",
  amountIn: 40_000_000,
};
const refusal: ReceiptLike = {
  type: "ActionRefused",
  ts: 1_700_000_010,
  mandateId: "mdt_sheet",
  reason: "OverTxCap",
  requestedAmount: 60_000_000,
};

const sampleStrategy = {
  slug: "momentum",
  name: "Momentum-Demo",
  blurb: "Pays for a quote over x402, then buys DEMO under cap.",
  strategyId: "demo",
  template: {
    operator: "markov-momentum",
    venue_allowlist: ["demo_swap"],
    token_allowlist: ["USDC-d", "DEMO"],
    caps: { per_tx: 100_000_000, daily: 500_000_000 },
    execution_bounds: { max_slippage_bps: 80 },
    x402_budget: { per_call: 100_000, daily: 400_000 },
    expiry_default_days: 30,
    fee_terms: { mgmt_bps: 80, perf_bps: 0 },
  },
  stats: {
    actions: 12,
    refusals: 7,
    refusalRate: 7 / 19,
    volume: 480_000_000,
    pnl: 1_200_000,
    subscribers: 3,
    tenureSecs: 3 * 86400,
    feesBps: 80,
  },
};

function StateLabel({ children }: { children: string }) {
  return <p className="eyebrow">{children}</p>;
}

export default function SheetPage() {
  const [armed, setArmed] = useState(false);
  const [cap, setCap] = useState(40);

  return (
    <main className="wrap" id="main">
      <p className="eyebrow">{copy.sheet.eyebrow}</p>
      <h1>{copy.sheet.title}</h1>
      <div className="sheet-grid">
        <section>
          <h2>PolicyChip</h2>
          <div className="states">
            <div>
              <StateLabel>{copy.sheet.default}</StateLabel>
              <div className="chips">
                <PolicyChip>daily ≤ 200</PolicyChip>
                <PolicyChip tone="authority">per-tx ≤ 50</PolicyChip>
                <PolicyChip tone="refusal">refusals 7</PolicyChip>
              </div>
            </div>
            <div>
              <StateLabel>{copy.sheet.empty}</StateLabel>
              <div className="chips" />
            </div>
          </div>
        </section>

        <section>
          <h2>BlockReasonBadge</h2>
          <div className="chips">
            {BLOCK_REASONS.map((reason) => (
              <BlockReasonBadge key={reason} reason={reason} />
            ))}
          </div>
        </section>

        <section>
          <h2>ReceiptRow / RefusalRow</h2>
          <div className="states">
            <div className="card">
              <StateLabel>{copy.sheet.default}</StateLabel>
              <ReceiptRow receipt={action} />
              <ReceiptRow receipt={refusal} />
            </div>
            <div className="card">
              <StateLabel>{copy.sheet.arriving}</StateLabel>
              <ReceiptRow receipt={action} arrive />
              <ReceiptRow receipt={refusal} arrive />
            </div>
            <div className="card">
              <StateLabel>{copy.sheet.empty}</StateLabel>
              <p className="meta">{copy.console.receiptsEmpty}</p>
            </div>
            <div className="card">
              <StateLabel>{copy.sheet.loading}</StateLabel>
              <p className="meta">{copy.console.loading}</p>
            </div>
            <div className="card">
              <StateLabel>{copy.sheet.error}</StateLabel>
              <p className="no" role="alert">
                {copy.marketplace.error}
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2>StrategyCard + RecordStrip</h2>
          <div className="states">
            <div>
              <StateLabel>{copy.sheet.default}</StateLabel>
              <StrategyCardView s={sampleStrategy} />
            </div>
            <div>
              <StateLabel>{copy.sheet.empty}</StateLabel>
              <section className="card">
                <h3>{copy.marketplace.empty}</h3>
              </section>
            </div>
            <div>
              <StateLabel>{copy.sheet.loading}</StateLabel>
              <p className="meta">{copy.marketplace.loading}</p>
            </div>
            <div>
              <StateLabel>{copy.sheet.error}</StateLabel>
              <p className="no" role="alert">
                {copy.marketplace.error}
              </p>
            </div>
          </div>
          <RecordStrip actions={12} refusals={7} tenureSecs={3 * 86400} feesBps={80} />
        </section>

        <section>
          <h2>CapStepper + TemplateDiff</h2>
          <CapStepper id="sheet-cap" label={copy.subscribe.perTx} value={cap} max={100} onChange={setCap} />
          <div style={{ marginTop: 16 }}>
            <TemplateDiff
              name="Momentum-Demo"
              templateTx={100}
              yoursTx={cap}
              templateDaily={500}
              yoursDaily={200}
              templateDays={30}
              yoursDays={14}
            />
          </div>
        </section>

        <section>
          <h2>KillSwitch + withdraw</h2>
          <div className="states">
            <div className="kill-breaker">
              <StateLabel>{copy.sheet.default}</StateLabel>
              <div className="actions">
                <KillSwitch armed={armed} onArm={() => setArmed(true)} onRevoke={() => setArmed(false)} />
                <WithdrawButton amount={80_000_000} state="Revoked" label={copy.console.withdraw} onWithdraw={() => undefined} />
              </div>
            </div>
            <div>
              <StateLabel>{copy.sheet.empty}</StateLabel>
              <p className="meta">{copy.kill.empty}</p>
            </div>
          </div>
        </section>

        <section>
          <h2>CapProximity</h2>
          <CapProximity label="daily cap" pct={0.82} />
          <CapProximity label="spend cap" pct={0.2} />
        </section>

        <section>
          <h2>TrackRecordCard</h2>
          <TrackRecordCard name="Momentum-Demo" handle="markov-momentum" actions={128} refusals={47} tenureSecs={12 * 86400} />
        </section>
      </div>
    </main>
  );
}
