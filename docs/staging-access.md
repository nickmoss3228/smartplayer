# Staging access

How to get into `test.малако.рф`, how the gate works, and why it is built this
way. For the environment itself — architecture, deploys, what keeps staging and
production apart — see [staging.md](./staging.md).

## Getting in

Visit the unlock URL **once per browser or device**. It sets a cookie and
redirects you into the app:

```
https://test.малако.рф/__unlock/<secret>
```

The secret is deliberately **not in this repo, which is public**. It lives on
the VM:

```bash
ssh smartplayer 'grep STAGING_GATE_SECRET ~/smartplayer/.env'
```

After that first visit, use `https://test.малако.рф` normally. The cookie lasts
a year, and your app login behaves exactly as it does in production.

Without the cookie every path returns a bare **404** — not a 403 — so the site
never advertises that it exists. That includes `/api/`, so the data is gated,
not just the UI.

## How the gate works

```
GET /__unlock/<secret>   ->  302, Set-Cookie: stg=<secret>  (a year)
GET /anything            ->  404      unless the cookie is present
GET /anything + cookie   ->  proxied to frontend-staging
```

Defined in [`Caddyfile`](../Caddyfile). The secret comes from
`STAGING_GATE_SECRET` in `~/smartplayer/.env` on the VM, injected into the Caddy
container by [`docker-compose.yml`](../docker-compose.yml).

The secret sits in the unlock *path* on purpose. A bare `/__unlock` that set the
cookie would let anyone in who guessed the path.

`docker-compose.yml` defaults the variable to an unguessable placeholder rather
than an empty string. That matters: an empty secret would reduce the cookie
check to `*stg=*` and let anyone through. With the placeholder, a missing
variable makes staging 404 for everyone — it **fails closed**.

## Do not put basic_auth on this site

It was tried, and it made the site unusable. This is the single most important
thing on this page.

**HTTP defines exactly one `Authorization` header.** The app authenticates with
`Authorization: Bearer <jwt>`, so the moment a user logs in, every API call
overwrites the browser's cached `Authorization: Basic`. Caddy sees a bearer
token where it wants basic credentials and returns 401. The app reads that 401
as an expired session and logs the user out, while the browser simultaneously
re-opens the credential prompt.

The symptom is distinctive: log in successfully, get prompted again immediately,
lose page state, get partway into the account, then get thrown out on the next
navigation.

Proof, on one URL:

| Request | Result |
|---|---|
| `curl -u tester:pw .../api/stories/easy` | 200 |
| `curl -H "Authorization: Bearer x.y.z" .../api/stories/easy` | **401** |
| Same bearer request against production (no basic_auth) | 200 |

Any gate for this site must therefore avoid the `Authorization` header
entirely. A cookie works. So would a `remote_ip` allowlist, or `forward_auth`.

## Rotating the secret

```bash
NEW=$(openssl rand -base64 24 | tr '+/' '-_' | tr -d '=')
ssh smartplayer "cd ~/smartplayer \
  && sed -i '/^STAGING_GATE_SECRET=/d' .env \
  && echo 'STAGING_GATE_SECRET=$NEW' >> .env \
  && docker compose up -d caddy"
```

`up -d caddy` (a **recreate**), not `caddy reload`. Environment variables are
fixed when a container starts, so a reload keeps serving the old value. The
recreate briefly interrupts **production**, which sits behind the same Caddy —
it returns within seconds, and certificates live in a volume so nothing is
re-issued.

Everyone must re-visit the new unlock URL; old cookies stop working immediately.

## Caddyfile traps

Two things that fail silently, both hit while building this.

**`redir / 302` does not redirect.** Caddy reads a leading `/` as an inline path
matcher, so it means "redirect the request for exactly `/` to a URL literally
named 302". The unlock path never matched, and the request fell through to an
empty `200` with the cookie set but no redirect. Use `redir * / 302`.

**`{env.VAR}` does not work in matchers.** It is a *runtime* placeholder, while
`path` and `header` matchers are compiled at startup — so it stays literal and
404s everyone, including whoever holds the correct secret. Caddyfile-level
`{$VAR}` substitution is textual, happens before parsing, and works everywhere.
The two look almost identical; only the `$` distinguishes them.

## The manifest and authenticated origins

`index.html` sets `crossorigin="use-credentials"` on the manifest link. A web
app manifest is fetched with credentials **omitted** by default, so on any
origin behind HTTP auth that fetch 401s by itself — and because browsers
re-fetch the manifest on navigation, it surfaces as a credential prompt on every
page change while the page itself authenticates fine.

The cookie gate made this moot (cookies are sent regardless), but the attribute
stays: it costs nothing on production, which is unauthenticated, and prevents
the same surprise on any future gated origin.

## Verifying the gate

```bash
B=https://test.xn--80aa4acdq.xn--p1ai
S=$(ssh smartplayer 'grep -oP "(?<=^STAGING_GATE_SECRET=).*" ~/smartplayer/.env')

curl -s -o /dev/null -w "%{http_code}\n" $B/                      # 404
curl -s -o /dev/null -w "%{http_code}\n" $B/api/stories/easy      # 404
curl -s -o /dev/null -w "%{http_code}\n" $B/__unlock/wrongsecret  # 404
curl -s -o /dev/null -w "%{http_code}\n" -c j.txt $B/__unlock/$S  # 302
curl -s -o /dev/null -w "%{http_code}\n" -b j.txt $B/             # 200

# the one that matters — cookie and bearer token together
curl -s -o /dev/null -w "%{http_code}\n" -b j.txt \
  -H "Authorization: Bearer x.y.z" $B/api/stories/easy            # 200
```

A 401 anywhere in that sequence means something has reintroduced HTTP auth.
