// scripts/seedDevFromProd.js
//
// Copies story-authoring data from production into the local scratch database
// so local work has something real to edit. Content only — stories, their
// markers, and their visibility flags. No users, no progress, no feedback.
//
// Direction is enforced, not merely intended:
//   - the SOURCE is the commented "# MONGODB_URI=" PROD line in backend/.env
//     and is opened read-only; nothing is ever written to it.
//   - the TARGET is the active MONGODB_URI, and the script refuses to run
//     unless that database name contains "dev". Getting this backwards would
//     overwrite live student content, so it is a hard stop rather than a note.
//
// Idempotent: documents are matched on (difficulty, storyId) and replaced.
//
// Usage:
//   node src/scripts/seedDevFromProd.js --dry-run
//   node src/scripts/seedDevFromProd.js

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { config } from "../config/env.js";

const dryRun = process.argv.includes("--dry-run");
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const prodUri = fs
  .readFileSync(path.join(backendRoot, ".env"), "utf8")
  .split(/\r?\n/)
  .map((l) => l.trim())
  .find((l) => l.startsWith("# MONGODB_URI="))
  ?.slice("# MONGODB_URI=".length)
  .trim();

if (!prodUri) {
  console.error('No commented "# MONGODB_URI=" line in backend/.env to read production from.');
  process.exit(2);
}

// Parsed with a regex, not new URL(): this is a multi-host SEED LIST
// (host1,host2,host3), which URL() rejects — and its error message echoes the
// whole connection string, credentials included, into the log.
const targetDbName = /@[^/]+\/([^?]*)/.exec(config.mongoUri)?.[1] ?? "";
if (!targetDbName.includes("dev")) {
  console.error(
    `Refusing to run: the active MONGODB_URI points at "${targetDbName || "(default)"}", ` +
      `which is not a dev database. This script writes to the ACTIVE uri.`,
  );
  process.exit(2);
}

const COLLECTIONS = ["stories", "partmarkers", "storyvisibilities"];

const prod = await mongoose.createConnection(prodUri, { serverSelectionTimeoutMS: 15000 }).asPromise();
const dev = await mongoose.createConnection(config.mongoUri, { serverSelectionTimeoutMS: 15000 }).asPromise();
console.log(`source (read-only): ${prod.name}`);
console.log(`target             : ${dev.name}${dryRun ? "   (DRY RUN)" : ""}\n`);

for (const name of COLLECTIONS) {
  const docs = await prod.db.collection(name).find({}).toArray();
  console.log(`  ${name}: ${docs.length} document(s)${dryRun ? " would be copied" : ""}`);
  if (dryRun || !docs.length) continue;
  const target = dev.db.collection(name);
  for (const doc of docs) {
    await target.replaceOne({ _id: doc._id }, doc, { upsert: true });
  }
}

console.log(dryRun ? "\nDry run — nothing written." : "\nDone. Production was only read from.");
await prod.close();
await dev.close();
