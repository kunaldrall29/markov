const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8787";

function errorMessage(text: string): string {
  try {
    const parsed = JSON.parse(text) as { error?: unknown };
    if (typeof parsed.error === "string" && parsed.error) return parsed.error;
  } catch {
    /* raw text */
  }
  return text;
}

export async function api<T>(path: string, init?: RequestInit, actor = "owner_demo"): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "x-actor": actor,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(errorMessage(await res.text()));
  return res.json() as Promise<T>;
}

export function formatAmount(amount: number, decimals = 6): string {
  const whole = Math.floor(Math.abs(amount) / 10 ** decimals);
  const frac = String(Math.abs(amount) % 10 ** decimals).padStart(decimals, "0").replace(/0+$/, "");
  const body = frac ? `${whole}.${frac}` : String(whole);
  return amount < 0 ? `-${body}` : body;
}
