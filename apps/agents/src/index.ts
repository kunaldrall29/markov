const API = process.env.API_URL ?? "http://127.0.0.1:8787";

async function tick(name: "dca" | "dip", mandateId: string, overCap = false) {
  const res = await fetch(`${API}/agents/${name}/tick`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mandateId, overCap }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

if (import.meta.main) {
  const name = (Bun.argv[2] as "dca" | "dip") ?? "dca";
  const mandateId = Bun.argv[3];
  const overCap = Bun.argv.includes("--over-cap");
  if (!mandateId) {
    console.log("usage: bun src/index.ts dca <mandateId> [--over-cap]");
    process.exit(1);
  }
  const out = await tick(name, mandateId, overCap);
  console.log(JSON.stringify(out, null, 2));
}
