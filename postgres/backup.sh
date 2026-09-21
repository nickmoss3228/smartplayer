#!/usr/bin/env bash
# postgres/backup.sh — nightly maintenance for the self-hosted `db` container.
#
# Installed on the VM at ~/smartplayer/postgres/backup.sh and run by the deploy
# user's crontab:
#
#   17 3 * * * /home/deploy/smartplayer/postgres/backup.sh >> /home/deploy/smartplayer/postgres/backup.log 2>&1
#
# For each database it:
#   1. deletes admin_audit_log rows older than 365 days — the job Mongo's TTL
#      index did, and pg_cron did on the managed cluster (the stock postgres
#      image has no pg_cron). Keep the interval in step with
#      ADMIN_AUDIT_TTL_DAYS in config/env.js;
#   2. takes a pg_dump (custom format — restore with pg_restore) and keeps the
#      last 7 on the VM's disk;
#   3. ENCRYPTS it and uploads it to the bucket smartplayer-pg-backups, which
#      expires objects after 30 days on its own.
#
# ── Why the upload is encrypted ────────────────────────────────────────────
#
# The dumps hold phone numbers and password hashes, and that bucket could not
# be made private: its anonymous-access flags revert to public seconds after
# being cleared (console, CLI and API alike, 2026-09-16). So the off-box copy
# does not rely on the bucket at all. Each dump gets a fresh random AES-256 key;
# that key is sealed with an RSA public key (backup-public.pem) whose PRIVATE
# half never touches this VM. A leaked object is unreadable.
#
# The private key lives on the operator's PC (C:\Users\moskn\.smartplayer\
# backup-private.pem). LOSE IT AND EVERY UPLOADED BACKUP IS UNRECOVERABLE —
# keep a second copy somewhere offline.
#
# Why off-box copies matter: this database lives on the VM's only disk. If that
# disk is lost, the bucket is the backup; the local copies only cover mistakes.
#
# ── Restore ────────────────────────────────────────────────────────────────
#
# From a local copy on the VM (not encrypted):
#   docker exec -i smartplayer-db pg_restore -U postgres -d smartplayer_prod --clean --if-exists < backups/<file>.dump
#
# From the bucket, on the machine holding the private key:
#   tar -xf <file>.dump.tar                         # -> key.enc, dump.enc
#   openssl pkeyutl -decrypt -inkey backup-private.pem -pkeyopt rsa_padding_mode:oaep -in key.enc -out key.bin
#   openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -pass file:key.bin -in dump.enc -out restore.dump
#   rm key.bin
# then pg_restore restore.dump as above.

set -euo pipefail
cd "$(dirname "$0")"

set -a
. ./backup.env # BACKUP_S3_KEY_ID, BACKUP_S3_SECRET, BACKUP_BUCKET
set +a

PUBLIC_KEY=./backup-public.pem
[ -s "$PUBLIC_KEY" ] || { echo "missing $PUBLIC_KEY — refusing to upload unencrypted" >&2; exit 1; }

STAMP=$(date -u +%Y-%m-%dT%H-%M-%SZ)
KEEP_LOCAL=7
mkdir -p backups
chmod 700 backups
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "[$STAMP] backup starting"

for db in smartplayer_prod smartplayer_staging; do
  docker exec smartplayer-db psql -v ON_ERROR_STOP=1 -U postgres -d "$db" -qAtc "
    DO \$\$ BEGIN
      IF to_regclass('public.admin_audit_log') IS NOT NULL THEN
        DELETE FROM admin_audit_log WHERE created_at < now() - interval '365 days';
      END IF;
    END \$\$;"

  file="backups/$db-$STAMP.dump"
  docker exec smartplayer-db pg_dump -U postgres -Fc "$db" > "$file"
  chmod 600 "$file"
  if [ ! -s "$file" ]; then
    echo "  $db: EMPTY DUMP — aborting" >&2
    exit 1
  fi

  # Encrypt: fresh data key per dump, sealed with the RSA public key.
  rm -f "$WORK"/*
  openssl rand -out "$WORK/key.bin" 32
  openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -pass "file:$WORK/key.bin" -in "$file" -out "$WORK/dump.enc"
  openssl pkeyutl -encrypt -pubin -inkey "$PUBLIC_KEY" -pkeyopt rsa_padding_mode:oaep \
    -in "$WORK/key.bin" -out "$WORK/key.enc"
  rm -f "$WORK/key.bin"
  bundle="$WORK/$db-$STAMP.dump.tar"
  tar -cf "$bundle" -C "$WORK" key.enc dump.enc

  # Uploaded with a pinned modern curl in a container, NOT the VM's curl 7.81:
  # 7.81's --aws-sigv4 hashes an empty body for uploads, so Object Storage
  # answers XAmzContentSHA256Mismatch, and a hand-added x-amz-content-sha256
  # header is rejected as unsigned. Credentials go in via environment, not argv.
  docker run --rm \
    -v "$bundle:/upload.tar:ro" \
    -e K="$BACKUP_S3_KEY_ID" -e S="$BACKUP_S3_SECRET" \
    -e URL="https://storage.yandexcloud.net/$BACKUP_BUCKET/$db/$db-$STAMP.dump.tar" \
    curlimages/curl:8.10.1 \
    sh -c 'curl -sS --fail --max-time 300 --aws-sigv4 aws:amz:ru-central1:s3 --user "$K:$S" -T /upload.tar "$URL"'

  echo "  $db: $(stat -c %s "$file") bytes, encrypted and uploaded"

  # Oldest local copies out; the bucket keeps its own history.
  ls -1t backups/"$db"-*.dump | tail -n +$((KEEP_LOCAL + 1)) | xargs -r rm --
done

echo "[$(date -u +%Y-%m-%dT%H-%M-%SZ)] backup done"
