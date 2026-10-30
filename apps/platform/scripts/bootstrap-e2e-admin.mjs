import { randomUUID } from "node:crypto";
import pg from "pg";

const { Pool } = pg;
const email = process.env.ADMIN_EMAIL;
const connectionString = process.env.DATABASE_URL;

if (!email || !connectionString) {
  throw new Error("ADMIN_EMAIL and DATABASE_URL are required.");
}

const pool = new Pool({ connectionString });

try {
  const account = await pool.query(
    'SELECT id FROM "user" WHERE email = $1 AND "emailVerified" = true LIMIT 1',
    [email]
  );
  if (account.rowCount !== 1) {
    throw new Error("A registered, email-verified administrator account was not found.");
  }

  const userId = account.rows[0].id;
  await pool.query(
    "INSERT INTO user_role (id, user_id, role, assigned_by) VALUES ($1, $2, 'admin', $2) ON CONFLICT (user_id, role) DO NOTHING",
    [randomUUID(), userId]
  );

  const check = await pool.query(
    "SELECT role FROM user_role WHERE user_id = $1 AND role = 'admin'",
    [userId]
  );
  if (check.rowCount !== 1) throw new Error("Administrator role bootstrap did not persist.");
  process.stdout.write("E2E administrator role provisioned.\n");
} finally {
  await pool.end();
}