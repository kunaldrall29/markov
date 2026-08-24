import {
  DEFAULT_SWAP,
  DEFAULT_YIELD,
  PROGRAMS,
  TOKENS,
  utcDayStamp,
  type ActionKind,
  type BlockReason,
  type DepositIntent,
  type EngineSnapshot,
  type Intent,
  type Mandate,
  type OperatorProfile,
  type Policy,
  type Receipt,
  type SpendIntent,
  type SwapIntent,
  type SwapPool,
  type WithdrawVenueIntent,
  type YieldPool,
} from "./types";

export interface Clock {
  now(): number;
}

export const systemClock: Clock = {
  now: () => Math.floor(Date.now() / 1000),
};

function clonePolicy(policy: Policy): Policy {
  return {
    programAllowlist: [...policy.programAllowlist],
    tokenAllowlist: [...policy.tokenAllowlist],
    perTxCap: policy.perTxCap,
    dailyCap: policy.dailyCap,
    spendPerCallCap: policy.spendPerCallCap,
    spendDailyCap: policy.spendDailyCap,
    maxSlippageBps: policy.maxSlippageBps,
  };
}

function quoteSwap(pool: SwapPool, tokenIn: string, amountIn: number): number {
  const fee = Math.floor((amountIn * pool.feeBps) / 10_000);
  const net = amountIn - fee;
  if (tokenIn === TOKENS.usdcd) {
    return Math.floor((net * pool.rateNum) / pool.rateDen);
  }
  return Math.floor((net * pool.rateDen) / pool.rateNum);
}

export class MandateEngine {
  operators = new Map<string, OperatorProfile>();
  mandates = new Map<string, Mandate>();
  receipts: Receipt[] = [];
  swap: SwapPool;
  yield: YieldPool;
  nextMandateSeq: number;
  private clock: Clock;

  constructor(opts?: { clock?: Clock; snapshot?: EngineSnapshot }) {
    this.clock = opts?.clock ?? systemClock;
    this.swap = opts?.snapshot?.swap ?? { ...DEFAULT_SWAP };
    this.yield = opts?.snapshot?.yield ?? { ...DEFAULT_YIELD };
    this.nextMandateSeq = opts?.snapshot?.nextMandateSeq ?? 1;
    if (opts?.snapshot) {
      for (const op of opts.snapshot.operators) this.operators.set(op.authority, { ...op });
      for (const m of opts.snapshot.mandates) {
        this.mandates.set(m.id, {
          ...m,
          policy: clonePolicy(m.policy),
          vault: { ...m.vault },
        });
      }
      this.receipts = [...opts.snapshot.receipts];
    }
  }

  snapshot(): EngineSnapshot {
    return {
      operators: [...this.operators.values()].map((o) => ({ ...o })),
      mandates: [...this.mandates.values()].map((m) => ({
        ...m,
        policy: clonePolicy(m.policy),
        vault: { ...m.vault },
      })),
      receipts: [...this.receipts],
      swap: { ...this.swap },
      yield: { ...this.yield },
      nextMandateSeq: this.nextMandateSeq,
    };
  }

  private ts(): number {
    return this.clock.now();
  }

  private emit(receipt: Receipt): Receipt {
    this.receipts.push(receipt);
    return receipt;
  }

  mandate(id: string): Mandate {
    const m = this.mandates.get(id);
    if (!m) throw new Error(`unknown mandate ${id}`);
    return m;
  }

  private rollover(m: Mandate, ts: number) {
    const stamp = utcDayStamp(ts);
    if (stamp !== m.dayStamp) {
      m.dayStamp = stamp;
      m.spentToday = 0;
      m.spendToday = 0;
    }
  }

  registerOperator(profile: OperatorProfile): OperatorProfile {
    this.operators.set(profile.authority, { ...profile });
    return profile;
  }

  createMandate(input: {
    owner: string;
    operator: string;
    emergencyKey?: string | null;
    policy: Policy;
    ttlSecs: number;
  }): Mandate {
    if (input.policy.programAllowlist.length === 0 || input.policy.programAllowlist.length > 4) {
      throw new Error("program allowlist must have 1–4 entries");
    }
    if (input.policy.tokenAllowlist.length === 0 || input.policy.tokenAllowlist.length > 4) {
      throw new Error("token allowlist must have 1–4 entries");
    }
    const ts = this.ts();
    const id = `mdt_${String(this.nextMandateSeq).padStart(4, "0")}`;
    this.nextMandateSeq += 1;
    const mandate: Mandate = {
      id,
      owner: input.owner,
      operator: input.operator,
      emergencyKey: input.emergencyKey ?? null,
      policy: clonePolicy(input.policy),
      state: "Active",
      createdTs: ts,
      expiresTs: ts + input.ttlSecs,
      dayStamp: utcDayStamp(ts),
      spentToday: 0,
      spendToday: 0,
      nonce: 0,
      vault: {},
      yieldShares: 0,
    };
    this.mandates.set(id, mandate);
    this.emit({
      type: "MandateCreated",
      ts,
      mandateId: id,
      owner: input.owner,
      operator: input.operator,
    });
    return mandate;
  }

  fund(mandateId: string, caller: string, token: string, amount: number): Receipt {
    const m = this.mandate(mandateId);
    if (caller !== m.owner) throw new Error("only owner can fund");
    if (amount <= 0) throw new Error("amount must be positive");
    if (!m.policy.tokenAllowlist.includes(token)) throw new Error("token not allowlisted");
    m.vault[token] = (m.vault[token] ?? 0) + amount;
    return this.emit({
      type: "MandateFunded",
      ts: this.ts(),
      mandateId,
      token,
      amount,
    });
  }

  amendPolicy(mandateId: string, caller: string, policy: Policy): Receipt {
    const m = this.mandate(mandateId);
    if (caller !== m.owner) throw new Error("only owner can amend policy");
    if (m.state === "Revoked") throw new Error("revoked");
    m.policy = clonePolicy(policy);
    return this.emit({ type: "PolicyAmended", ts: this.ts(), mandateId });
  }

  pause(mandateId: string, caller: string): Receipt {
    const m = this.mandate(mandateId);
    this.assertEmergencyOrOwner(m, caller);
    if (m.state !== "Active") throw new Error("can only pause an active mandate");
    m.state = "Paused";
    return this.emit({ type: "Paused", ts: this.ts(), mandateId, by: caller });
  }

  unpause(mandateId: string, caller: string): Receipt {
    const m = this.mandate(mandateId);
    if (caller !== m.owner) throw new Error("only owner can unpause");
    if (m.state !== "Paused") throw new Error("not paused");
    m.state = "Active";
    return this.emit({ type: "Unpaused", ts: this.ts(), mandateId, by: caller });
  }

  revoke(mandateId: string, caller: string): Receipt {
    const m = this.mandate(mandateId);
    this.assertEmergencyOrOwner(m, caller);
    if (m.state === "Revoked") throw new Error("already revoked");
    m.state = "Revoked";
    return this.emit({ type: "Revoked", ts: this.ts(), mandateId, by: caller });
  }

  ownerWithdraw(mandateId: string, caller: string, token: string, amount: number): Receipt {
    const m = this.mandate(mandateId);
    if (caller !== m.owner) throw new Error("only owner can withdraw");
    if (amount <= 0) throw new Error("amount must be positive");
    const bal = m.vault[token] ?? 0;
    if (bal < amount) throw new Error("insufficient vault balance");
    m.vault[token] = bal - amount;
    return this.emit({
      type: "OwnerWithdrew",
      ts: this.ts(),
      mandateId,
      token,
      amount,
    });
  }

  execute(mandateId: string, caller: string, intent: Intent): Receipt {
    const m = this.mandate(mandateId);
    const ts = this.ts();
    this.rollover(m, ts);
    const kind = intent.kind === "withdraw_venue" ? "withdraw_venue" : intent.kind;
    const requested = requestedAmount(intent);
    const blocked = this.gate(m, caller, intent, ts);
    m.nonce += 1;
    if (blocked) {
      return this.emit({
        type: "ActionRefused",
        ts,
        mandateId,
        operator: caller,
        kind,
        requestedAmount: requested,
        reason: blocked,
        nonce: m.nonce,
      });
    }
    const result = this.apply(m, intent);
    return this.emit({
      type: "ActionExecuted",
      ts,
      mandateId,
      operator: caller,
      kind,
      venue: result.venue,
      tokenIn: result.tokenIn,
      tokenOut: result.tokenOut,
      amountIn: result.amountIn,
      amountOut: result.amountOut,
      nonce: m.nonce,
    });
  }

  private assertEmergencyOrOwner(m: Mandate, caller: string) {
    if (caller === m.owner) return;
    if (m.emergencyKey && caller === m.emergencyKey) return;
    throw new Error("unauthorized");
  }

  private gate(m: Mandate, caller: string, intent: Intent, ts: number): BlockReason | null {
    if (m.state === "Paused") return "Paused";
    if (m.state === "Revoked") return "Revoked";
    if (ts >= m.expiresTs) return "Expired";
    if (caller !== m.operator) return "Unauthorized";

    const program = programFor(intent);
    if (!m.policy.programAllowlist.includes(program)) return "ProgramNotAllowed";

    const tokens = tokensFor(intent);
    for (const token of tokens) {
      if (!m.policy.tokenAllowlist.includes(token)) return "TokenNotAllowed";
    }

    if (intent.kind === "spend") {
      if (intent.amount > m.policy.spendPerCallCap) return "OverSpendCap";
      if (m.spendToday + intent.amount > m.policy.spendDailyCap) return "OverSpendDailyCap";
      return null;
    }

    const notional = notionalAmount(intent, this.swap);
    if (notional > m.policy.perTxCap) return "OverTxCap";
    if (m.spentToday + notional > m.policy.dailyCap) return "OverDailyCap";

    if (intent.kind === "swap") {
      const expected = quoteSwap(this.swap, intent.tokenIn, intent.amountIn);
      const minAllowed = expected - Math.floor((expected * m.policy.maxSlippageBps) / 10_000);
      if (intent.minOut > expected) return "SlippageExceeded";
      if (expected < minAllowed) return "SlippageExceeded";
    }
    return null;
  }

  private apply(
    m: Mandate,
    intent: Intent,
  ): { venue: string; tokenIn: string; tokenOut: string; amountIn: number; amountOut: number } {
    if (intent.kind === "swap") {
      const out = quoteSwap(this.swap, intent.tokenIn, intent.amountIn);
      debit(m, intent.tokenIn, intent.amountIn);
      credit(m, intent.tokenOut, out);
      const notional = notionalAmount(intent, this.swap);
      m.spentToday += notional;
      return {
        venue: PROGRAMS.demoSwap,
        tokenIn: intent.tokenIn,
        tokenOut: intent.tokenOut,
        amountIn: intent.amountIn,
        amountOut: out,
      };
    }
    if (intent.kind === "deposit") {
      debit(m, intent.token, intent.amount);
      const shares = Math.floor((intent.amount * 1_000_000) / this.yield.shareValue);
      m.yieldShares += shares;
      m.spentToday += intent.amount;
      return {
        venue: PROGRAMS.demoYield,
        tokenIn: intent.token,
        tokenOut: intent.token,
        amountIn: intent.amount,
        amountOut: shares,
      };
    }
    if (intent.kind === "withdraw_venue") {
      if (intent.shares > m.yieldShares) throw new Error("insufficient shares");
      const amount = Math.floor((intent.shares * this.yield.shareValue) / 1_000_000);
      m.yieldShares -= intent.shares;
      credit(m, intent.token, amount);
      m.spentToday += amount;
      return {
        venue: PROGRAMS.demoYield,
        tokenIn: intent.token,
        tokenOut: intent.token,
        amountIn: intent.shares,
        amountOut: amount,
      };
    }
    debit(m, TOKENS.usdcd, intent.amount);
    m.spendToday += intent.amount;
    return {
      venue: "x402",
      tokenIn: TOKENS.usdcd,
      tokenOut: TOKENS.usdcd,
      amountIn: intent.amount,
      amountOut: intent.amount,
    };
  }
}

function debit(m: Mandate, token: string, amount: number) {
  const bal = m.vault[token] ?? 0;
  if (bal < amount) throw new Error("insufficient vault balance");
  m.vault[token] = bal - amount;
}

function credit(m: Mandate, token: string, amount: number) {
  m.vault[token] = (m.vault[token] ?? 0) + amount;
}

function programFor(intent: Intent): string {
  if (intent.kind === "swap") return PROGRAMS.demoSwap;
  if (intent.kind === "deposit" || intent.kind === "withdraw_venue") return PROGRAMS.demoYield;
  return "x402";
}

function tokensFor(intent: Intent): string[] {
  if (intent.kind === "swap") return [intent.tokenIn, intent.tokenOut];
  if (intent.kind === "deposit" || intent.kind === "withdraw_venue") return [intent.token];
  return [TOKENS.usdcd];
}

function requestedAmount(intent: Intent): number {
  if (intent.kind === "swap") return intent.amountIn;
  if (intent.kind === "deposit") return intent.amount;
  if (intent.kind === "withdraw_venue") return intent.shares;
  return intent.amount;
}

function notionalAmount(intent: Exclude<Intent, SpendIntent>, swap: SwapPool): number {
  if (intent.kind === "deposit") return intent.amount;
  if (intent.kind === "withdraw_venue") {
    return Math.floor((intent.shares * DEFAULT_YIELD.shareValue) / 1_000_000);
  }
  if (intent.tokenIn === TOKENS.usdcd) return intent.amountIn;
  return quoteSwap(swap, intent.tokenIn, intent.amountIn);
}

export function conservativePolicy(): Policy {
  return {
    programAllowlist: [PROGRAMS.demoSwap, PROGRAMS.demoYield, "x402"],
    tokenAllowlist: [TOKENS.usdcd, TOKENS.demo],
    perTxCap: 50_000_000,
    dailyCap: 200_000_000,
    spendPerCallCap: 100_000,
    spendDailyCap: 500_000,
    maxSlippageBps: 50,
  };
}

export function quoteDemoSwap(pool: SwapPool, tokenIn: string, amountIn: number): number {
  return quoteSwap(pool, tokenIn, amountIn);
}

export type { DepositIntent, SpendIntent, SwapIntent, WithdrawVenueIntent };
