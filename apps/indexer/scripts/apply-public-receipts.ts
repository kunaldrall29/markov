import { applyPostgresSchema, postgresUrl } from "../src/pg";

const url = postgresUrl();
if (!url) {
  console.error("DATABASE_URL unset — fail closed. Not applying public_receipts.");
  process.exit(1);
}

await applyPostgresSchema(url);
console.log("applied postgres_boot.sql");
