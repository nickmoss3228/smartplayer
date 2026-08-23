# Project: MyApp

## Goal
An app that helps people study English - especially the Listening aspect. We let people train their listening skills.

## Stack
- Frontend: React, TypeScript, Tailwind, Redux Toolkit
- Backend: Node.js, Express, MongoDB

## Conventions
- Use functional components only
- Prefer async/await over .then chains
- Tests live alongside source files as *.test.ts

## Commands
- `npm run dev` — start dev server
- `npm test` — run test suite
- `npm run lint` — lint code
- `npm run build` — build code

## Notes
- Do not modify files in /legacy
- Keep API responses in camelCase
- Do not use the emojis - instead, where possible, use icons.

## Connecting to MongoDB from this machine

**A VPN does not fix this. Do not suggest turning one on.**

This ISP refuses `SRV` and `TXT` lookups for `*.mongodb.net` specifically —
plain `A` records for the same host resolve fine and general DNS is healthy, so
everything *looks* normal until a driver tries the SRV step. Public resolvers
are intercepted and refuse too (1.1.1.1 and 8.8.8.8 both), and an app-level VPN
does not tunnel this machine's DNS, so it changes nothing.

The symptom is always the same line, and it means DNS, never credentials,
never Atlas being down, never a firewall:

```
querySrv EREFUSED _mongodb._tcp.cluster0.mbpdn2e.mongodb.net
```

**The fix is already in `backend/.env`: a seed-list URI that needs no SRV
lookup.** `MONGODB_URI` must stay on the `mongodb://` form listing the three
shard hosts explicitly; the original `mongodb+srv://` line is kept commented
directly below it. If you see the error above, check that the commented line
has not been swapped back in.

```
mongodb://<creds>@ac-ynn7t6a-shard-00-00.mbpdn2e.mongodb.net:27017,...-01...,...-02...:27017/
  ?ssl=true&replicaSet=atlas-y5zjbp-shard-0&authSource=admin
```

A seed list does not self-update the way SRV does, so if the cluster is ever
resized or migrated, re-read the shard hostnames from the Atlas UI or over
DNS-over-HTTPS, which is not intercepted:

```bash
curl -H 'accept: application/dns-json' \
  'https://cloudflare-dns.com/dns-query?name=_mongodb._tcp.cluster0.mbpdn2e.mongodb.net&type=SRV'
```

Two things that follow from this:
- `connectDB()` calls `process.exit(1)` before `app.listen`, so a DNS failure
  means no server at all, not a server without a database.
- The Yandex VM reaches Atlas fine with no VPN. A local Mongo failure is never
  evidence of a deployment problem.

## Infrastructure you can reach from this machine

All verified working on 2026-08-24. Check here before assuming something is out
of reach — several of these look unavailable but are not.

### MongoDB Atlas — yes
See the section above for the SRV trap. `backend/.env` now defaults to the
**scratch** database `smartplayer-dev`; the production URI sits directly below
it, commented out. Production is the `test` database (no path segment in the
URI), which is why local runs used to edit live student data by accident.
Connect with mongoose from `backend/`, reusing `config` from `src/config/env.js`.

`src/scripts/seedDevFromProd.js` copies stories/markers/visibility prod -> dev.
It opens production read-only and refuses to run unless the target database
name contains "dev".

### Yandex Object Storage — yes
S3 credentials are in `backend/.env` (`YANDEX_*`). Use `@aws-sdk/client-s3` from
`backend/`, `forcePathStyle: true`. Two buckets, and they are NOT interchangeable:

- `audioplayer-data` — production
- `audioplayer-data-staging` — staging (the staging frontend is built against it)

Reads and writes both work. `src/helpers/uploadToStorage.js` is the upload path;
finite `Cache-Control` for anything referenced by an unversioned URL.

### The production VM over SSH — yes
`ssh smartplayer` — an alias in `~/.ssh/config` for `deploy@89.169.159.92`, key
`smartplayer_vm`. Confirmed working non-interactively with `-o BatchMode=yes`.

### Docker — only on the VM
Not installed locally; `docker` is not on PATH and never will be here. Reach it
through SSH: `ssh smartplayer 'sudo docker ps'`. Five containers run there —
`smartplayer-frontend`, `smartplayer-backend`, the two `-staging` counterparts,
and `smartplayer-caddy`. Compose lives in `~/smartplayer` on the VM.

### GitHub CLI — yes, but not on PATH
The binary is at `/c/Program Files/GitHub CLI/gh.exe`; a bare `gh` fails. Quote
the path. Authenticated as `nickmoss3228`. Useful for watching deploys:
`gh run list --branch master`, `gh run watch <id> --exit-status`.

### yc CLI — installed, but NOT usable headlessly
`~/yandex-cloud/bin/yc.exe` (v1.25.0), configured with the right cloud and
folder. Its token has expired, so any real command tries to open a browser for
re-authentication and hangs. Do not reach for it in a session without asking the
user to re-auth first; prefer the S3 SDK or SSH, which both work unattended.

### Deploys are automatic
Pushing to `master` triggers `deploy-backend.yml` and `deploy-frontend.yml`;
pushing to `staging` triggers their `-staging` counterparts. There is no manual
deploy step — the push IS the deploy. Neither workflow runs tests or lint, so
`tsc` (via `npm run build`) is the only gate.
