#!/bin/sh
# postgres/init/01-create-databases.sh
#
# Runs ONCE, when the `db` container starts on an EMPTY data volume
# (docker-entrypoint-initdb.d). It never runs again against existing data, so
# changing a password later is `ALTER ROLE`, not an edit here.
#
# Production and staging share this one Postgres server but get their own
# database AND their own login role. CONNECT is revoked from PUBLIC on both, so
# the staging role cannot open production's database even with a copy-pasted
# URL — it fails loudly instead of quietly writing test data into prod.
#
# Passwords come from ~/smartplayer/postgres/.env on the VM (never in git).

set -eu
: "${PG_PROD_PASSWORD:?PG_PROD_PASSWORD is not set}"
: "${PG_STAGING_PASSWORD:?PG_STAGING_PASSWORD is not set}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  -v prod_pw="$PG_PROD_PASSWORD" \
  -v staging_pw="$PG_STAGING_PASSWORD" <<'SQL'
CREATE ROLE smartplayer_prod LOGIN PASSWORD :'prod_pw';
CREATE ROLE smartplayer_staging LOGIN PASSWORD :'staging_pw';

CREATE DATABASE smartplayer_prod OWNER smartplayer_prod;
CREATE DATABASE smartplayer_staging OWNER smartplayer_staging;

REVOKE ALL ON DATABASE smartplayer_prod FROM PUBLIC;
REVOKE ALL ON DATABASE smartplayer_staging FROM PUBLIC;
SQL
