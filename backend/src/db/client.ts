// db/client.ts
//
// The Postgres connection, and nothing else.
//
// ── This module is INERT until something calls db() ─────────────────────────
//
// Importing it opens no socket, reads no config and starts no timer. That is
// deliberate and worth preserving: while the migration is in progress the
// running app is still on Mongoose, and a data layer that connected at import
// time would mean any accidental import — a test, a script, a stray editor
// auto-import — silently opening a second database connection from production.
//
// config/db.js is the Mongo counterpart and does the opposite: server.js awaits
// connectDB() before app.listen, so a DB failure means no server at all rather
// than a server without a database. That is right for the PRIMARY store, and
// the same call will be added for this one at cutover. Until then, lazy.

import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema.js";

// Resolved relative to THIS FILE, not process.cwd(), exactly as config/env.js
// does it — so a script run from the repo root and one run from backend/ both
// find the same file. (config/env.js is plain .js with no types, so this is
// duplicated rather than imported; Phase 3 merges the two once the whole tree
// is compiled together.)
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
dotenv.config({ path: path.join(backendRoot, ".env") });

export type Database = NodePgDatabase<typeof schema>;

/**
 * A handle a repo function can run on: either the pool, or an open transaction.
 *
 * Every repo takes one of these as its last argument, defaulting to `db()`.
 * That default is what lets a controller call a repo directly for a
 * single-statement operation, while a multi-step operation — debit a wallet AND
 * record what it bought — passes the transaction through so the whole thing
 * commits or none of it does.
 *
 * Getting that plumbing right is most of the point of the migration. The Mongo
 * code could not do it at all, and paid for it with hand-written compensation:
 * school.controller.js charges, tries to record the purchase, and manually
 * refunds if it lost the race.
 */
export type Tx = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

let pool: pg.Pool | null = null;
let instance: Database | null = null;

/**
 * Whether a connection string is configured at all.
 *
 * Lets a caller degrade instead of throwing — used by the scripts so they can
 * print a useful message rather than a stack trace, and by any future
 * dual-read code that has to work before the variable is set anywhere.
 */
export function isConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * The connection pool's settings, in one place so the reasoning is visible.
 *
 * `max` is small on purpose. Yandex Managed PostgreSQL's smallest host classes
 * allow a low hundreds of connections total, and this app runs one backend
 * container with a second staging container beside it. Ten per process leaves
 * headroom for psql, the ETL and drizzle-kit without anyone hitting
 * "too many connections" during a migration window — which is the worst
 * possible moment to discover a pool sized by wishful thinking.
 */
function poolConfig(connectionString: string): pg.PoolConfig {
  return {
    connectionString,
    max: Number(process.env.PGPOOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    // Fail a stuck connect rather than hanging a request forever behind it.
    connectionTimeoutMillis: 10_000,
    // Managed PostgreSQL terminates TLS with its own CA. `rejectUnauthorized:
    // false` accepts it without shipping the CA bundle into the image — fine
    // over Yandex's internal network, and the thing to tighten if this ever
    // becomes reachable from outside it. Local development over plain TCP
    // needs no TLS at all, hence the opt-out.
    ssl:
      process.env.PGSSL === "disable"
        ? undefined
        : { rejectUnauthorized: false },
  };
}

/**
 * The Drizzle handle. Connects on first use, reuses the pool afterwards.
 *
 * Throws if DATABASE_URL is unset — loudly, and naming the variable, because
 * the alternative failure is a connection to `postgres://localhost` that
 * either does not exist or, much worse, is somebody's scratch database.
 */
export function db(): Database {
  if (instance) return instance;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. The Postgres data layer cannot start.\n" +
        "  local dev  postgres://smartplayer:smartplayer@localhost:5432/smartplayer_dev\n" +
        "  deployed   set it in backend/.env.production (or .env.staging) on the VM",
    );
  }

  pool = new pg.Pool(poolConfig(connectionString));

  // An idle client erroring out is a pool-level event with no request to
  // attach it to. Unhandled, it takes the whole process down — which on a
  // single-container deployment means an outage caused by one dropped socket.
  pool.on("error", (error) => {
    console.error("[db] idle client error:", error.message);
  });

  instance = drizzle(pool, { schema });
  return instance;
}

/**
 * Close the pool. For scripts and tests; the server holds its pool for life.
 *
 * Idempotent, so a script's finally-block can call it on a path where the pool
 * was never opened.
 */
export async function closeDb(): Promise<void> {
  if (!pool) return;
  const closing = pool;
  pool = null;
  instance = null;
  await closing.end();
}

/**
 * One round trip, to prove credentials and reachability.
 *
 * Returns the server version rather than a bare boolean so a smoke test can
 * show WHICH database answered — the single most useful fact when staging and
 * production differ only by a path segment in the URL, which is exactly the
 * trap the Mongo setup fell into.
 */
export async function ping(): Promise<{ version: string; database: string }> {
  const rows = await db().execute<{ version: string; database: string }>(
    sql`SELECT version() AS version, current_database() AS database`,
  );
  const row = rows.rows[0];
  if (!row) throw new Error("[db] ping returned no rows");
  return row;
}

export { schema };
