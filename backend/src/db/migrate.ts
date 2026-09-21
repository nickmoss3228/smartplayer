// db/migrate.ts
//
// Applies the SQL in db/migrations to whatever DATABASE_URL points at.
//
// Run with `npm run db:migrate`. This is what the deploy will invoke on the VM
// before starting the new container — see the plan's "Deploy pipeline changes".
// It is safe to run repeatedly: Drizzle records what it has applied in its own
// `__drizzle_migrations` table and skips those files.
//
// It does NOT apply anything in migrations/manual — read that directory's
// README. Those are one-per-environment operator tasks (the pg_cron retention
// job), not schema steps, and running them from a deploy would need rights the
// application user should not have.

import { migrate } from "drizzle-orm/node-postgres/migrator";

import { closeDb, db, isConfigured } from "./client.js";

const MIGRATIONS_FOLDER = new URL("./migrations", import.meta.url).pathname.replace(
  // Node hands back "/D:/..." on Windows; the migrator wants a real path.
  /^\/([A-Za-z]:)/,
  "$1",
);

export async function runMigrations(): Promise<void> {
  if (!isConfigured()) {
    throw new Error("DATABASE_URL is not set — refusing to guess at a database to migrate.");
  }

  const started = Date.now();
  await migrate(db(), { migrationsFolder: MIGRATIONS_FOLDER });
  console.log(`[migrate] up to date in ${Date.now() - started}ms`);
}

// Run directly (`node dist/db/migrate.js` / `tsx src/db/migrate.ts`) rather
// than imported. Guarded so importing this from a test does not run it.
const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));

if (invokedDirectly) {
  try {
    await runMigrations();
  } catch (error) {
    console.error("[migrate] FAILED:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}
