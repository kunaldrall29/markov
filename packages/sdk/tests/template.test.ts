import { describe, expect, test } from "bun:test";
import {
  MOMENTUM_TEMPLATE,
  applyOverrides,
  canonicalJson,
  createMandateFromTemplate,
  strategyIdFromTemplate,
} from "../src/template";

describe("PolicyTemplate v0", () => {
  test("canonical json sorts keys and is stable", () => {
    const a = canonicalJson({ b: 1, a: { z: 2, y: 1 } });
    const b = canonicalJson({ a: { y: 1, z: 2 }, b: 1 });
    expect(a).toBe(b);
    expect(a).not.toContain(" ");
    expect(strategyIdFromTemplate(MOMENTUM_TEMPLATE)).toHaveLength(64);
    expect(strategyIdFromTemplate(MOMENTUM_TEMPLATE)).toBe(strategyIdFromTemplate({ ...MOMENTUM_TEMPLATE }));
  });

  test("overrides cannot loosen caps or allowlists", () => {
    expect(() => applyOverrides(MOMENTUM_TEMPLATE, { caps: { per_tx: MOMENTUM_TEMPLATE.caps.per_tx + 1 } })).toThrow(
      "lower per-tx",
    );
    expect(() => applyOverrides(MOMENTUM_TEMPLATE, { venue_allowlist: ["not-a-venue"] })).toThrow("subset");
  });

  test("createMandateFromTemplate hashes the published template, not overrides", () => {
    const base = createMandateFromTemplate(MOMENTUM_TEMPLATE);
    const tight = createMandateFromTemplate(MOMENTUM_TEMPLATE, { caps: { per_tx: 40_000_000 } });
    expect(tight.strategyId).toBe(base.strategyId);
    expect(tight.policy.perTxCap).toBe(40_000_000);
    expect(base.policy.perTxCap).toBe(100_000_000);
    expect(tight.operator).toBe(MOMENTUM_TEMPLATE.operator);
  });
});
