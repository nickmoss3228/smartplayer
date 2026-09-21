# The PostgreSQL data layer

**Status: the backend runs on this.** Since 2026-09-14 every controller,
helper, middleware, job and payment service reads and writes PostgreSQL through
this directory; `server.js` refuses to start without `DATABASE_URL`.

MongoDB is still used by the one-off scripts only — the backup
(`scripts/backupMongo.ts`), the content ETL, and a few older maintenance
scripts that still import `src/models/*.js`. Nothing on a request path touches
it. This is verified locally against Postgres; it has not been deployed.

Most controllers load users through `userDoc.ts`, which presents a row in the
old nested Mongoose shape (`user.wallet.bitAward`, `user._id`, `user.save()`)
so the port did not have to rewrite their logic or change any API response.
Money and race-sensitive paths do not use it: they go through the repos with
transactions and row locks.

---

## What is here

| Path | What |
|---|---|
| `schema.ts` | Every table. The source of truth — `drizzle-kit generate` derives the SQL from it. |
| `client.ts` | The pool. Lazy: importing it opens no socket. |
| `ids.ts` | uuid minting (`newId`) and stable derived uuids (`derivedId`). |
| `migrate.ts` | Applies `migrations/*.sql`. |
| `migrations/` | Generated, reviewed, committed SQL. |
| `migrations/manual/` | The pg_cron retention job — applied by hand, once per environment. |
| `repos/` | The only thing controllers should import. |
| `index.ts` | The front door. |

Also outside this directory:

- `src/scripts/migrateToPostgres.ts` — the Mongo → Postgres ETL. Story content
  only by default; `--all` adds accounts, progress, payments, audit, feedback.
- `src/scripts/backupMongo.ts` — full export of every database on the Atlas
  cluster in Canonical Extended JSON, verified by reading each file back. The
  pre-migration backup taken with it lives at
  `D:\smartplayer-db-backup\2026-09-13T13-39-09-391Z\` — outside the repo on
  purpose: it holds password hashes, phone numbers and consent records.
- `src/config/sessions.d.ts`, `src/config/schoolCatalog.d.ts` — type bridges,
  so this TypeScript can use the plain-JS config without copying constants out
  of it. The config files stay `.js` because the frontend's Vitest suite
  imports them directly by path.

## Commands

```bash
npm run typecheck            # tsc --noEmit
npm run test:db              # the TS unit tests in this directory
npm run build                # emit to dist/ (nothing consumes it yet)

npm run db:generate          # schema.ts -> a new migrations/*.sql  (offline)
npm run db:migrate           # apply migrations to DATABASE_URL
npm run db:studio            # browse the database

npm run etl                  # DRY RUN, story content only
npm run etl:commit           # write story content
npm run etl:verify           # compare Mongo and Postgres, write nothing
npm run etl -- --all         # (any of the above) also accounts, payments, progress...

npx tsx src/scripts/backupMongo.ts   # export every Mongo database to D:\smartplayer-db-backup
```

The ETL is **dry-run by default**, unlike the other scripts in `src/scripts/`,
which take `--dry-run` as an opt-in. It is the most consequential script in the
repo and the cost of inverting the default is one word.

## Running it locally

Verified working on this machine — Docker 29.7.2, Postgres 16.15.

```bash
docker run -d --name smartplayer-postgres  \
  -e POSTGRES_USER=smartplayer -e POSTGRES_PASSWORD=smartplayer  \
  -e POSTGRES_DB=smartplayer_dev -p 127.0.0.1:5432:5432  \
  -v smartplayer_postgres_data:/var/lib/postgresql/data postgres:16-alpine

export DATABASE_URL=postgres://smartplayer:smartplayer@localhost:5432/smartplayer_dev
export PGSSL=disable

npm run db:migrate
npm run test:integration
npm run etl                 # dry run against your dev Mongo
```

`docker compose --profile localdb up -d postgres` describes the same container,
but plain `docker compose` cannot be run on a dev machine at all right now:
the `backend` service declares `env_file: ./backend/.env.production`, which
only exists on the VM, and compose refuses to parse the file without it. That
is a pre-existing papercut, not something the `localdb` profile introduced, and
it is deliberately not "fixed" by marking that env_file optional — a production
backend silently starting with no configuration is far worse than a local
inconvenience. Use the `docker run` above, or create an empty local
`backend/.env.production` (it is gitignored).

### Resetting the database

`DROP SCHEMA public CASCADE` is **not** enough. Drizzle keeps its journal in a
separate `drizzle` schema, so dropping only `public` leaves the migrator
believing everything is applied and it will happily report "up to date" against
an empty database. Drop both:

```bash
docker exec smartplayer-postgres psql -U smartplayer -d smartplayer_dev  \
  -c "DROP SCHEMA IF EXISTS public CASCADE;
      DROP SCHEMA IF EXISTS drizzle CASCADE;
      CREATE SCHEMA public;"
```

## What has actually been exercised

Against real Postgres, with the real dev Mongo database (21 users, 16 stories,
4 payments):

- The migration applies: 18 tables, 23 CHECK constraints, 13 foreign keys,
  45 indexes. The partial unique index on `payment.provider_payment_id` and all
  four composite primary keys are present and correct in the live catalog.
- `npm run test:integration` — 22 tests, covering the concurrency properties
  that the Mongo conditional-write idioms used to provide: exactly one of two
  simultaneous wallet debits wins, a 20-way stampede leaves the balance at zero
  and never negative, one of two concurrent webhook latches wins, a dated
  entitlement extends rather than stacking, two racing vocab submissions pay
  for each word exactly once, and a failed re-attempt never erases a pass.
- `npm run etl:commit` run three times in a row: identical row counts each
  time, all 14 verification checks green, no duplicates. Wallet sums and the
  settled-payment total matched Mongo exactly.
- The `levelResults` Map path was exercised separately against a throwaway
  Mongo, because the dev database has **zero** non-empty `levelResults` — all
  52 progress documents are empty. Hyphenated slugs, a multi-digit part number
  and a `completed: false` row all survived; two deliberately malformed keys
  were refused loudly rather than silently filed under part 0.
- **Re-verified on the uuid schema (2026-09-13)**, after the switch from
  `char(24)`, the removal of `legacy_room` and the addition of `fake_payment`:
  migration applies with 19 tables / 27 uuid columns / 0 char columns / 26
  CHECKs / 13 FKs; `npm run test:integration` 22/22; `npm run test:db` 18/18;
  content-only ETL from `smartplayer-dev` wrote 16 stories, 83 parts, 470
  markers, 527 vocab entries and 185 quiz questions with all 7 verification
  checks exact, and a second `--commit` run changed nothing. Spot check: `leo`
  kept its original hex in `legacy_mongo_id`, all 10 parts and 168 markers, and
  contiguous marker ordinals in every part.
- The bullets above about `levelResults`, wallet sums and `legacy_room` describe
  the earlier full-migration runs on the `char(24)` schema. That path now sits
  behind `--all` and has not been re-run since the uuid switch.

**Still unexercised**: production-scale data, the pg_cron retention job
(`pg_cron` is not in the `postgres:16-alpine` image — it needs the managed
cluster or a `postgres:16` image with the extension), and the ETL against a
database that has real `levelResults` at volume.

## Design decisions worth knowing before you change anything

**Ids are uuids, minted in application code.** App-side rather than a column
default because a payment's id is sent to the acquirer as the idempotence key
before the row exists. An earlier version kept `char(24)` Mongo hex to keep live
tokens and payment references valid; the app had not launched and everyone
re-registers, so that constraint was dropped. Migrated story ids are derived
deterministically from their Mongo `_id` (so re-running the ETL is idempotent),
and the original hex is kept in `story.legacy_mongo_id`.

**`part_markers` and `story_visibility` have no foreign key to `story`, on
purpose.** They are keyed by `(difficulty, story_id)` so they can outlive a
deleted story and can describe the built-in stories, which live in the frontend
bundle and have no row here at all. Adding `REFERENCES story(...) ON DELETE
CASCADE` destroys exactly the property they exist for.

**Every repo function takes a `Tx` as its last argument.** That is how a
multi-step operation becomes one transaction. Most of the value of this
migration is in that parameter.

**`fake_payment` has no foreign key to `payment`, on purpose.** It is the fake
acquirer's own records (see `models/FakePayment.js`); the boundary between it
and our ledger is the thing being tested, so it knows our order id only as an
opaque string, exactly as a real acquirer would.

## What is deliberately NOT done

- Controllers are untouched. Porting them off `src/models/*.js` is the next
  large piece of work and it is separate from this one.
- `Progress` and `story_progress` still duplicate each other. Collapsing them
  is worth doing *after* the storage swap is proven, not during it.
- The compensation paths that exist only because Mongo had no transactions —
  the manual refund in `school.controller.js`, the second repair sweep in
  `jobs/reconcilePayments.js` — are still there. Deleting them is a separate,
  reviewable change once settlement runs in one transaction.
- No `postgres_exporter` yet. There is no database observability today at all,
  so this is net-new work rather than a replacement.

## Cutover checklist

1. Provision Yandex Managed PostgreSQL (`ru-central1`), enable `pg_cron` in the
   cluster's shared preload libraries — **that setting restarts the cluster**,
   so do it while provisioning, not in the window.
2. `npm run db:migrate`, then apply `migrations/manual/001_audit_retention.sql`.
3. `npm run etl` (dry run), read the counts, then `npm run etl:commit`, then
   `npm run etl:verify`. The wallet and payment sums must match exactly.
4. Port controllers onto the repos.
5. Add `DATABASE_URL` to `config/env.js`'s `REQUIRED`, add a connection check to
   `server.js`, and add `npm run db:migrate` to the deploy.

Steps 1–3 are reversible. Step 4 is the one to review carefully. Step 5 is the
point of no return — keep Atlas running behind it for at least two weeks.
