# Float bot (`apps/bot`)

Emergency key only. Pause and revoke. Cannot fund, trade, spend, unpause, or withdraw.

```bash
bun run --filter @markov/bot start '/revoke mdt_0001'
```

Telegram: set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME` (`@markovfloat_bot` or `@float_markov_bot`). `/link <id>` prints `https://t.me/<user>?start=<id>`.

Health: `PORT=8789 bun apps/bot/src/index.ts` → `/health`.
