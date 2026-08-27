import { listenHost } from "@markov/rpc";

const API = process.env.API_URL ?? "http://127.0.0.1:8787";

function apiHeaders(): Record<string, string> {
  const secret = process.env.MARKOV_API_SECRET?.trim();
  return {
    "content-type": "application/json",
    ...(secret ? { "x-api-key": secret } : {}),
  };
}

export type AgentName = "steady" | "momentum" | "redteam" | "dca" | "dip" | "yield";

export function canonicalAgent(name: string): "steady" | "momentum" | "redteam" {
  if (name === "steady" || name === "yield") return "steady";
  if (name === "redteam") return "redteam";
  return "momentum";
}

export async function tick(name: AgentName, mandateId: string, overCap = false) {
  const res = await fetch(`${API}/agents/${canonicalAgent(name)}/tick`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify({ mandateId, overCap }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const port = Number(process.env.PORT ?? 0);

if (import.meta.main) {
  if (port > 0) {
    const name = canonicalAgent((process.env.AGENT_NAME as AgentName) ?? "momentum");
    const hostname = listenHost();
    Bun.serve({
      port,
      hostname,
      fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === "/health" || url.pathname === "/") {
          return Response.json({
            service: "agents",
            agent: name,
            mandate: process.env.MANDATE_ADDRESS ?? "",
          });
        }
        return new Response("not found", { status: 404 });
      },
    });
    console.log("agents health on", hostname, port, name);
    const cadence = Number(process.env.CADENCE_MS ?? 0);
    const mandateId = process.env.MANDATE_ADDRESS;
    if (cadence > 0 && mandateId) {
      setInterval(() => {
        tick(name, mandateId).then((out) => console.log(JSON.stringify(out))).catch(console.error);
      }, cadence);
    }
  } else {
    const name = canonicalAgent((Bun.argv[2] as AgentName) ?? "momentum");
    const mandateId = Bun.argv[3];
    const overCap = Bun.argv.includes("--over-cap");
    if (!mandateId) {
      console.log("usage: bun src/index.ts momentum <mandateId> [--over-cap]");
      process.exit(1);
    }
    const out = await tick(name, mandateId, overCap);
    console.log(JSON.stringify(out, null, 2));
  }
}
