const api = Bun.spawn(["bun", "run", "dev"], {
  cwd: "apps/api",
  stdout: "inherit",
  stderr: "inherit",
});
const dataApi = Bun.spawn(["bun", "run", "dev"], {
  cwd: "apps/data-api",
  stdout: "inherit",
  stderr: "inherit",
});
const indexer = Bun.spawn(["bun", "run", "dev"], {
  cwd: "apps/indexer",
  stdout: "inherit",
  stderr: "inherit",
});
const bot = Bun.spawn(["bun", "run", "start"], {
  cwd: "apps/bot",
  stdout: "inherit",
  stderr: "inherit",
  env: { ...process.env, PORT: process.env.BOT_PORT ?? "8789" },
});

console.log("API      http://127.0.0.1:8787");
console.log("data-api http://127.0.0.1:8788");
console.log("indexer  http://127.0.0.1:8790");
console.log("bot      http://127.0.0.1:8789/health");

const kids = [api, dataApi, indexer, bot];
const stop = () => {
  for (const child of kids) child.kill();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

await Promise.all(kids.map((c) => c.exited));
