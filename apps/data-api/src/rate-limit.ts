export type RateLimit = {
  max: number;
  windowMs: number;
};

export function createRateLimiter(opts: RateLimit) {
  const hits = new Map<string, number[]>();
  return {
    check(ip: string, now: number): { ok: true } | { ok: false; retryAfter: number } {
      const windowStart = now - opts.windowMs;
      const prev = (hits.get(ip) ?? []).filter((t) => t > windowStart);
      if (prev.length >= opts.max) {
        const retryAfter = Math.max(1, Math.ceil((prev[0]! + opts.windowMs - now) / 1000));
        hits.set(ip, prev);
        return { ok: false, retryAfter };
      }
      prev.push(now);
      hits.set(ip, prev);
      return { ok: true };
    },
  };
}

export function clientIp(headers: { get: (name: string) => string | null | undefined } | { header: (name: string) => string | undefined }): string {
  const read = (name: string) => {
    if ("header" in headers && typeof headers.header === "function") return headers.header(name);
    if ("get" in headers && typeof headers.get === "function") return headers.get(name) ?? undefined;
    return undefined;
  };
  const forwarded = read("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = read("x-real-ip")?.trim();
  if (real) return real;
  return "local";
}
