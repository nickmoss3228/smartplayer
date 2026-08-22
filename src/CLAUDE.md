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