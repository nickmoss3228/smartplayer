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

## Working with subagents: Opus oversees, Sonnet and Haiku do the work

Standing instruction from the user: when this session runs on Opus, hand small and
medium tasks to the two malako subagents through the Agent tool. This counts as the
user asking for subagents. Opus plans, writes the briefs, reviews and integrates the
results, and does the hard parts itself.

- `subagent_type: "malako-helper"` runs on Haiku; `"malako-worker"` runs on Sonnet.
  Their definitions set the model, so do not pass `model`.
- They live in `~/.claude/agents/` (user level), because Claude is usually launched
  from `D:/Programming/ed-tech`, which is outside this repo, and project agents are
  only found between the launch folder and the repo root.
- Do not use `general-purpose` for malako work: it has no guard. `Explore` is fine
  for read-only searches.

### Who does what
- **`malako-helper` (Haiku)**: mechanical work that is easy to check. Finding files
  and usages, reading logs, running `npm test` / `npm run build` / `npm run test:api`
  and summarising the failures, adding a key to both `src/locales/en` and
  `src/locales/ru`, renames, copy edits, one-file changes with an exact spec.
- **`malako-worker` (Sonnet)**: medium work with a clear spec. A component or endpoint
  that follows an existing pattern, writing tests, fixing a bug whose cause is already
  known, a refactor inside one area.
- **Opus, inline**: design and architecture; root-causing a bug nobody understands
  yet; anything touching auth, payments, access control (`accessFor`) or sessions;
  DB migrations; everything that reaches staging or production (git push, the VM,
  buckets, the remote databases); design and UX calls the user should see; reviewing
  all delegated work; talking to the user.

Do it inline when writing the brief would take longer than making the change (a
one-line fix in a file already open), or when the task leans on context from this
conversation that is hard to write down.

### Writing the brief
A subagent starts cold. It has not seen this conversation or the memory notes, and may
not have read this file. The agent definitions already carry the project basics, the
conventions, the hard limits and the report format, so the brief only states:
1. The goal and why it matters, in two or three sentences.
2. The exact files, plus an existing file whose pattern to copy.
3. What "done" means: which command must pass (`npm run build` is the `tsc` gate,
   `npm test`, `cd backend && npm run test:api`) and what must visibly work.
4. Anything the task specifically must not touch.

### Hard limits (built into the agents)
Neither agent may write to git, reach anything remote (the VM, `yc`, buckets, the
staging or production database), start dev servers, install packages or touch `.env`
files. The reasons: a push to `master` or `staging` IS a deploy, the index often holds
pre-staged work, and a leftover server keeps port 3000 busy.

- **Enforcement:** a PreToolUse hook in both definitions,
  `~/.claude/hooks/malako-subagent-guard.js`, blocks these commands. After editing it,
  run `node ~/.claude/hooks/malako-subagent-guard.test.js`.
- **It is a seatbelt, not a sandbox:** a node script that uploads from its own code
  gets through. Never brief a subagent to run upload or seed scripts.
- **What you keep:** never delegate a step that needs one of these limits; do that
  step yourself. A subagent reporting a block means the guard worked.

### Running them
- Work in the main checkout, not `isolation: "worktree"`. A worktree starts from HEAD,
  and this checkout usually carries uncommitted work the task depends on. Use a
  worktree only for a task on committed code.
- Run editing subagents in parallel only when they touch different files. Read-only
  ones (searching, reviewing) can always run in parallel.
- Pass `run_in_background: false` when the next step needs the result.

### Reviewing: never pass on "done" unchecked
- Read the diff of every file the subagent touched, and run its done-command yourself.
- If the work is wrong, send corrections to the same agent with `SendMessage`, which
  keeps its context, instead of starting a new one. After two failed rounds, move the
  task up a level: `malako-helper` to `malako-worker`, `malako-worker` to Opus inline.
- When reporting to the user, say which parts were delegated, to which model, and
  what you checked.

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
Local (`backend/.env` and the frontend `.env`) uses the staging bucket, because
upload keys are deterministic and a local upload into production replaced live audio.

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
