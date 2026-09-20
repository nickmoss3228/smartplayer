-- Retention for admin_audit_log — the replacement for Mongo's TTL index.
--
-- Run ONCE per environment, after 0000_init has been applied, as a user with
-- rights to create the extension. On Yandex Managed PostgreSQL, `pg_cron` must
-- first be enabled at the CLUSTER level: add it to the cluster's
-- "Shared preload libraries" setting (SHARED_PRELOAD_LIBRARIES_PG_CRON in
-- Terraform). That setting change RESTARTS the cluster, so do it while
-- provisioning, not during the cutover window.
--
-- Retention is 365 days, matching ADMIN_AUDIT_TTL_DAYS's default in
-- config/env.js. If you change that variable, change the interval below too —
-- they are two copies of one number and nothing enforces that they agree.
--
-- The trade-off the Mongo schema already recorded, restated: with retention on
-- you cannot answer "who deleted this story two years ago". For a
-- single-operator learning app that is fine and keeps the table self-limiting.
-- If the log ever becomes compliance-relevant, drop the job and archive instead.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Idempotent: unschedule first so re-running this file updates the job rather
-- than failing on a duplicate name.
SELECT cron.unschedule('admin-audit-retention')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'admin-audit-retention');

SELECT cron.schedule(
  'admin-audit-retention',
  -- 03:17 UTC. Not on the hour, so it does not contend with every other
  -- cron job in the world for the same minute.
  '17 3 * * *',
  $job$
    DELETE FROM admin_audit_log
    WHERE created_at < now() - interval '365 days'
  $job$
);

-- Verify:
--   SELECT jobid, jobname, schedule, active FROM cron.job;
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
