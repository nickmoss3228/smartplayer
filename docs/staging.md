# Staging environment

A second copy of the stack on the **same VM** as production, served from
`test.малако.рф`, deployed from the `staging` git branch. Use it to try
features and ideas without touching the live site.

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
dig +short test.xn--80aa4acdq.xn--p1ai      # must return 89.169.159.92
```

Do not skip ahead — see the note in `Caddyfile` about burning the Let's
Encrypt rate limit on a name that doesn't resolve yet.

### 2. Staging bucket

Create `audioplayer-data-staging` (Object Storage → Create bucket, public
read), and grant the existing service account `storage.editor` on it.

**This is the boundary that can actually destroy production data.**
`uploadBuffer()` writes deterministic keys
(`stories/<difficulty>/<storyId>/<part>/audio.mp3`) and overwrites in place, so
a staging Story Builder upload aimed at the production bucket replaces the live
audio for that story. Object storage has no equivalent of the database split —
only the bucket name separates them.

A fresh bucket has no existing audio, so stories in staging will 404 on
playback until you copy objects across (`yc storage s3 sync`, or the console).
That's the right trade: 404s in staging beat silent destruction in production.

### 3. Files on the VM

The VM's `~/smartplayer` holds `docker-compose.yml`, `Caddyfile` and the env
files; they are not deployed by CI. Create the env file **first**, then copy the
compose file up — that ordering means the box is never in a state where the new
compose file references an env file that doesn't exist yet:

```bash
scp backend/.env.staging.example smartplayer:~/smartplayer/backend/

ssh smartplayer
cd ~/smartplayer
mv backend/.env.staging.example backend/.env.staging
$EDITOR backend/.env.staging      # fill in — the four CRITICAL values
exit

# only now
scp docker-compose.yml Caddyfile smartplayer:~/smartplayer/
```

(The compose entry marks that env file `required: false` precisely so getting
this order wrong can't break a *production* deploy — but do it in order anyway.)

### 4. First deploy

Push the branch, let CI build and push both `:staging` images, then bring the
stack up and enable the Caddy route:

```bash
# locally
git push -u origin staging

# on the VM, once both workflows are green
cd ~/smartplayer
docker compose --profile staging up -d
docker compose --profile staging ps          # both should reach (healthy)

# only now uncomment the staging block in Caddyfile, then
docker compose restart caddy
```

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
