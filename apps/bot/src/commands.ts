const API = process.env.API_URL ?? "http://127.0.0.1:8787";
const ACTOR = process.env.BOT_ACTOR ?? "bot_emergency";

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

function botUsername(): string {
  return (process.env.TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "");
}

export function deepLink(mandateId: string): string | null {
  const username = botUsername();
  if (!username || !mandateId) return null;
  return `https://t.me/${username}?start=${mandateId}`;
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
      "/link <id>",
    ].join("\n");
  }
  if (cmd === "/link") {
    if (!id) return "Mandate id required. /link <mandateId>";
    const url = deepLink(id);
    if (!url) {
      return "TELEGRAM_BOT_USERNAME unset. Deep link lands when the BotFather name is in env.";
    }
    return url;
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
