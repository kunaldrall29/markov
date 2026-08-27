import { isLoopbackHost } from "@markov/rpc";

type HeaderSource = {
  header?: (name: string) => string | undefined;
  get?: (name: string) => string | null;
};

function header(c: HeaderSource, name: string): string | undefined {
  return c.header?.(name) ?? c.get?.(name) ?? undefined;
}

/** True when a reverse proxy is in front of us. Bind address is not a client identity. */
export function behindProxy(c: HeaderSource): boolean {
  return Boolean(header(c, "x-forwarded-for") || header(c, "x-real-ip") || header(c, "forwarded"));
}

/**
 * Mutations: shared secret if set; otherwise loopback-only and never when proxied.
 * Phase 0 has no wallet auth. Do not infer trust from HOST=127.0.0.1 behind nginx.
 */
export function mutationAllowed(c: HeaderSource): boolean {
  const secret = process.env.MARKOV_API_SECRET?.trim();
  if (secret) return header(c, "x-api-key") === secret;
  if (behindProxy(c)) return false;
  return isLoopbackHost();
}

export function apiKeyHeaders(): Record<string, string> {
  const secret = process.env.MARKOV_API_SECRET?.trim();
  return secret ? { "x-api-key": secret } : {};
}
