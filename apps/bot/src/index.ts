/**
 * Float bot — emergency key only.
 * Can pause and revoke. Cannot fund, trade, spend, or withdraw.
 */
const API = process.env.API_URL ?? "http://127.0.0.1:8787";
const ACTOR = process.env.BOT_ACTOR ?? "bot_emergency";
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function call(path: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-actor": ACTOR },
    body: body ? JSON.stringify(body) : "{}",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return JSON.parse(text);
}

function parseCommand(text: string): { cmd: string; id?: string } | null {
  const parts = text.trim().split(/\s+/);
  const cmd = parts[0]?.toLowerCase();
  if (!cmd) return null;
  return { cmd, id: parts[1] };
}

export async function handleCommand(text: string) {
  const parsed = parseCommand(text);
  if (!parsed) return "Send /pause <mandateId> or /revoke <mandateId>.";
  const { cmd, id } = parsed;
  if (cmd === "/start" || cmd === "/help") {
    return [
      "Float emergency bot.",
      "I can pause or revoke a mandate. I cannot trade, spend, or withdraw.",
      "/pause <id>",
      "/revoke <id>",
      "/status <id>",
    ].join("\n");
  }
  if (!id) return "Mandate id required.";
  if (cmd === "/pause") {
    const r = await call(`/mandates/${id}/pause`);
    return `Paused ${id} (${r.type}).`;
  }
  if (cmd === "/revoke") {
    const r = await call(`/mandates/${id}/revoke`);
    return `Revoked ${id} (${r.type}).`;
  }
  if (cmd === "/status") {
    const res = await fetch(`${API}/mandates/${id}`);
    const data = await res.json();
    return `${id} state=${data.mandate?.state ?? "unknown"}`;
  }
  return "Unknown command. /help";
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
  await telegramLoop();
}
