/** Canonical product hosts (Decision 0). markov.fyi is redirect-only. */

export const DOMAIN_CANONICAL = "markovhq.com";
export const FLOAT_HOST = "float.markovhq.com";
export const DOCS_HOST = "docs.markovhq.com";
export const API_HOST = "api.markovhq.com";
export const APP_HOST = "app.markovhq.com";

export const MARKETING_URL = `https://${DOMAIN_CANONICAL}`;
export const FLOAT_URL = `https://${FLOAT_HOST}`;
export const DOCS_URL = `https://${DOCS_HOST}`;
export const RECEIPTS_API_URL = `https://${API_HOST}`;
export const RECEIPTS_PAGE_URL = `${FLOAT_URL}/receipts`;

/** Interim Vercel aliases until docs/api custom TLS is live. Not for user-facing copy. */
export const INTERIM_FLOAT_ALIAS = "https://float-web-three.vercel.app";
export const INTERIM_DOCS_ALIAS = "https://markov-docs-black.vercel.app";
export const INTERIM_DATA_API = "https://data-api-production-5ac5.up.railway.app";
export const INTERIM_API = "https://api-production-d2e8.up.railway.app";

export function isProductOrigin(origin: string | undefined | null): boolean {
  if (!origin) return false;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const extras = [process.env.CORS_ORIGINS, process.env.WEB_ORIGIN, process.env.SITE_ORIGIN]
    .flatMap((raw) => (raw ?? "").split(","))
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (extras.includes(origin.replace(/\/$/, ""))) return true;
  if (url.protocol === "http:" || url.protocol === "https:") {
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;
  }
  if (url.protocol !== "https:") return false;
  if (url.hostname === DOMAIN_CANONICAL || url.hostname.endsWith(`.${DOMAIN_CANONICAL}`)) return true;
  // Interim: hosted Float/docs still on *.vercel.app until docs/api TLS attaches.
  if (url.hostname.endsWith(".vercel.app")) return true;
  return false;
}
