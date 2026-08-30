export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export async function fetchJsonWithBackoff(
  url: string,
  opts: {
    fetchImpl?: FetchLike;
    sleep?: (ms: number) => Promise<void>;
    tries?: number;
  } = {},
): Promise<{ ok: boolean; status: number; body: unknown; retried: number }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const tries = opts.tries ?? 5;
  let retried = 0;
  let lastStatus = 0;
  let lastBody: unknown = null;
  for (let i = 0; i < tries; i++) {
    const res = await fetchImpl(url);
    lastStatus = res.status;
    const text = await res.text();
    try {
      lastBody = JSON.parse(text);
    } catch {
      lastBody = text;
    }
    if (res.status !== 429) {
      return { ok: res.ok, status: res.status, body: lastBody, retried };
    }
    retried += 1;
    const raw = res.headers.get("Retry-After");
    const retryAfter = Number(raw);
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 60) * 1000 : 1000 * 2 ** i;
    await sleep(waitMs);
  }
  return { ok: false, status: lastStatus, body: lastBody, retried };
}
