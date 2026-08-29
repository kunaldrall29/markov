#!/usr/bin/env bun
/**
 * C6: hosted API emergency revoke (what the Telegram bot POSTs).
 * Run with Railway bot env so MARKOV_API_SECRET is present without printing it:
 *   railway run -s bot -- bun scripts/hosted-bot-revoke.ts <mandateId>
 */
import { INTERIM_API } from "@markov/rpc";

const API = (process.env.HOSTED_API_URL ?? INTERIM_API).replace(/\/$/, "");
const id = Bun.argv[2]?.trim();
if (!id) {
  console.error("usage: bun scripts/hosted-bot-revoke.ts <mandateId>");
  process.exit(1);
}

const secret = process.env.MARKOV_API_SECRET?.trim();
if (!secret) {
  console.error("MARKOV_API_SECRET unset");
  process.exit(1);
}

const actor = process.env.BOT_ACTOR?.trim() || "bot_emergency";
const res = await fetch(`${API}/mandates/${id}/revoke`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-actor": actor,
    "x-api-key": secret,
  },
  body: "{}",
});
const text = await res.text();
if (!res.ok) {
  console.error(res.status, text.slice(0, 400));
  process.exit(1);
}
const body = JSON.parse(text) as { type?: string; sig?: string; explorerUrl?: string; error?: string };
console.log("revoke", body.type ?? "?", body.sig ?? "", body.explorerUrl ?? "");
if (!body.sig) {
  console.error("hosted revoke returned no chain signature (emergency key missing or engine-only path)");
  process.exit(1);
}
