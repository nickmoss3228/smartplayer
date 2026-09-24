# malako (малако.рф)

## Goal
An app that helps people study English - especially the Listening aspect. We let people train their listening skills.

## Stack
- Frontend: React, TypeScript, Tailwind, Redux Toolkit
- Backend: Node.js, Express, PostgreSQL (Drizzle ORM, `backend/src/db/`)

## Conventions
- Use functional components only
- Prefer async/await over .then chains
- Frontend tests live next to the source as `*.test.ts(x)`; backend HTTP tests live in `backend/test/api/*.test.js`

## Commands
- `npm run dev` — start dev server
- `npm test` — frontend unit tests (Vitest)
- `cd backend && npm run test:api` — backend HTTP tests against the local Postgres (database `smartplayer_test`)
- `npm run lint` — lint code
- `npm run build` — build code

## Notes
- Keep API responses in camelCase
- Do not use the emojis - instead, where possible, use icons.

## Infrastructure you can reach from this machine

All verified working on 2026-09-24. Check here before assuming something is out
of reach — several of these look unavailable but are not.

### PostgreSQL — yes
Production and staging share one `postgres:16` container on the VM
(`smartplayer-db`), databases `smartplayer_prod` and `smartplayer_staging`.
Its port is on the VM's loopback only; reach it with
`ssh -N -L 15432:localhost:5432 smartplayer` or
`ssh smartplayer 'docker exec -it smartplayer-db psql -U postgres -d smartplayer_staging'`.
Locally, the `smartplayer-postgres` container (`docker compose --profile localdb up -d postgres`)
holds `smartplayer_dev`; `backend/.env` points at it. MongoDB Atlas is no longer used.

### Yandex Object Storage — yes
S3 credentials are in `backend/.env` (`YANDEX_*`). Use `@aws-sdk/client-s3` from
`backend/`, `forcePathStyle: true`. Two buckets, and they are NOT interchangeable:

- `audioplayer-data` — production
- `audioplayer-data-staging` — staging (the staging frontend is built against it)

Reads and writes both work. `backend/src/helpers/uploadToStorage.js` is the upload path;
finite `Cache-Control` for anything referenced by an unversioned URL.

### The production VM over SSH — yes
`ssh smartplayer` — an alias in `~/.ssh/config` for `deploy@89.169.159.92`, key
`smartplayer_vm`. Confirmed working non-interactively with `-o BatchMode=yes`.
When the DurevVPN tunnel is up it swallows traffic to the VM (SSH times out during
the banner exchange), and adding the IP to its bypass list does not help. Ask the
user to run this in an admin PowerShell; it lasts until the VPN reconnects:
`New-NetRoute -DestinationPrefix "89.169.159.92/32" -InterfaceAlias "Беспроводная сеть" -NextHop "192.168.1.1" -RouteMetric 1`

### Docker — local and on the VM
Installed locally, where it runs the dev Postgres container above. On the VM the
`deploy` user runs `docker` without sudo: `ssh smartplayer 'docker ps'`. Compose
lives in `~/smartplayer` there and runs the app (`smartplayer-frontend`, `-backend`,
their `-staging` twins, `smartplayer-caddy`), the shared `smartplayer-db`, and a
monitoring stack (Grafana, Loki, Prometheus and their exporters).

### GitHub CLI — yes
`gh` is on PATH, authenticated as `nickmoss3228`. Useful for watching deploys:
`gh run list --branch master`, `gh run watch <id> --exit-status`.

### yc CLI — yes, but not on PATH
`~/yandex-cloud/bin/yc.exe` (v1.25.0), configured with the right cloud and
folder; it works unattended. It is a standalone binary that can't self-update, so
newer command groups such as `postbox` are missing — call Postbox's SES-compatible
API with the service account's static key instead.

### Deploys are automatic
Pushing to `master` deploys production and pushing to `staging` deploys staging;
there is no manual step — the push IS the deploy. The workflows are path-filtered:
the backend one runs only when `backend/**` changes, and the frontend one skips
pushes that touch only `backend/**`, `docs/**` or `README.md`. Neither runs tests
or lint. The frontend's only gate is `tsc` (inside `npm run build`); the
backend's is the Docker build, the migration step and the container healthcheck.
