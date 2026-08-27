import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const FILE = process.env.TELEGRAM_ALLOW_FILE ?? join(import.meta.dir, "../../../data/telegram-allow.json");

function fromEnv(): number[] {
  const raw = process.env.TELEGRAM_ALLOWED_CHAT_IDS?.trim();
  if (!raw) return [];
  return raw
    .split(/[\s,]+/)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n !== 0);
}

function fromFile(): number[] {
  if (!existsSync(FILE)) return [];
  try {
    const parsed = JSON.parse(readFileSync(FILE, "utf8")) as { chatIds?: unknown };
    if (!Array.isArray(parsed.chatIds)) return [];
    return parsed.chatIds.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n !== 0);
  } catch {
    return [];
  }
}

export function allowedChatIds(): number[] {
  const env = fromEnv();
  if (env.length > 0) return env;
  return fromFile();
}

export function rememberChat(chatId: number): void {
  if (fromEnv().length > 0) return;
  if (fromFile().length > 0) return;
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, `${JSON.stringify({ chatIds: [chatId] }, null, 2)}\n`);
}

/**
 * CLI (no chat id) is allowed.
 * Telegram pause/revoke requires TELEGRAM_ALLOWED_CHAT_IDS or data/telegram-allow.json.
 * First-chat auto-lock only if TELEGRAM_ALLOW_FIRST_CHAT=1.
 */
export function canMutate(chatId?: number): boolean {
  if (chatId == null) return true;
  const ids = allowedChatIds();
  if (ids.length === 0) {
    if (process.env.TELEGRAM_ALLOW_FIRST_CHAT === "1") {
      rememberChat(chatId);
      return true;
    }
    return false;
  }
  return ids.includes(chatId);
}
