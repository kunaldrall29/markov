# Receipt arrival motion

This is the only orchestrated moment in Float. Everything else is instant.

## Action receipt

- Duration: 180ms
- Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`
- From: opacity 0, translateY(-8px)
- To: opacity 1, transform none
- Color: `--action-ok` (`action-ok` token)

## Refusal receipt

- Duration: 220ms
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)`
- From: opacity 0, translateX(-6px)
- To: opacity 1, transform none
- Steel rail: 3px left border `--refusal` on `--refusal-surface`
- Badge settles with the row; no separate bounce

## Reduced motion

`@media (prefers-reduced-motion: reduce)`: animation none. The row appears in its final state.

Classes: `.receipt-arrive` · `.refusal-arrive`
