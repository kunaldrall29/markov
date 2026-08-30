# Master build prompt — MVP v2.2 §B

Source: 2026-08-29 completion sprint. Full gates live in `docs/markov-mvp-v2.md` and `SPEC.md`.

NON-NEGOTIABLES: fail closed; every allow and block emits a canonical BlockReason; unpause is owner-only; BlockReason codes append-only; no scope beyond this prompt (else `BACKLOG.md`); update SESSION_LOG and FACTS.

Tracks A (deploy/domains) unblocks B (hosted loop). B unblocks C proof. D is parallel. Chain or hosted-URL evidence only. `data/ledger.json` never counts.

A1 org transfer · A2 real `main` · A3 git autodeploy · A4 canonical domains · A5 favicon / bun lock / one Telegram poller.

B1 chain-native indexer · B2 `chainReady` from RPC + lag · B3 non-empty public ledger · B4 hosted four-beat · B5 receipts live flag.

C1 three distinct house operator keypairs · C2 on-chain house ticks · C3 fan-out N txs with `strategy_id` · C4 eleven on-chain refusals · C5 `cargo test` / `anchor test` · C6 Telegram kill switch with real sigs.

D1 litepaper v0.6.1 on markovhq.com (not this repo’s restyle) · D2 this grant pack · D3 secret scan · D4 one contact inbox · D5 FACTS: `F-DOMAIN-FLOAT` / `F-DOMAIN-RECEIPTS` closed, `F-DOMAIN-SUBDOMAINS` open (Kunal), `F-X402-SETTLE-MINT` deferred-M2.
