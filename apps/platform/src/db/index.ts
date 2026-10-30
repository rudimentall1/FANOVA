import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString && process.env.NODE_ENV !== "test") {
  throw new Error("DATABASE_URL is required by the FANOVA platform server.");
}

export const pool = new Pool({
  connectionString: connectionString ?? "postgres://fanova:fanova_dev_only@localhost:54329/fanova",
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

export const db = drizzle(pool, { schema });