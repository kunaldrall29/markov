import { SQL } from "bun";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL unset — fail closed. Not applying public_receipts.");
  process.exit(1);
}

const sql = new SQL(url);
const file = join(import.meta.dir, "../migrations/0003_public_receipts.postgres.sql");
await sql.unsafe(readFileSync(file, "utf8"));
console.log("applied", file);
