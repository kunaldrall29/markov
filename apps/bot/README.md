# Float bot (`apps/bot`)

Emergency key only. Pause and revoke. Cannot fund, trade, spend, unpause, or withdraw.

```bash
bun run --filter @markov/bot start '/revoke mdt_0001'
```

Telegram: set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME=markov_float_bot`. `/link <id>` prints `https://t.me/markov_float_bot?start=<id>`. Token is gitignored (`.env`), never committed.

**One poller.** Railway owns `getUpdates` for `markov_float_bot`. Local loopback does **not** poll unless `TELEGRAM_POLL=1`, and that must be a **separate test-bot token**. Two pollers on the same token collide. `TELEGRAM_POLL=0` forces polling off.

Pause and revoke from Telegram require `TELEGRAM_ALLOWED_CHAT_IDS` (send `/whoami` in the bot, then put that chat id in env). Without an allowlist, `/pause` and `/revoke` are refused. CLI (no chat id) still works for local demos.

Health: `PORT=8789 bun apps/bot/src/index.ts` → `/health`. Default bind is `127.0.0.1`. Set `HOST=0.0.0.0` only when you intend a public health port.
