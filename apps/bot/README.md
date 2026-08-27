# Float bot (`apps/bot`)

Emergency key only. Pause and revoke. Cannot fund, trade, spend, unpause, or withdraw.

```bash
bun run --filter @markov/bot start '/revoke mdt_0001'
```

Telegram: set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME=markov_float_bot`. `/link <id>` prints `https://t.me/markov_float_bot?start=<id>`. Token is gitignored (`.env`), never committed.

Health: `PORT=8789 bun apps/bot/src/index.ts` → `/health`.
