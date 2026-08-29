import { DOCS_URL, INTERIM_API, INTERIM_DOCS_ALIAS, engineDemoAllowed } from "@markov/rpc";

/** Public Railway API until api.markovhq.com TLS is attached. */
export const HOSTED_API_URL = INTERIM_API;
/** Canonical docs host. TLS not attached yet — Vercel alias is the live fallback. */
export const HOSTED_DOCS_URL = DOCS_URL;
export const HOSTED_DOCS_FALLBACK = INTERIM_DOCS_ALIAS;

function hostedBuild(): boolean {
  return Boolean(
    process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_URL,
  );
}

export function publicApiUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (hostedBuild()) return HOSTED_API_URL;
  return "http://127.0.0.1:8787";
}

export function publicDocsUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_DOCS_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (hostedBuild()) return HOSTED_DOCS_FALLBACK;
  return "http://127.0.0.1:3001";
}

/** Engine demos are loopback-only. Hosted Float talks to Railway and must not show them. */
export function floatEngineDemo(): boolean {
  if (!engineDemoAllowed()) return false;
  try {
    const host = new URL(publicApiUrl()).hostname;
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
}
