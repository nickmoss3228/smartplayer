// scripts/migratePhoneAuth.js
//
// Check for the switch from email-identified accounts to phone-verified ones.
//
// On MongoDB this was a real migration. `email` had been `required, unique`
// with a unique but NOT sparse index, so once the field became optional the
// second account without an email died with `E11000 dup key: { email: null }`.
// The fix was to drop and rebuild the index as sparse, unset explicit nulls,
// and clear the dead isEmailVerified / emailVerificationToken fields.
//
// On PostgreSQL none of that can happen, which is why this is now a read-only
// check rather than a migration:
//   - a unique index treats NULLs as distinct, so any number of accounts can
//     have no email or no phone — the "sparse" behaviour is the default;
//   - there are no legacy email-verification columns in the schema at all, so
//     there is nothing to clear.
//
// What it still verifies is the part that matters: that the three identity
// indexes exist and are unique in THIS database, and that no two accounts
// share an email or a phone number (which would mean an index was dropped by
// hand at some point). Exits 1 if anything is wrong.
//
// Usage:
//   node --import tsx src/scripts/migratePhoneAuth.js

import { sql } from "drizzle-orm";

import { closeDb, db, ping } from "../db/index.js";

const EXPECTED = ["users_username_key", "users_email_key", "users_phone_number_key"];

try {
  const { database } = await ping();
  console.log(`Connected to "${database}"  (read-only check)\n`);
  let problems = 0;

  const { rows: indexes } = await db().execute(sql`
    SELECT i.relname AS name, ix.indisunique AS unique
    FROM pg_index ix
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_class t ON t.oid = ix.indrelid
    WHERE t.relname = 'users'
  `);
  const byName = new Map(indexes.map((row) => [row.name, row]));

  for (const name of EXPECTED) {
    const index = byName.get(name);
    if (!index) {
      problems++;
      console.log(`${name}: MISSING — run \`npm run db:migrate\``);
    } else if (!index.unique) {
      problems++;
      console.log(`${name}: present but NOT unique`);
    } else {
      console.log(`${name}: unique — ok`);
    }
  }

  for (const column of ["email", "phone_number"]) {
    const { rows } = await db().execute(sql`
      SELECT ${sql.identifier(column)} AS value, count(*)::int AS n
      FROM users
      WHERE ${sql.identifier(column)} IS NOT NULL
      GROUP BY 1
      HAVING count(*) > 1
    `);
    if (rows.length) {
      problems++;
      console.log(`${column}: ${rows.length} value(s) shared by more than one account`);
    } else {
      console.log(`${column}: no duplicates — ok`);
    }
  }

  const { rows: [counts] } = await db().execute(sql`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE email IS NULL)::int AS without_email,
           count(*) FILTER (WHERE phone_number IS NULL)::int AS without_phone
    FROM users
  `);
  console.log(
    `\naccounts: ${counts.total}  (without email: ${counts.without_email}, without phone: ${counts.without_phone})`,
  );

  console.log(problems ? `\n${problems} problem(s) found.` : "\nAll good — nothing to migrate on PostgreSQL.");
  if (problems) process.exitCode = 1;
} finally {
  await closeDb();
}
