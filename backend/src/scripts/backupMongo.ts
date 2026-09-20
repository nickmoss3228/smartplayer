// scripts/backupMongo.ts
//
// Full-fidelity export of every database on the Atlas cluster, before anything
// is migrated or discarded.
//
//   npx tsx src/scripts/backupMongo.ts                      # -> D:/smartplayer-db-backup/<utc timestamp>
//   npx tsx src/scripts/backupMongo.ts --out <dir>
//
// Written in Canonical Extended JSON rather than plain JSON, so ObjectIds,
// Dates, Int32/Int64/Double and binary values come back as exactly the types
// they went in as. Plain JSON.stringify would turn every _id into a string and
// every date into text, which is a copy of the data but not a backup of it.
//
// Raw collections through the driver, never Mongoose models: live documents
// carry fields the schemas do not declare, and a model would drop them.
//
// The output contains password hashes, phone numbers and consent records.
// Keep it out of the repo and out of any bucket with public listing.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { EJSON } from "bson";
import dotenv from "dotenv";
import mongoose from "mongoose";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
dotenv.config({ path: path.join(backendRoot, ".env") });

/** Every database this app has ever used on the cluster. Production is `test`. */
const KNOWN_DATABASES = ["test", "staging", "smartplayer-dev"];

function outDir(): string {
  const i = process.argv.indexOf("--out");
  if (i !== -1 && process.argv[i + 1]) return path.resolve(process.argv[i + 1]!);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.resolve("D:/smartplayer-db-backup", stamp);
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in backend/.env");

  const root = outDir();
  await mkdir(root, { recursive: true });

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 });
  const client = mongoose.connection.getClient();

  // Prefer the cluster's own list, so a database nobody remembered is not
  // silently left out. Fall back to the known names if the user lacks the
  // listDatabases privilege.
  let names: string[];
  try {
    const listed = await client.db("admin").admin().listDatabases();
    names = listed.databases
      .map((d) => d.name)
      .filter((n) => !["admin", "local", "config"].includes(n));
  } catch {
    names = KNOWN_DATABASES;
  }
  for (const known of KNOWN_DATABASES) if (!names.includes(known)) names.push(known);

  const manifest: {
    createdAt: string;
    format: string;
    databases: Record<string, Record<string, { documents: number; indexes: number }>>;
  } = { createdAt: new Date().toISOString(), format: "canonical-ejson-v2", databases: {} };

  let mismatches = 0;

  for (const name of names) {
    const database = client.db(name);
    const collections = (await database.listCollections({}, { nameOnly: true }).toArray())
      .map((c) => c.name)
      .filter((c) => !c.startsWith("system."))
      .sort();

    manifest.databases[name] = {};
    if (collections.length === 0) {
      console.log(`[backup] ${name}: (empty or absent)`);
      continue;
    }

    const dbDir = path.join(root, name);
    await mkdir(dbDir, { recursive: true });

    for (const collection of collections) {
      const coll = database.collection(collection);
      const docs = await coll.find({}).toArray();
      const indexes = await coll.indexes();
      const sourceCount = await coll.countDocuments();

      const file = path.join(dbDir, `${collection}.ejson`);
      await writeFile(file, EJSON.stringify(docs, undefined, 0, { relaxed: false }));
      await writeFile(
        path.join(dbDir, `${collection}.indexes.ejson`),
        EJSON.stringify(indexes, undefined, 2, { relaxed: false }),
      );

      // Verify by reading the file back, not by trusting the array we wrote.
      // A truncated write or an encoding problem shows up here, not on the day
      // somebody needs the backup.
      const readBack = EJSON.parse(await readFile(file, "utf8"), { relaxed: false }) as unknown[];
      const ok = readBack.length === sourceCount;
      if (!ok) mismatches += 1;

      manifest.databases[name]![collection] = { documents: readBack.length, indexes: indexes.length };
      console.log(
        `[backup] ${ok ? "ok  " : "FAIL"} ${name}.${collection}`.padEnd(48) +
          ` source=${sourceCount} file=${readBack.length}`,
      );
    }
  }

  await writeFile(path.join(root, "manifest.json"), JSON.stringify(manifest, null, 2));
  await mongoose.disconnect();

  console.log(`\n[backup] written to ${root}`);
  if (mismatches > 0) {
    console.error(`[backup] ${mismatches} collection(s) did not round-trip. Do NOT rely on this backup.`);
    process.exitCode = 1;
  }
}

await main().catch(async (error) => {
  console.error("[backup] FAILED:", error instanceof Error ? error.message : error);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
