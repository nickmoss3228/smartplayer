// drizzle-kit configuration.
//
// Lives at the package root because drizzle-kit looks for it there, and is
// excluded from tsconfig.json's `include` for the same reason: drizzle-kit
// loads and bundles this file itself, so `tsc` compiling it into dist/ would
// only produce a stray artefact outside rootDir.
//
// `generate` writes SQL into src/db/migrations. Those files are REVIEWED AND
// COMMITTED, never generated on the fly at deploy time — the whole value of
// having them is that the exact DDL that will run in production is something a
// human read first.

import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    // Only `push`/`studio`/`migrate` need this; `generate` is offline and
    // works from the schema file alone, which is what keeps the schema
    // reviewable without a live database anywhere near it.
    url: process.env.DATABASE_URL ?? "",
  },
  // Verbose diffs and an explicit prompt before anything destructive. This is
  // a database with real users in it; a silent DROP COLUMN is not acceptable.
  verbose: true,
  strict: true,
});
