import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { MandateEngine, type EngineSnapshot } from "@markov/engine";

const LEDGER = process.env.MARKOV_LEDGER ?? `${import.meta.dir}/../../../data/ledger.json`;

export function loadEngine(): MandateEngine {
  try {
    const raw = readFileSync(LEDGER, "utf8");
    const snapshot = JSON.parse(raw) as EngineSnapshot;
    return new MandateEngine({ snapshot });
  } catch {
    return new MandateEngine();
  }
}

export function persist(engine: MandateEngine) {
  mkdirSync(dirname(LEDGER), { recursive: true });
  writeFileSync(LEDGER, JSON.stringify(engine.snapshot(), null, 2));
}
