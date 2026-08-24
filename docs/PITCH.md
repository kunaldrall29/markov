# Markov — The Complete Picture & The Pitch

Working doc · August 2026 · Internal (source for deck, site, and submission copy)

---

## 1. One-liner and elevator

**One-liner:** Markov is the trust layer for capital in the agent economy — it enforces what operators can do, proves what they did, and will price what they're worth.

**Alternate (consumer register):** Give an agent your capital. Keep the keys.

**30-second pitch:** Every agent will eventually manage money; nobody sane will hand one unbounded keys. Markov is the mandate layer on Solana: non-custodial accounts where AI agents and human strategists operate other people's capital under policy the chain itself enforces — venue and token allowlists, caps, spend budgets, expiry, instant revoke. Every action *and every refusal* emits a verifiable receipt, so track records become provable instead of screenshots. Receipts compound into scores, scores into bonds, bonds into credit — Markov becomes the layer that underwrites autonomous operators. Float is the consumer surface: hire an operator in one click, watch everything live, kill it anytime, from the web or Telegram. Revenue today is a share of operator fees; the durable business is the reputation graph nobody else can build.

## 2. What the product is — complete

**The protocol (Markov).** One Solana program implementing mandates: owner-funded, operator-driven, policy-bounded, receipt-emitting, instantly revocable accounts. Fail-closed gate stack; no code path from operator authority to withdrawal. The physics layer.

**The consumer product (Float).**
- **Marketplace** — browse operators (agents and humans) with chain-derived track records: actions, refusals, tenure, fees. Fund a mandate in one flow from a policy preset.
- **Console** — live receipt feed (refusals flagged with reasons), policy state, balances, pause/unpause, revoke, always-available owner withdraw. Kill switch = pause everything.
- **Float agent (Telegram)** — alerts (refusals, cap approach, expiry) and revoke-by-command, holding a program-limited emergency key that can *only* pause or revoke. A compromised bot can only protect you.
- **Copilot → autopilot** — start with per-action approval, graduate to full mandates on identical rails and identical receipts.
- **Launch radar** — read-only discovery with always-computed token risk scores; informs, never executes.
- **First-party agents** — conservative seed operators (DCA, dip-buyer, yield rotation) proving the pattern on the public SDK.

**The developer surface.** Operator SDK (propose → policy-validated execution → receipts), Client SDK (mandate lifecycle for wallets/frontends), Score SDK (scores + evidence bundles any protocol can gate on), venue adapter kit (one interface, behind every gate), MCP server + skill files (any LLM agent takes a mandate as a tool). All thin skins over one program IDL.

**The data layer.** Receipts index API; hosted score API metered over x402 — agents pay per reputation check on the rails their own mandates govern.

## 3. Feature inventory by phase

**Live at MVP (Phase 0, devnet):** mandates (create/fund/amend/pause/revoke/withdraw); program + token allowlists; per-tx and daily caps; x402 spend budgets; slippage bounds; action + refusal receipts with machine-readable BlockReason; emergency-key bot authority; marketplace, console, kill switch; Telegram Float agent; two first-party agents; operator SDK (embryonic).

**Phase 1 (mainnet beta):** audit; guarded launch with size caps; copilot mode; launch radar; in-program fee settlement + protocol fee switch; client SDK, MCP server, receipts index API; hardened operator SDK.

**Phase 2 (scale):** pooled mandates (many owners → one operator, share accounting, oracle NAV); perp adapters with leverage/position caps; prediction-market adapters where CPI-able; oracle-backed portfolio limits (drawdown, exposure); verifiable execution attestation (TEE → zk); x402 escrow/refund recourse; Score SDK with versioned open model + hosted x402-metered index.

**Phase 3 (credit):** formalized operator score; operator bonds + slashing; progressive-collateralization credit lines — proven operators borrow against bonded, receipt-backed history, collateral requirements declining as history deepens. Markov doesn't launch a money market; it makes credit venues able to price operators.

## 4. How the money works — two engines

**Engine 1 — fees (funds the company).**
- Protocol share of operator fees, enforced at in-program settlement: target 10–15% of operator performance/management fees.
- Float marketplace fee on funded mandates; premium allocator analytics.
- Napkin: operators earn ~1.5–3% blended annually on TVM → protocol revenue ≈ TVM × 0.2–0.45%/yr. $1B TVM ≈ $2–4.5M ARR. $5B ≈ $10–22M.

**Engine 2 — data and credit (makes it venture-scale).**
- Score API metered per check over x402 — machine-to-machine revenue that scales with agent activity, not TVM.
- Bond/slashing economics at Phase 3; credit-line origination takes bps on *borrowed volume*, a larger and faster-compounding base than management fees.
- The structural point: this engine runs on data competitors cannot recreate, because receipts only accrue where enforcement lives. Every month of operation widens the gap.

**Open core.** Program + SDKs open and never credit-gated (adoption strategy); Float hosted carries billing, managed infra, premium analytics, metered APIs (the business). No token at launch — fees accrue in-kind; a token is a distribution decision deferred until it has a job.

## 5. The billion-dollar model — three tiers, stated honestly

**Tier A — $100M-class outcome (fee business works).** Float finds product-market fit in human delegation now, agents layering in; $1–3B TVM; $5–15M ARR; strong niche infra company. Requires: marketplace liquidity on both sides and retention.

**Tier B — $1B-class outcome (the standard + the graph).** The mandate becomes the default container for delegated/agent capital on Solana; TVM $10B+ *or* the score gates meaningful credit flow; revenue mixes toward data + origination. Fees alone need roughly $15–25B TVM to defend $1B — top-five-DeFi territory; the credit/score engine reaches the same valuation at a fraction of the TVM because it monetizes volume and checks, not just AUM. Requires, in order: (1) agent-managed capital becomes a real category (external bet, hedged — human delegation monetizes today); (2) mandates win the default (execution bet — SDK + MCP + published open spec so adopting is easier than not); (3) the receipt graph compounds before incumbents extend down (speed bet); (4) the score is trusted enough to underwrite (neutrality + open, recomputable methodology).

**Tier Zero — what kills it.** Agent AUM never materializes *and* human delegation stays niche; or Squads-class smart accounts / vault incumbents / the Coinbase stack ship good-enough adversarial delegation first; or operator-marketplace regulation makes the consumer surface untenable. Pre-committed fallback: the same program pivots to the B2B agent-spend wedge (treasury mandates + budgets for companies deploying agents) — enforcement demand exists there regardless of trading demand.

## 6. Moat

1. **The receipt graph** — history is non-portable; competitors start at zero no matter their distribution.
2. **Standard-setting** — publish the mandate + BlockReason spec openly; if wallets, venues, and agent frameworks adopt the shape, Markov is the reference implementation of its own category.
3. **Two-sided lock-in** — operators accrue provable track record here; owners get enforcement here; each side deepens the other.
4. **Neutrality** — venues, key platforms, and exchanges can't be the referee between each other's users. A neutral layer can.
5. **Distribution via machines** — MCP + skill files make mandates the path of least resistance for every LLM-agent framework; the score API being x402-metered makes agents themselves paying customers.

## 7. The pitch — 10-slide skeleton (key line per slide)

1. **Title.** Markov — the trust layer for capital in the agent economy. *"Give an agent your capital. Keep the keys."*
2. **Problem.** Delegation is binary: hand over custody or hand over an unbounded key. Track records are screenshots. Agents make it acute.
3. **Why now.** Machine payments are real (x402 volume, value shifted to $1+ flows), agent identity is live, the hype shakeout is done — authority is the missing layer. (Use the litepaper's dated, sourced figures; refresh before presenting.)
4. **Product.** The mandate: policy the chain enforces, withdrawal only ever to the owner. *Show the console with a live refusal: `blocked: over_cap`.* The refusal on screen is the demo climax.
5. **Float.** Marketplace, console, kill switch, Telegram agent with revoke-only authority; copilot → autopilot.
6. **How.** Fixed-order gate stack; soft gates in the SDK, hard gates in the program; receipts for actions *and* refusals. *"A stolen operator key is a bounded event, not a drained wallet."*
7. **Business.** Open-core; fee share at settlement; score API metered over x402. The ladder: receipts → score → bonds → credit — *in that order, because it can't be built in any other.*
8. **Market & math.** Two engines: fees scale with TVM; data/credit scale with activity. Show the tier model plainly — investors respect the honest version.
9. **Moat.** The graph compounds where enforcement lives. Neutrality is the position nobody vertically integrated can take.
10. **Team, traction, ask.** Live devnet MVP, working demo, open spec, roadmap. The ask and what it buys (audit + guarded mainnet).

## 8. Objection prep

**"Why not Squads / smart accounts?"** Those govern *your own* keys — self-custody limits. Markov governs a *stranger's* authority over your capital, and outputs a track record. Different problem, different primitive; complementary at the key layer.

**"Coinbase or Jupiter could ship this."** They could ship enforcement; they can't ship neutrality (they're counterparties in the flows being refereed) and they can't ship our accrued receipt history. Our defense is speed + the open standard + the graph. We say this plainly rather than pretending they can't move.

**"Cold start?"** First-party agents seed supply; operators come for allocable capital plus the only provable track record in the space; owners come for enforcement. Human delegation (copy-trading, strategists, treasuries) is demand that exists *today* — agents are the growth curve, not the prerequisite.

**"Why Solana?"** Per-action policy checks need sub-cent fees and fast finality; x402 activity and stablecoin depth concentrate here; the protocol roadmap (application-controlled execution) points exactly at programs enforcing their own policy. (Verify current figures/naming before citing.)

**"Regulation?"** Operators managing third-party capital may carry adviser-type obligations by jurisdiction — that compliance sits with operators; the protocol is neutral infrastructure enforcing owner-set policy, and Float can geo-scope surfaces where required. Design consideration, not legal advice.

**"Why no token?"** Because the model doesn't need one to make money, and credibility is worth more than a launch pop. Revenue accrues in-kind; a token waits until it has a job.

**"What's the biggest real risk?"** Timing on agent AUM. Hedged by human delegation monetizing now and the pre-committed B2B agent-spend fallback on the same program.

---

*Claims discipline: every external figure used in the deck must come from the litepaper's verification appendix, refreshed with source + date before any public presentation. If it isn't in FACTS.md, it isn't on a slide.*
