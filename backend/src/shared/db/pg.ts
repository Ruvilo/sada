import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("Missing env var DATABASE_URL");
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
});
