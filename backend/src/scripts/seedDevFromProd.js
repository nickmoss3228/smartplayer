// scripts/seedDevFromProd.js
//
// Copies story-authoring data from production into the local scratch database
// so local work has something real to edit. Content only — stories with their
// parts, the durable part_markers, and story_visibility. No users, no
// progress, no feedback.
//
// Direction is enforced, not merely intended:
//   - the SOURCE is SOURCE_DATABASE_URL, opened with every session forced
//     read-only; nothing is ever written to it. Production has no public
//     address, so reach it through an SSH tunnel via the VM, e.g.
//       ssh -N -L 16432:<cluster-host>:6432 deploy@89.169.159.92
//       SOURCE_DATABASE_URL=postgres://smartplayer_prod:…@localhost:16432/smartplayer_prod
//   - the TARGET is DATABASE_URL, and the script refuses to run unless that
//     database name contains "dev". Getting this backwards would overwrite
//     live student content, so it is a hard stop rather than a note.
//
// Idempotent: stories are matched on (difficulty, story_id) and their parts
// replaced; markers and visibility are upserted on their natural keys.
//
// Usage:
//   node --import tsx src/scripts/seedDevFromProd.js --dry-run
//   node --import tsx src/scripts/seedDevFromProd.js

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { closeDb, db, ping, schema, stories } from "../db/index.js";

const dryRun = process.argv.includes("--dry-run");

const sourceUrl = process.env.SOURCE_DATABASE_URL;
if (!sourceUrl) {
  console.error("SOURCE_DATABASE_URL is not set — point it at production (see the header).");
  process.exit(2);
}
if (sourceUrl === process.env.DATABASE_URL) {
  console.error("SOURCE_DATABASE_URL and DATABASE_URL are the same database. Refusing.");
  process.exit(2);
}

const sourcePool = new pg.Pool({
  connectionString: sourceUrl,
  max: 2,
  connectionTimeoutMillis: 15_000,
  // Managed PostgreSQL terminates TLS with its own CA — same trade-off as
  // db/client.ts. SOURCE_PGSSL=disable for a plain local source.
  ssl: process.env.SOURCE_PGSSL === "disable" ? undefined : { rejectUnauthorized: false },
});
// Belt and braces: even a bug below cannot write to production.
sourcePool.on("connect", (client) => {
  client.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
});
const source = drizzle(sourcePool, { schema });

try {
  const { database: target } = await ping();
  if (!target.includes("dev")) {
    console.error(
      `Refusing to run: DATABASE_URL points at "${target}", which is not a dev ` +
        `database. This script writes to DATABASE_URL.`,
    );
    process.exitCode = 2;
  } else {
    const [{ database: sourceName }] = (
      await source.execute(sql`SELECT current_database() AS database`)
    ).rows;
    console.log(`source (read-only): ${sourceName}`);
    console.log(`target             : ${target}${dryRun ? "   (DRY RUN)" : ""}\n`);
    await copy();
    console.log(dryRun ? "\nDry run — nothing written." : "\nDone. Production was only read from.");
  }
} finally {
  await sourcePool.end();
  await closeDb();
}

async function copy() {
  const heads = await stories.list({}, source);
  console.log(`  stories: ${heads.length}${dryRun ? " would be copied" : ""}`);
  for (const head of heads) {
    const aggregate = await stories.loadAggregate(head.id, source);
    if (!aggregate || dryRun) continue;
    const { id, createdAt, updatedAt, parts, ...values } = aggregate;
    await db().transaction(async (tx) => {
      const row = await stories.upsertHead(values, tx);
      await stories.replaceParts(row.id, parts, tx);
    });
  }

  const markerRows = await source.select().from(schema.partMarkers);
  console.log(`  part_markers: ${markerRows.length}${dryRun ? " would be copied" : ""}`);
  if (!dryRun) {
    for (const m of markerRows) {
      await stories.rememberMarkers(m.difficulty, m.storyId, m.partNumber, m.timeMarkers);
    }
  }

  const visibilityRows = await source.select().from(schema.storyVisibility);
  console.log(`  story_visibility: ${visibilityRows.length}${dryRun ? " would be copied" : ""}`);
  if (!dryRun) {
    for (const v of visibilityRows) await stories.setHidden(v.difficulty, v.storyId, v.hidden);
  }
}
