// scripts/migratePhoneAuth.js
//
// One-off migration for the switch from email-identified accounts to
// phone-verified ones (models/User.js).
//
// It exists because of one thing Mongoose cannot do for you. `email` used to be
// `required: true, unique: true` and its index was built accordingly — unique,
// NOT sparse. Making the field optional in the schema does not touch that index:
// autoIndex issues createIndex with the new options, Mongo answers
// IndexOptionsConflict for an existing index of the same name, and Mongoose
// swallows it. The old index survives, and because a missing field indexes as
// null under a non-sparse unique index, the SECOND account created without an
// email dies with `E11000 dup key: { email: null }` — surfacing to the user as
// a generic 500 on signup, with nothing in the schema to explain it.
//
// Dropping and recreating is the only route: Mongo has no "alter index".
//
// Safe to re-run. Every step checks the current state first and skips if the
// world already looks the way it should, so a partially-applied run finishes
// cleanly rather than erroring on the parts that already succeeded.
//
// Usage:
//   node src/scripts/migratePhoneAuth.js --dry-run
//   node src/scripts/migratePhoneAuth.js

import mongoose from "mongoose";
import { config } from "../config/env.js";

const dryRun = process.argv.includes("--dry-run");

await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 15000 });
console.log(`Connected to "${mongoose.connection.name}"${dryRun ? "  (DRY RUN)" : ""}\n`);

const users = mongoose.connection.db.collection("users");
const indexes = await users.indexes();
const byName = new Map(indexes.map((index) => [index.name, index]));

// ── 1. email_1: unique, and sparse so absent emails stop colliding ──────────
const email = byName.get("email_1");
if (!email) {
  console.log("email_1: missing entirely — creating it as unique + sparse");
  if (!dryRun) await users.createIndex({ email: 1 }, { unique: true, sparse: true });
} else if (email.unique && email.sparse) {
  console.log("email_1: already unique + sparse — nothing to do");
} else {
  // Guard the window between drop and recreate. If duplicates exist the
  // recreate fails and the collection is left with NO unique index on email,
  // which is worse than what we started with — so refuse before touching it.
  const duplicates = await users
    .aggregate([
      { $match: { email: { $type: "string" } } },
      { $group: { _id: "$email", n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } },
    ])
    .toArray();

  if (duplicates.length) {
    console.error(
      `email_1: ABORTED — ${duplicates.length} duplicate email(s) would make the\n` +
        "unique index un-rebuildable. Resolve these by hand first:\n" +
        duplicates.map((d) => `  ${d._id} (${d.n} accounts)`).join("\n")
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(
    `email_1: unique=${!!email.unique} sparse=${!!email.sparse} — rebuilding as unique + sparse`
  );
  if (!dryRun) {
    await users.dropIndex("email_1");
    await users.createIndex({ email: 1 }, { unique: true, sparse: true });
  }
}

// ── 2. phoneNumber_1: unique + sparse ──────────────────────────────────────
// Sparse for the same reason as above, and doubly so during rollout: every
// pre-existing account has no phone yet.
const phone = byName.get("phoneNumber_1");
if (phone?.unique && phone?.sparse) {
  console.log("phoneNumber_1: already unique + sparse — nothing to do");
} else if (phone) {
  console.log("phoneNumber_1: wrong options — rebuilding as unique + sparse");
  if (!dryRun) {
    await users.dropIndex("phoneNumber_1");
    await users.createIndex({ phoneNumber: 1 }, { unique: true, sparse: true });
  }
} else {
  console.log("phoneNumber_1: creating as unique + sparse");
  if (!dryRun) await users.createIndex({ phoneNumber: 1 }, { unique: true, sparse: true });
}

// ── 3. Normalise stored emails that are explicitly null ────────────────────
// A sparse index still indexes an explicit null — it only skips a MISSING
// field. Any document literally holding `email: null` therefore keeps
// colliding after step 1, so unset those. Documents that never had the field
// are already fine and are not matched here.
//
// $type: 10 is "BSON null", and the precision matters: the shorthand
// `{ email: null }` ALSO matches documents with no email field at all, so it
// would report work on every already-clean account and make a second run look
// like it still had something to do.
const nulls = await users.countDocuments({ email: { $type: 10 } });
if (nulls) {
  console.log(`email: unsetting ${nulls} explicit null value(s) so the sparse index skips them`);
  if (!dryRun) await users.updateMany({ email: { $type: 10 } }, { $unset: { email: "" } });
} else {
  console.log("email: no explicit nulls — nothing to do");
}

// ── 4. Retire the dead email-verification fields ───────────────────────────
// Replaced by the phoneVerification* family. Harmless if left, but they make
// the next person reading a user document wonder which system is live.
const stale = await users.countDocuments({
  $or: [
    { isEmailVerified: { $exists: true } },
    { emailVerificationToken: { $exists: true } },
    { emailVerificationExpires: { $exists: true } },
  ],
});
if (stale) {
  console.log(`legacy email-verification fields: clearing on ${stale} account(s)`);
  if (!dryRun) {
    await users.updateMany(
      {},
      {
        $unset: {
          isEmailVerified: "",
          emailVerificationToken: "",
          emailVerificationExpires: "",
        },
      }
    );
  }
} else {
  console.log("legacy email-verification fields: none present — nothing to do");
}

console.log("\nFinal indexes:");
for (const index of await users.indexes()) {
  const flags = [index.unique && "unique", index.sparse && "sparse"].filter(Boolean).join(", ");
  console.log(`  ${index.name}${flags ? `  (${flags})` : ""}`);
}

await mongoose.disconnect();
console.log(dryRun ? "\nDRY RUN — nothing was written." : "\nDone.");
