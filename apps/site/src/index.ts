import { handleSiteRequest } from "./handle";

const port = Number(process.env.PORT ?? 3001);

export default {
  port,
  hostname: "0.0.0.0",
  fetch: handleSiteRequest,
};

if (import.meta.main) {
  console.log(`markov docs on :${port}`);
}
