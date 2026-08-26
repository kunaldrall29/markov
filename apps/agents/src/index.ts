const API = process.env.API_URL ?? "http://127.0.0.1:8787";

export async function tick(name: "dca" | "dip" | "yield", mandateId: string, overCap = false) {
  const res = await fetch(`${API}/agents/${name}/tick`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mandateId, overCap }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const port = Number(process.env.PORT ?? 0);

if (import.meta.main) {
  if (port > 0) {
    const name = (process.env.AGENT_NAME as "dca" | "dip" | "yield") ?? "dca";
    Bun.serve({
      port,
      hostname: "0.0.0.0",
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
    console.log("agents health on", port, name);
    const cadence = Number(process.env.CADENCE_MS ?? 0);
    const mandateId = process.env.MANDATE_ADDRESS;
    if (cadence > 0 && mandateId) {
      setInterval(() => {
        tick(name, mandateId).then((out) => console.log(JSON.stringify(out))).catch(console.error);
      }, cadence);
    }
  } else {
    const name = (Bun.argv[2] as "dca" | "dip" | "yield") ?? "dca";
    const mandateId = Bun.argv[3];
    const overCap = Bun.argv.includes("--over-cap");
    if (!mandateId) {
      console.log("usage: bun src/index.ts dca <mandateId> [--over-cap]");
      process.exit(1);
    }
    const out = await tick(name, mandateId, overCap);
    console.log(JSON.stringify(out, null, 2));
  }
}
