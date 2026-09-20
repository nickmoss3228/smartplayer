# Manual migrations

SQL that `drizzle-kit generate` cannot produce, because it describes things
that are not table structure. These are applied **by hand, once per
environment**, and are not tracked in Drizzle's `__drizzle_migrations` table.

Keep that list short. Anything that *can* be expressed in `schema.ts` belongs
there instead, where the diff is generated and reviewed rather than remembered.

| File | What | When |
|---|---|---|
| `001_audit_retention.sql` | pg_cron job replacing the Mongo TTL index on `admin_audit_log` | after the first `0000_init` apply, per environment — **managed PostgreSQL only** |

**Where the app runs today (self-hosted `db` container on the VM), this file is
NOT used**: the stock `postgres` image has no pg_cron, so the same `DELETE` runs
nightly from `postgres/backup.sh` (repo root), alongside the backups. Apply this
file again only after moving to Yandex Managed PostgreSQL, where pg_cron must be
enabled in exactly one database (use `cron.schedule_in_database` for the
others).

## Why the audit retention is here

Mongo expired audit rows with a TTL index (`expireAfterSeconds`, 365 days by
default). Postgres has no equivalent, so the retention becomes a scheduled
`DELETE`.

That is a real downgrade in reliability and worth being clear-eyed about: a TTL
index cannot stop running, and a cron job can. If `admin_audit_log` ever looks
larger than a year's worth of activity, check `cron.job_run_details` before
assuming the app is writing too much.
