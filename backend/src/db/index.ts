// db/index.ts
//
// The data layer's front door. Controllers import from HERE, never from
// db/schema.js or a driver — that indirection is what made this migration a
// contained change rather than a rewrite, and it is worth keeping afterwards.
//
// ── Status: the application runs on this ───────────────────────────────────
//
// server.js connects through config/db.js -> ping() here, and every request
// path reads and writes through these exports. What remains on MongoDB is the
// one-off scripts (the backup, the content ETL, some older maintenance
// scripts) — see db/README.md.
//
// To bring up an environment:
//   1. provision the database and set DATABASE_URL
//   2. `npm run db:migrate`
//   3. `npm run etl:commit` then `npm run etl:verify` to copy story content
//   4. start the server

export { closeDb, db, isConfigured, ping } from "./client.js";
export type { Database, Tx } from "./client.js";

export { assertId, isId, newId } from "./ids.js";

export { runMigrations } from "./migrate.js";

export * as schema from "./schema.js";
export type {
  AdminAuditLog,
  Difficulty,
  FakePayment,
  Feedback,
  Payment,
  PaymentItem,
  Progress,
  ProgressLevelResult,
  Story,
  StoryPart,
  StoryProgress,
  User,
  UserEntitlement,
  UserSession,
} from "./schema.js";

// Namespaced rather than flattened: `users.findById` and `payments.findById`
// both exist and mean different things, and a flat barrel would force one of
// them to be renamed into something worse.
export * as userDocs from "./userDoc.js";
export type { UserDoc } from "./userDoc.js";

export * as audit from "./repos/audit.repo.js";
export * as fakePayments from "./repos/fakePayments.repo.js";
export * as entitlements from "./repos/entitlements.repo.js";
export * as payments from "./repos/payments.repo.js";
export * as progress from "./repos/progress.repo.js";
export * as sessions from "./repos/sessions.repo.js";
export * as stories from "./repos/stories.repo.js";
export * as users from "./repos/users.repo.js";
export * as wallet from "./repos/wallet.repo.js";
