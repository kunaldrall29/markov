import { canMutate } from "./allow";

const API = process.env.API_URL ?? "http://127.0.0.1:8787";
const ACTOR = process.env.BOT_ACTOR ?? "bot_emergency";

function apiHeaders(): Record<string, string> {
  const secret = process.env.MARKOV_API_SECRET?.trim();
  return {
    "content-type": "application/json",
    "x-actor": ACTOR,
    ...(secret ? { "x-api-key": secret } : {}),
  };
}

async function call(path: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: apiHeaders(),
    body: body ? JSON.stringify(body) : "{}",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return JSON.parse(text);
}

function parseCommand(text: string): { cmd: string; id?: string } | null {
  const parts = text.trim().split(/\s+/);
  const raw = parts[0]?.toLowerCase();
  if (!raw) return null;
  const cmd = raw.split("@")[0] ?? raw;
  return { cmd, id: parts[1] };
}

function botUsername(): string {
  return (process.env.TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "");
}

const HELP = [
  "Float emergency bot.",
  "I can pause or revoke a mandate. I cannot trade, spend, or withdraw.",
  "/pause <id>",
  "/revoke <id>",
  "/status <id>",
  "/link <id>",
  "/strategies",
  "/whoami",
].join("\n");

export function deepLink(mandateId: string): string | null {
  const username = botUsername();
  if (!username || !mandateId) return null;
  return `https://t.me/${username}?start=${mandateId}`;
}

function denyMutate(): string {
  return [
    "This Telegram chat is not allowed to pause or revoke.",
    "Send /whoami, then set TELEGRAM_ALLOWED_CHAT_IDS to that chat id.",
  ].join(" ");
}

export async function handleCommand(text: string, chatId?: number) {
  const parsed = parseCommand(text);
  if (!parsed) return HELP;
  const { cmd, id } = parsed;
  if (cmd === "/start" || cmd === "/help") {
    if (cmd === "/start" && id) {
      const url = deepLink(id);
      return [`Mandate ${id}.`, url ?? "Set TELEGRAM_BOT_USERNAME for a deep link.", HELP].join("\n");
    }
    return HELP;
  }
  if (cmd === "/whoami") {
    if (chatId == null) return "CLI has no Telegram chat id.";
    return `chat id ${chatId}`;
  }
  if (cmd === "/strategies") {
    const res = await fetch(`${API}/strategies`);
    if (!res.ok) return "strategies unavailable";
    const rows = (await res.json()) as {
      name?: string;
      slug?: string;
      template?: { operator?: string };
      stats?: { actions?: number; refusals?: number };
    }[];
    if (!Array.isArray(rows) || rows.length === 0) return "No published strategies.";
    return rows
      .map((s) => {
        const actions = s.stats?.actions ?? 0;
        const refusals = s.stats?.refusals ?? 0;
        const op = s.template?.operator ?? s.slug ?? "operator";
        return `${s.name ?? s.slug}: ${op} — actions ${actions}, refusals ${refusals}`;
      })
      .join("\n");
  }
  if (cmd === "/link") {
    if (!id) return "Mandate id required. /link <mandateId>";
    const url = deepLink(id);
    if (!url) {
      return "TELEGRAM_BOT_USERNAME unset. Deep link lands when the BotFather name is in env.";
    }
    return url;
  }
  if (!id) {
    if (cmd === "/status") return "Mandate id required. /status <mandateId>";
    if (cmd === "/pause") return "Mandate id required. /pause <mandateId>";
    if (cmd === "/revoke") return "Mandate id required. /revoke <mandateId>";
    return "Mandate id required.";
  }
  if (cmd === "/pause") {
    if (!canMutate(chatId)) return denyMutate();
    const r = await call(`/mandates/${id}/pause`);
    return `Paused ${id} (${r.type}).`;
  }
  if (cmd === "/revoke") {
    if (!canMutate(chatId)) return denyMutate();
    const r = await call(`/mandates/${id}/revoke`);
    return `Revoked ${id} (${r.type}).`;
  }
  if (cmd === "/status") {
    const res = await fetch(`${API}/mandates/${id}`);
    const data = (await res.json()) as { mandate?: { state?: string }; error?: string };
    if (!res.ok) return `${id} state=unknown`;
    return `${id} state=${data.mandate?.state ?? "unknown"}`;
  }
  return "Unknown command. /help";
}
