/**
 * Float bot — emergency key only.
 * Can pause and revoke. Cannot fund, trade, spend, or withdraw.
 */
import { handleCommand } from "./commands";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? "";
const port = Number(process.env.PORT ?? 8789);

export { handleCommand } from "./commands";

function health() {
  return Response.json({
    service: "float-bot",
    tokenSet: Boolean(TOKEN),
    username: USERNAME,
  });
}

async function telegramLoop() {
  if (!TOKEN) {
    console.log("bot CLI mode (no TELEGRAM_BOT_TOKEN)");
    const cmd = Bun.argv.slice(2).join(" ");
    if (cmd) {
      console.log(await handleCommand(cmd.startsWith("/") ? cmd : `/${cmd}`));
    } else {
      console.log("usage: bun run src/index.ts '/revoke mdt_0001'");
    }
    return;
  }
  let offset = 0;
  console.log("telegram bot polling");
  while (true) {
    const res = await fetch(
      `https://api.telegram.org/bot${TOKEN}/getUpdates?timeout=25&offset=${offset}`,
    );
    const data = (await res.json()) as {
      result?: { update_id: number; message?: { chat: { id: number }; text?: string } }[];
    };
    for (const update of data.result ?? []) {
      offset = update.update_id + 1;
      const text = update.message?.text;
      const chat = update.message?.chat.id;
      if (!text || !chat) continue;
      try {
        const reply = await handleCommand(text);
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id: chat, text: reply }),
        });
      } catch (err) {
        console.error(err);
      }
    }
  }
}

if (import.meta.main) {
  Bun.serve({
    port,
    hostname: "0.0.0.0",
    fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === "/health" || url.pathname === "/") return health();
      return new Response("not found", { status: 404 });
    },
  });
  console.log("float-bot health on", port);
  await telegramLoop();
}
