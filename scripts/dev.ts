const api = Bun.spawn(["bun", "run", "dev"], {
  cwd: "apps/api",
  stdout: "inherit",
  stderr: "inherit",
});
const web = Bun.spawn(["bun", "run", "dev"], {
  cwd: "apps/web",
  stdout: "inherit",
  stderr: "inherit",
});

console.log("Float web  http://127.0.0.1:3000");
console.log("Markov API http://127.0.0.1:8787");

const stop = () => {
  api.kill();
  web.kill();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

await Promise.all([api.exited, web.exited]);
