# Float UI — authority-light

Float is a receipts product. The signature object is the **refusal row**: a steel stamp, not an error. If one screenshot circulates, it should be `⊘ blocked: over_cap` on near-black.

## Palette

| Role | Hex | Use |
|---|---|---|
| base | `#0a0a0b` | inherited live-site black |
| surface | `#111318` | cards |
| text | `#e6eaee` | cool paper (not cream) |
| muted | `#9aa3ad` | secondary mono |
| edge | `#1e242c` | hairline, cool |
| authority | `#8ec8d8` | ice lamp — Active mandate glow, primary CTA, focus |
| action-ok | `#9aada3` | sea-glass execute (not neon green) |
| refusal | `#7c8eb0` | steel stamp for refusals (not panic red) |

Accent justification: authority is the cold lamp an operator is allowed to carry only while a mandate is Active; when the mandate pauses or revokes, that glow goes out.

Self-critique: a generic dark dashboard would pick gold or acid green. Gold and terracotta are banned here. The ice lamp + steel refusal pair is the product (custody + refusals as credentials).

## Type

- Display: Fraunces (strategy names, section heads). Sparse.
- Body: IBM Plex Sans.
- Mono: IBM Plex Mono, `tabular-nums` — receipts, chips, addresses. The mono carries more UI than usual.

## Wireframes

```
375 marketplace
┌─────────────────────┐
│ FLOAT          Menu │
│ live receipt stream │  ← thesis, not slogan
│ ⊘ blocked: over_cap │
│ ─────────────────── │
│ Momentum-Demo       │
│ @markov-momentum    │
│ 12 act · 7 ref · 3d │  record strip, chain-derived
│ per-tx ≤ 100  daily │
│ [Subscribe] [Record]│
└─────────────────────┘

1440 marketplace: stream left rail, cards 3-col.

Subscribe: template chips → cap steppers → YOURS | TEMPLATE diff → fund.
Console: authority glow if Active; cap meters; withdraw always present.
Kill: breaker plate, arm then revoke.
```

## Motion

See `motion.md`. One moment: a receipt arriving. Action: 8px drop. Refusal: 6px from the steel rail. `prefers-reduced-motion: reduce` → instant.

## Copy

Vocabulary: strategy, mandate, receipt, refusal, revoke. Refusal: `Blocked: <reason>. The policy held.`
