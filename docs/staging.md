# Staging environment

A second copy of the stack on the **same VM** as production, served from
`test.малако.рф`, deployed from the `staging` git branch. Use it to try
features and ideas without touching the live site.

> **Getting in:** the site is gated by a secret cookie — see
> [staging-access.md](./staging-access.md) for the unlock URL, and read its
> "Do not put basic_auth on this site" section before adding any auth in front
> of it.

```
VM 89.169.159.92

  Caddy :443
   ├── малако.рф        → frontend:80          → /api/ → backend:3000
   └── test.малако.рф   → frontend-staging:80  → /api/ → backend-staging:3000

  Atlas cluster0
   ├── test      ← production data (default db — the URI has no path)
   └── staging   ← throwaway

  Object Storage
   ├── audioplayer-data          ← production media
   └── audioplayer-data-staging  ← staging uploads

  git:  master  ──auto──▶ production
        staging ──auto──▶ staging
```

## What keeps the two apart

| Boundary | Mechanism |
|---|---|
| Code | `master` vs `staging` branch; separate workflows, path-filtered the same way |
| Images | tag `latest` vs tag `staging` — production's compose entry pulls `latest` and never sees a staging build |
| Containers | compose `profiles: ["staging"]` — invisible to any command that doesn't pass `--profile staging` |
| API routing | `BACKEND_UPSTREAM` build arg bakes `backend-staging:3000` into the staging image's nginx |
| Database | `/staging` path in `MONGODB_URI` |
| Sessions | separate `JWT_SECRET` |
| Admin access | separate `ADMIN_CODE` / `ADMIN_CODES` |
| Media | separate bucket — **the one boundary with no automatic protection**, see below |

The single shared runtime resource is the `smartplayer-net` Docker network, so
the one Caddy can reach both frontends. Nothing crosses it: each frontend's
nginx only knows its own backend.

## One-time setup

Everything in the repo is already done. These four steps are on you, in order.

### 1. DNS

Add an A record `test.малако.рф → 89.169.159.92`. Wait for it:

```bash
bash dig +short test.xn--80aa4acdq.xn--p1ai      # must return 89.169.159.92
```

Do not skip ahead — see the note in `Caddyfile` about burning the Let's
Encrypt rate limit on a name that doesn't resolve yet.

### 2. Staging bucket — DONE

`audioplayer-data-staging` exists, is public-read, and holds a full copy of
production's media (988 objects, 147 MiB, verified by ETag). Recorded here so
it can be redone from scratch.

**This is the boundary that can actually destroy production data.**
`uploadBuffer()` writes deterministic keys
(`stories/<difficulty>/<storyId>/<part>/audio.mp3`) and overwrites in place, so
a staging Story Builder upload aimed at the production bucket replaces the live
audio for that story. Object storage has no equivalent of the database split —
only the bucket name separates them.

The `yc` CLI is not on PATH on the dev machine; it lives at
`~/yandex-cloud/bin/yc.exe` (same fallback `deploy.sh` uses).

```bash
YC="$HOME/yandex-cloud/bin/yc.exe"

# Copy every object across. Note: there is NO `yc storage s3 sync` — the
# PREVIEW s3 interface implements only cp / mv / rm / presign, so a recursive
# cp is the whole toolbox. It is a plain copy, not a sync: it never deletes,
# and it re-copies everything rather than skipping unchanged objects.
"$YC" storage s3 cp s3://audioplayer-data s3://audioplayer-data-staging \
  --recursive --only-show-errors

# CORS must be set separately — a new bucket has none, and public-read alone
# is not enough. The waveform decodes audio via XHR rather than a plain
# <audio> src, so without Access-Control-Expose-Headers on the range headers
# the player fails on files that load fine when opened directly in a tab.
# Values are protobuf enum names (METHOD_GET), not bare verbs, and repeated
# properties build a list.
"$YC" storage bucket update --name audioplayer-data-staging \
  --cors id=cors,allowed-methods=METHOD_GET,allowed-methods=METHOD_HEAD,\
allowed-headers=*,allowed-origins=*,expose-headers=Content-Length,\
expose-headers=Content-Range,expose-headers=Accept-Ranges,max-age-seconds=3600
```

Verify with a range request — expect `206`, `Access-Control-Allow-Origin`, and
`Content-Range`:

```bash
curl -s -o /dev/null -D - -H "Origin: https://test.xn--80aa4acdq.xn--p1ai" \
  -H "Range: bytes=0-99" \
  "https://storage.yandexcloud.net/audioplayer-data-staging/leo/quiz/1.leo's%20life/vocab/flat.mp3"
```

Because `cp` is not a sync, re-run it whenever production gains media you want
in staging. It overwrites by key, so it is safe to repeat.

### 3. Files on the VM — DONE

The VM's `~/smartplayer` holds `docker-compose.yml`, `Caddyfile` and the env
files; they are not deployed by CI. Create the env file **first**, then copy the
compose file up — that ordering means the box is never in a state where the new
compose file references an env file that doesn't exist yet:

```bash
scp backend/.env.staging.example smartplayer:~/smartplayer/backend/

ssh smartplayer
cd ~/smartplayer
mv backend/.env.staging.example backend/.env.staging
chmod 600 backend/.env.staging
$EDITOR backend/.env.staging      # fill in — the four CRITICAL values
exit

# only now
scp docker-compose.yml Caddyfile smartplayer:~/smartplayer/
```

(The compose entry marks that env file `required: false` precisely so getting
this order wrong can't break a *production* deploy — but do it in order anyway.)

### 4. First deploy — DONE

Push the branch, let CI build and push both `:staging` images, then bring the
stack up and enable the Caddy route:

```bash
# locally
git push -u origin staging

# on the VM, once both workflows are green.
# Name the services explicitly: a bare `up -d` also evaluates the production
# services and would recreate them if anything in their config had drifted.
cd ~/smartplayer
docker compose --profile staging pull frontend-staging backend-staging
docker compose --profile staging up -d frontend-staging backend-staging
docker compose --profile staging ps          # both should reach (healthy)
```

Then uncomment the staging block in `Caddyfile` and reload. **Validate before
reloading** — production sits behind this same Caddy, and a config error would
take the live site down with it. `reload` is graceful; `restart` drops
connections for both sites:

```bash
docker compose exec caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose exec caddy caddy reload   --config /etc/caddy/Caddyfile --adapter caddyfile
```

A `401` with `WWW-Authenticate: Basic` from
`https://test.xn--80aa4acdq.xn--p1ai` means it worked: the certificate was
issued (TLS completed) and basic_auth is gating it.

## Daily use

```bash
git checkout staging
git merge master          # keep staging current before starting something new
# ...work...
git push                  # deploys to test.малако.рф automatically
```

When a feature is ready, merge `staging → master`; the production workflows
take it from there.

### Verify you're where you think you are

The most dangerous failure mode is *believing* you're on staging while pointed
at production. Two quick checks:

```bash
# which backend is this frontend actually talking to?
docker exec smartplayer-frontend-staging grep backend_upstream /etc/nginx/conf.d/default.conf
#   → set $backend_upstream http://backend-staging:3000;

# which database is that backend on? (should print a URI containing /staging)
docker exec smartplayer-backend-staging printenv MONGODB_URI
```

### Resetting staging

The staging database is disposable by design — drop it in the Atlas UI (or
`mongosh` → `use staging` → `db.dropDatabase()`) and restart
`backend-staging`. Nothing else needs doing; there are no migrations.

## Operational notes

- **Cost**: two extra containers on the existing VM. If it starts swapping,
  that's the signal to move staging to its own host rather than to trim
  production.
- **Rollback**: images are also tagged `staging-<sha>`, so
  `STAGING_TAG=staging-<sha> docker compose --profile staging up -d` pins an
  older build. Production's `TAG` in `~/smartplayer/.env` is a separate
  variable and is unaffected.
- **`--profile staging` is mandatory** on every compose command touching these
  services. Omit it and compose considers them out of scope, does nothing, and
  exits 0 — a silent no-op, not an error.
- **Production commands are unchanged.** `docker compose up -d frontend`,
  `docker compose pull backend`, `./deploy.sh all` and both production
  workflows behave exactly as before and will never touch staging containers.
