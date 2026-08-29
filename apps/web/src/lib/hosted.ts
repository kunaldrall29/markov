/** Public Railway API. Used on Vercel when NEXT_PUBLIC_API_URL is unset. */
export const HOSTED_API_URL = "https://api-production-d2e8.up.railway.app";
export const HOSTED_DOCS_URL = "https://markov-docs-black.vercel.app";

export function publicApiUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.VERCEL) return HOSTED_API_URL;
  return "http://127.0.0.1:8787";
}

export function publicDocsUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_DOCS_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.VERCEL) return HOSTED_DOCS_URL;
  return "http://127.0.0.1:3001";
}
