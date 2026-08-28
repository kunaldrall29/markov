export function isAllowedOrigin(origin: string | undefined | null): boolean {
  if (!origin) return false;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const extras = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (extras.includes(origin.replace(/\/$/, ""))) return true;
  const site = process.env.SITE_ORIGIN?.trim().replace(/\/$/, "");
  if (site && origin.replace(/\/$/, "") === site) return true;
  if (
    url.protocol === "https:" &&
    (url.hostname === "markov.fyi" || url.hostname.endsWith(".markov.fyi") || url.hostname.endsWith(".vercel.app"))
  ) {
    return true;
  }
  if (
    (url.protocol === "http:" || url.protocol === "https:") &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1")
  ) {
    return true;
  }
  return false;
}
