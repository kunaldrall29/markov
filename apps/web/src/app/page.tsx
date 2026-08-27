import { FourBeatButton } from "./FourBeatButton";
import { LiveFeed } from "@/components/LiveFeed";
import { StrategyCardView } from "@/components/StrategyCard";
import { api, type StrategyCard } from "@/lib/api";
import { copy } from "@/lib/copy";

export default async function HomePage() {
  let strategies: StrategyCard[] = [];
  let error = "";
  try {
    strategies = await api<StrategyCard[]>("/strategies");
  } catch (e) {
    error = e instanceof Error ? e.message : copy.marketplace.error;
  }

  return (
    <main className="wrap" id="main">
      <p className="eyebrow">{copy.marketplace.eyebrow}</p>
      <div className="marketplace">
        <LiveFeed />
        <div>
          <FourBeatButton />
          {error ? (
            <p className="no" role="alert">
              {copy.marketplace.error} ({error})
            </p>
          ) : strategies.length === 0 ? (
            <section className="card">
              <h3>{copy.marketplace.empty}</h3>
            </section>
          ) : (
            <div className="grid">
              {strategies.map((s) => (
                <StrategyCardView key={s.strategyId} s={s} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
