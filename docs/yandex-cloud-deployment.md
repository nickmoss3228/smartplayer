# Deploying SmartPlayer to Yandex Cloud with Docker

A complete write-up of how the frontend got from "a React app on Vercel" to "a container running on a
virtual machine I own." Written to be re-usable: the *concepts* apply to any provider, and the
*commands* apply to Yandex Cloud specifically.

**Status (updated 2026-08-16):** live at **https://малако.рф** over HTTPS, frontend and backend both
containerised on the VM behind Caddy. `infinityplayer.xyz` is the retired Vercel deployment and
still points there — see §9. The DNS/TLS cutover is written up in §8.

---

## 1. The mental model

Four separate things are involved. Confusing them is the main source of pain, so it's worth being
precise:

| Thing | What it is | Analogy |
|---|---|---|
| **Dockerfile** | A recipe for building an image | A recipe |
| **Image** | A frozen, immutable filesystem + startup command | A sealed meal-kit box |
| **Container** | A *running instance* of an image | The meal, cooked and on the table |
| **Registry** | A warehouse you push images to and pull them from | A distribution centre |

The flow is always the same:

```
Dockerfile --(docker build)--> image --(docker push)--> registry
                                                          |
                                              (docker pull) on the server
                                                          |
                                                          v
                                              --(docker run)--> container
```

The key insight: **the server never builds anything.** It downloads a finished image and runs it.
That's why deploys are fast and why "works on my machine" stops being a problem — the machine that
built it and the machine that runs it execute the *identical* filesystem.

### Why a static React app needs a web server at all

`npm run build` produces a `dist/` folder of plain files (HTML/JS/CSS). Something has to serve those
files over HTTP. In the container that's **nginx**. So the image is really two stages glued together:

1. **Build stage** — a Node image, runs `npm ci && npm run build`, produces `dist/`
2. **Runtime stage** — an nginx image, copies `dist/` in, and serves it

This is a **multi-stage build**. The final image contains nginx + your built files, and *none* of
Node, npm, or `node_modules`. That's the difference between a ~370MB image and a ~1.5GB one.

---

## 2. The files we created, and why each exists

All in `player/smartplayer/`.

### `Dockerfile`
The recipe. Two stages as described above. Two subtleties worth understanding:

**Layer caching.** Docker caches each instruction. We copy `package.json` + `package-lock.json` and
run `npm ci` *before* copying the rest of the source. That way, editing a component doesn't
invalidate the dependency-install layer, and rebuilds take seconds instead of minutes.

**Build-time vs runtime environment variables.** This is the single most important gotcha for
frontend containers:

> Vite **inlines** `import.meta.env.VITE_*` into the JavaScript at build time. The values are
> physically compiled into the bundle. They are *not* read when the container starts.

Consequently `VITE_API_URL` is passed as a Docker **build argument** (`ARG`/`--build-arg`), not a
runtime env var. And critically: **changing it requires rebuilding and repushing the image.**
Restarting the container does nothing. (Backend env vars like `MONGODB_URI` are the opposite — those
*are* read at runtime and belong in `env_file`.)

**`VITE_API_URL` must be the empty string in production.** The frontend and the backend are served
from the same origin here — `nginx.conf` proxies `/api/` to the `backend` container — so the bundle
should emit *relative* URLs and let nginx route them. An absolute origin would work but pins the
bundle to one hostname and drags CORS back into a setup specifically designed to avoid it.

> **You cannot achieve this by setting the GitHub Actions variable to `""`.** GitHub rejects an
> empty variable value at the API — `Variable value cannot be empty` (HTTP 422) — and `gh variable
> set --body ""` fails the same way with a slightly different message, because the CLI omits the
> empty key entirely. The **only** way to get an empty build arg is to **delete the variable**, so
> that `${{ vars.VITE_API_URL }}` expands to `""`. `deploy-frontend.yml` carries a comment saying
> so; the absence of the variable is deliberate configuration, not a missing setting.

This bit us: `VITE_API_URL` was left pointing at the old Railway backend
(`https://smartplayer-production.up.railway.app`) long after the migration, so the Yandex frontend
was compiled to call Railway and the co-located backend container was never used at all — the whole
nginx proxy path sat idle. If the deployed site behaves like the old one, check this variable first.

The code reads it as `import.meta.env.VITE_API_URL ?? "http://localhost:3000"` — deliberately `??`
and not `||`, because `||` treats `""` as unset and would silently fall back to localhost, which is
exactly how a same-origin production build breaks in a way that's hard to spot.

### `nginx.conf`
Replicates what `vercel.json` was doing for us before:

- **SPA fallback** — `try_files $uri $uri/ /index.html`. React Router owns routes like `/levels/easy`,
  but no such *file* exists. Without this, hard-refreshing a deep link returns 404.
- **Immutable caching for `/assets/`** — Vite fingerprints filenames (`index-snWtGT9m.js`). Because
  the name changes whenever content changes, those files can be cached for a year safely.
- **`no-cache` on `index.html`** — deliberately the opposite. `index.html` keeps a *stable* name and
  points at the fingerprinted assets, so it must be revalidated or users would never see new deploys.
- **`/healthz`** — a trivial endpoint so Docker/monitoring can ask "are you alive?"

### `.dockerignore`
Like `.gitignore`, but for the build context (everything sent to the Docker daemon on `docker build`).
Excluding `node_modules`, `dist`, `.git`, and `backend/` keeps builds fast and prevents secrets from
accidentally entering an image layer.

### `docker-compose.yml`
Describes the *running system* declaratively, so you don't hand-type long `docker run` lines. It
defines two services (`frontend`, `caddy`), a shared private network, and `restart: unless-stopped`.
The commented-out `backend` block is a placeholder so adding it later needs no restructuring.

### `Caddyfile`
Caddy is a reverse proxy that obtains and renews **Let's Encrypt TLS certificates automatically**.
Three lines gets you HTTPS. It sits in front and forwards to the frontend container.

### `cloud-init.yaml`
A script the cloud runs *once* on a brand-new VM. It creates the `deploy` user, installs your SSH
key, and installs Docker. This is how a server configures itself without manual setup.

### `.github/workflows/deploy-frontend.yml`
The CI/CD pipeline. See §7 — it is **not active yet**.

---

## 3. Provisioning the cloud infrastructure

Seven resources, in dependency order. Free unless noted.

```bash
yc init                          # one-time: authenticate, pick cloud/folder/zone
```

**1. Container Registry** — the warehouse for images.
```bash
yc container registry create --name smartplayer-registry
```

**2. Network + subnet** — we *reused the existing `default` network* rather than creating one.
Always check what already exists before creating infrastructure.

**3. Security group** — the firewall. Nothing reaches the VM unless allowed here.
```bash
yc vpc security-group create --name smartplayer-sg --network-id <NET_ID> \
  --rule "direction=ingress,port=22,protocol=tcp,v4-cidrs=[0.0.0.0/0]" \
  --rule "direction=ingress,port=80,protocol=tcp,v4-cidrs=[0.0.0.0/0]" \
  --rule "direction=ingress,port=443,protocol=tcp,v4-cidrs=[0.0.0.0/0]" \
  --rule "direction=egress,from-port=0,to-port=65535,protocol=any,v4-cidrs=[0.0.0.0/0]"
```

**4. Static public IP** (~$1.50/mo) — without reserving one, the IP changes on stop/start and your
DNS records break.
```bash
yc vpc address create --name smartplayer-ip --external-ipv4 zone=ru-central1-a
```

**5. Service account + role** — a machine identity. Granting it `container-registry.images.puller`
and attaching it to the VM means the VM can pull private images **with no credentials stored on
disk**. It fetches short-lived tokens from a metadata endpoint instead. This is the single most
valuable security pattern here.
```bash
yc iam service-account create --name smartplayer-vm-sa
yc resource-manager folder add-access-binding <FOLDER_ID> \
  --role container-registry.images.puller --subject serviceAccount:<SA_ID>
```

**6. SSH keypair** — generated locally. The private half never leaves your machine; the public half
goes into `cloud-init.yaml`. No passphrase, because CI must authenticate non-interactively.
```bash
ssh-keygen -t ed25519 -f ~/.ssh/smartplayer_vm -N "" -C "smartplayer-vm-deploy"
```

**7. The VM** (~$10-12/mo) — the only meaningfully billable resource.
```bash
yc compute instance create \
  --name smartplayer-vm --zone ru-central1-a --platform standard-v3 \
  --cores 2 --core-fraction 20 --memory 2GB \
  --create-boot-disk image-folder-id=standard-images,image-family=ubuntu-2204-lts,size=20,type=network-hdd \
  --network-interface subnet-id=<SUBNET_ID>,nat-ip-version=ipv4,nat-address=<STATIC_IP>,security-group-ids=<SG_ID> \
  --service-account-id <SA_ID> \
  --metadata-from-file user-data=cloud-init.yaml
```

`--core-fraction 20` means a *burstable* CPU: guaranteed 20% of a core, able to spike higher. Ideal
for a web server that's idle most of the time, and roughly 5x cheaper than a dedicated core.

---

## 4. Build, push, deploy

### The short version

`deploy.sh` encodes every step below, including the three footguns in §4.2. Prefer it:

```bash
./deploy.sh backend             # build + verify + push + deploy backend
./deploy.sh frontend            # same for frontend
./deploy.sh all                 # both
./deploy.sh frontend --build-only   # build + verify locally, stop before pushing
```

It builds, verifies the artifact (bcrypt round-trip for the backend, API-origin check for the
frontend bundle), authenticates, pushes, then on the VM tags the outgoing image `:rollback`,
pulls, and waits for the healthcheck to actually pass before returning.

### 4.1 The manual equivalent

```bash
# 1a. Build frontend (from player/smartplayer/)
docker build --provenance=false --sbom=false \
  --build-arg VITE_API_URL="" \
  --build-arg VITE_YOS_BASE_URL="https://storage.yandexcloud.net/audioplayer-data" \
  -t cr.yandex/crpjfs7cp0kc3qg46i5p/smartplayer-frontend:latest .

# 1b. Build backend (context is ./backend; it takes no build args —
#     all backend config arrives at RUNTIME via backend/.env.production)
docker build --provenance=false --sbom=false \
  -t cr.yandex/crpjfs7cp0kc3qg46i5p/smartplayer-backend:latest ./backend

# 2. Authenticate + push  (token is short-lived — re-run every deploy)
yc iam create-token | docker login --username iam --password-stdin cr.yandex
docker push cr.yandex/crpjfs7cp0kc3qg46i5p/smartplayer-frontend:latest

# 3. Deploy on the VM
ssh -i ~/.ssh/smartplayer_vm deploy@89.169.159.92
cd ~/smartplayer
docker tag <IMG>:latest <IMG>:rollback     # snapshot BEFORE pulling over :latest
docker compose pull frontend
docker compose up -d --wait --wait-timeout 120 frontend
```

### 4.2 Three things that will silently break a manual deploy

**1. `--provenance=false --sbom=false` is mandatory.** BuildKit otherwise attaches attestations,
producing an OCI manifest list that Yandex CR refuses — *after* every layer has uploaded, with the
misleading error `Cannot read manifest data`. See §5.1.

**2. Registry credentials expire.** Yandex CR takes only IAM tokens, which last ~12h, so a stored
`docker login` is always stale by the next deploy. On the dev box re-run `yc iam create-token | …`.
On the VM, mint one from the attached service account instead of storing anything:

```bash
TOKEN=$(curl -s -H "Metadata-Flavor: Google" \
  "http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token" \
  | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
echo "$TOKEN" | docker login --username iam --password-stdin cr.yandex
```

**3. Tag `:rollback` before pulling.** `docker compose pull` overwrites `:latest` and the previous
image becomes untagged, so the escape hatch has to be created *first*. To revert:

```bash
docker tag <IMG>:rollback <IMG>:latest && docker compose up -d <service>
```

### 4.3 Base image policy

Pin to a **supported major, not a frozen minor**. Minor-pinned tags stop being rebuilt and their OS
packages rot, which is how an image accumulates CVEs without anyone changing a line of code:

| image | scan result |
|---|---|
| `node:20-alpine` | EOL 2026-04-30 — 2 critical / 25 high, will only grow |
| `node:22-alpine` | supported to Apr 2027 — 1 critical / 7 high |
| `nginx:1.27-alpine` | frozen minor — 6 critical / 27 high |
| `nginx:1.28-alpine` | frozen minor — 8 critical / 26 high |
| `nginx:stable-alpine` | continuously rebuilt — **0 critical / 0 high** |

Both Dockerfiles now use `node:22-alpine`; the frontend runtime uses `nginx:stable-alpine`.
Re-pin to a digest only if reproducibility ever matters more than staying patched.

---

## 5. Four bugs we hit, and what they teach

These cost real time. All are now fixed in the repo, but the *lessons* generalise.

### 5.1 The registry silently rejected our image
`docker push` uploaded every layer, then failed:
`Cannot read manifest data ... manifest-v2-2`. The image appeared in the registry **but untagged**,
so `docker pull …:v1` said "not found."

**Cause:** modern Docker BuildKit attaches *attestations* (provenance/SBOM metadata), producing an
OCI image index. Yandex's registry only accepts the older Docker manifest v2-2.

**Fix:** build with `--provenance=false --sbom=false`.

**Lesson:** a push can fail *after* the slow part succeeds. Also — we initially misread this as
success because the command was `docker push … | tail -3`, and in a pipeline the exit code belongs to
`tail`, not `docker`. **Never judge success by a piped command's exit code.**

### 5.2 cloud-init reported success while installing nothing
`cloud-init status` said `done`, but Docker wasn't installed.

**Cause:** this line ran under cloud-init's shell:
```bash
echo "deb [...] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable"
```
`$VERSION_CODENAME` expanded to **empty**, writing `.../ubuntu  stable` — a malformed apt source. apt
errored, the Docker install was skipped, and cloud-init still exited 0.

**Fix:** wrap in an explicit `bash -c`.

**Lesson:** **verify the outcome, not the status code.** Check `docker --version` on a new VM rather
than trusting "done."

### 5.3 PowerShell corrupted a token piped to stdin
`yc iam create-token | docker login --password-stdin` failed with "Password is invalid — must be IAM
token", despite a perfectly valid token.

**Cause:** PowerShell 5.1 re-encodes text piped into native programs (adding a BOM / wrong encoding).

**Fix:** pipe via Git Bash, or write the token to an ASCII-no-BOM file first.

**Lesson:** on Windows, piping *binary-sensitive* data through PowerShell is unreliable. Use bash.

### 5.4 `sudo reboot` over SSH silently didn't reboot
Testing restart-resilience, the SSH command errored oddly and the box appeared to restart — but
`uptime -s` proved it hadn't. The *container* had restarted, not the machine.

**Fix:** use the provider API (`yc compute instance restart`), which is authoritative.

**Lesson:** when testing "does it survive a reboot", prove the reboot happened (`uptime -s`).

---

## 6. Operating the machine

**Connect:**
```bash
ssh -i ~/.ssh/smartplayer_vm deploy@89.169.159.92
```
Everything below assumes you're connected and in `~/smartplayer`.

### Logs
```bash
sudo docker compose logs -f frontend          # follow live (Ctrl+C to stop)
sudo docker compose logs --tail 100 frontend  # last 100 lines
sudo docker logs smartplayer-frontend         # by container name
sudo journalctl -u docker -n 50               # the Docker daemon itself
sudo cat /var/log/cloud-init-output.log       # first-boot provisioning log
```

### Status and control
```bash
sudo docker compose ps                  # what's running, health, ports
sudo docker ps -a                       # all containers, including stopped
sudo docker compose restart frontend    # restart
sudo docker compose down                # stop and remove
sudo docker compose up -d               # start everything
sudo docker compose pull frontend && sudo docker compose up -d frontend   # deploy new image
```

### Poking inside a running container
```bash
sudo docker compose exec frontend sh          # shell inside it
sudo docker compose exec frontend ls /usr/share/nginx/html
sudo docker compose exec frontend nginx -t    # validate nginx config
```

### Machine health
```bash
free -h          # memory
df -h            # disk
htop             # processes (sudo apt install htop)
sudo docker stats --no-stream    # per-container CPU/RAM
sudo docker system df            # disk used by images/containers
sudo docker system prune -a      # reclaim space (deletes unused images!)
```

### From your laptop, without SSH
```bash
yc compute instance list
yc compute instance get smartplayer-vm
yc compute instance restart smartplayer-vm
yc compute instance stop smartplayer-vm     # halts compute billing; IP+disk still bill
yc compute instance start smartplayer-vm
```

There's also a **serial console** in the Yandex Cloud web console — useful if SSH breaks entirely
(e.g. a bad firewall rule locks you out).

---

## 7. Auto-deploy on push — **ACTIVE** (as of 2026-08-11)

Pushing to `master` now deploys automatically. Verified end-to-end: commit `db9db24` triggered a run
that built the image, pushed it, and restarted the container on the VM — the running image digest
(`sha256:9d86e66a…`) matches the registry's `:latest`, tagged with that commit's SHA.

```
git push origin master
      |
      v
GitHub Actions: docker build --> push to cr.yandex --> ssh to VM --> compose pull + up -d
      |
      v
live in ~90 seconds
```

**What triggers it:** any push to `master`, *except* changes confined to `backend/`, `docs/`, or
`README.md` (see `paths-ignore` in the workflow).

**Watching a deploy:**
```bash
gh run list --limit 5          # recent runs
gh run watch                   # follow the current run live
gh run view --log-failed       # logs of whatever failed
```
Or the repo's **Actions** tab in a browser.

### What's configured

*Secrets* (write-only; values can't be read back):
`YC_SA_JSON_CREDENTIALS` · `VM_SSH_HOST` · `VM_SSH_PRIVATE_KEY`

*Variables:*
`YC_REGISTRY_ID` · `VITE_API_URL` · `VITE_YOS_BASE_URL`

> `VITE_API_URL` is a **variable, not a secret**, because it's compiled into the public JS bundle
> anyway. To repoint the frontend at a new backend, change this variable and push — the rebuild picks
> it up. Changing it on the VM would do nothing.
>
> **`VITE_API_URL` must NOT exist as a variable.** See §3: the backend is same-origin behind nginx,
> so the bundle should emit relative `/api/...` URLs, which requires the build arg to be empty — and
> GitHub refuses to store an empty variable value (HTTP 422). Deleting the variable makes
> `${{ vars.VITE_API_URL }}` expand to `""`, which is exactly what's wanted. If this variable exists
> at all, the frontend is compiled to call an absolute origin: the retired Railway URL means a dead
> backend, and `http://89.169.159.92` means every login is blocked as mixed content once the site is
> served over HTTPS.

CI authenticates to the registry as a dedicated service account (`github-actions-sa`,
`container-registry.images.pusher`), separate from the VM's pull-only identity — so neither can do
the other's job if compromised.

### Three bugs that had to be fixed first

Worth knowing, since all three fail *silently* — a workflow that never triggers looks identical to
one that doesn't exist:

- The workflow assumed the repo root was `ed-tech` (`paths: player/smartplayer/**`,
  `working-directory: player/smartplayer`). **The repo root is `player/smartplayer` itself**, so
  those paths matched nothing.
- It triggered on branch `main`; **this repo's branch is `master`.**
- The VM's `.env` pinned `TAG=v1` while CI pushes `:latest` — deploys would have silently re-pulled
  the *old* image. Now `TAG=latest`.

### Differences from Vercel

- **Only `master` deploys.** No per-branch preview URLs.
- **No automatic rollback.** To roll back, retag a previous image or push a revert commit.
- **~90s vs Vercel's ~40s**, because the image is rebuilt from scratch rather than using a warm
  build cache.

---

## 8. The DNS + TLS cutover to малако.рф — **DONE (2026-08-16)**

The site is live at **https://малако.рф**, on a Let's Encrypt certificate, with the backend
co-located behind the same origin. This section is the log of what that actually took.

### 8.1 The domain is an IDN, which touches more than you'd expect

`малако.рф` is an internationalized domain. Its A-label (punycode) form is:

```
малако.рф      ->  xn--80aa4acdq.xn--p1ai
www.малако.рф  ->  www.xn--80aa4acdq.xn--p1ai
```

The browser shows Cyrillic in the address bar but sends the **punycode** form in the `Host` and
`Origin` headers, and Let's Encrypt issues the certificate against punycode. So every config that
matches on a hostname must use the A-label — a `cors.js` entry reading `https://малако.рф` would
match nothing, forever, with no error to tell you why. Both the `Caddyfile` and the CORS allow-list
are therefore written in punycode, which has the side benefit that config and logs stay in one
alphabet while debugging.

### 8.2 Registrar traps (reg.ru + ispmanager)

Three things cost time here, all before a single line of config mattered:

1. **`.рф` registrations are held pending identity verification.** While pending, the zone is not
   delegated at all — `NS` and `SOA` queries return empty and reg.ru answers from their own parking
   IP (`37.140.192.133`). DNS edits saved in ispmanager have *no effect whatsoever* during this
   window. Symptom: you add a correct A record, nothing changes, and it looks like a config bug.
   Check `Resolve-DnsName <domain> -Type NS` first — an empty answer means "not delegated yet",
   not "wrong record".
2. **Adding a record does not replace the old one.** After adding `@ -> 89.169.159.92`, the zone
   still contained `@ -> 37.140.192.133`. Two A records means resolvers round-robin, so the site
   would work for roughly half of visitors and show the parking page for the rest — and the ACME
   challenge would fail about half the time. The stale records must be deleted explicitly.
3. **The default zone ships AAAA records.** reg.ru's zone included
   `@ / www -> 2a00:f940:2:2:1:1:0:116`. **The VM has no IPv6** (`yc compute instance get` shows
   only the v4 addresses). Browsers and Let's Encrypt both *prefer* IPv6 when a AAAA exists, so
   leaving it in place would have sent the HTTP-01 challenge to reg.ru over v6 and failed the
   issuance while the IPv4 record looked perfectly correct. Deleting the AAAA records is not
   optional.

The gate before touching the VM is therefore: `nslookup` returns exactly `89.169.159.92` and **no**
IPv6 address, for both the apex and `www`.

### 8.3 The cutover itself

CI does **not** sync `Caddyfile`, `docker-compose.yml`, or the env files — both workflows only pull
an image and restart a service. Those files on `~/smartplayer/` are managed by hand, so the
Caddyfile change had to be copied up separately.

```bash
# 1. new Caddyfile (punycode), backed up first
cat Caddyfile | ssh deploy@89.169.159.92 'cp ~/smartplayer/Caddyfile{,.bak} && cat > ~/smartplayer/Caddyfile'

# 2. backend secrets: Yandex Object Storage creds + a corrected FRONTEND_URL
#    (it was `infinityplayer.xyz` with NO scheme, so password-reset emails built
#    a non-absolute link — broken independently of this migration)
sed -i 's|^FRONTEND_URL=.*|FRONTEND_URL=https://xn--80aa4acdq.xn--p1ai|' ~/smartplayer/backend/.env.production

# 3. hand ports 80/443 to Caddy and recreate everything
mv docker-compose.override.yml docker-compose.override.yml.disabled
sudo docker compose up -d --force-recreate
```

`--force-recreate` matters: compose does **not** treat an edited `env_file` as a config change, so
without it the backend would keep running with the old environment and the new storage credentials
would appear not to work.

Certificates were obtained on the first attempt for both names via `tls-alpn-01`, with no failed
validations. Verified from outside: HTTPS 200, HTTP→HTTPS 308, `www` 200, SPA deep-link 200,
`/api/stories/easy` 200 through the nginx proxy, certificate `CN=xn--80aa4acdq.xn--p1ai` issued by
Let's Encrypt.

### 8.4 The variable that was quietly wrong the whole time

`VITE_API_URL` had been left pointing at the retired Railway backend. Because Vite inlines it at
build time, the *Yandex* frontend was compiled to call *Railway*, and the co-located backend
container it was deployed alongside was never used — the entire nginx `/api/` proxy path sat idle.
It must be the **empty string**, which makes the bundle emit relative URLs. Note the code now reads
it with `??` rather than `||`, because `||` treats `""` as unset and silently falls back to
`localhost:3000`.

---

## 9. Remaining work

1. **`infinityplayer.xyz`** still points at Vercel (`64.29.17.65` / `216.198.79.65`). Decide whether
   to retire it or redirect it to малако.рф. To redirect: repoint its A records at the VM, then add
   a redirect block to the `Caddyfile` — Caddy will obtain a certificate for it automatically, but
   **only after** its DNS resolves here, for the same rate-limit reason as above.
2. **CORS** — `backend/src/middleware/cors.js` still has a *hardcoded* origin allow-list and ignores
   the `FRONTEND_URL` env var that already exists in `config/env.js`. Any new frontend origin
   requires a **code change** there, not a config change. Now mostly moot for the app itself, since
   same-origin requests through nginx never trigger CORS at all — it only matters for local dev
   against a remote backend.
3. **Image size** — 367MB, of which ~128MB is 966 MP3s in `public/assets/` baked into the image.
   The same audio is also served from Object Storage, so this may be redundant weight.
4. **Object Storage cache headers** — new uploads now carry
   `Cache-Control: public, max-age=31536000, immutable` with a `?v=<hash>` versioned URL, but the
   ~966 pre-existing objects still have none. `backend/src/scripts/backfillCacheControl.js` fixes
   them; run it with `--dry-run` and then `--prefix` on a slice first, since
   `MetadataDirective: REPLACE` drops the ACL if it isn't restated.
5. **A real CDN** in front of the bucket (Yandex Cloud CDN). The `Cache-Control` work above is its
   prerequisite, not an alternative: an edge has no TTL to honour until the origin sends one.

---

## 10. Quick reference

| Item | Value |
|---|---|
| Site (HTTP) | `http://89.169.159.92` |
| SSH | `ssh -i ~/.ssh/smartplayer_vm deploy@89.169.159.92` |
| App directory on VM | `~/smartplayer` |
| Cloud ID | `b1ggpsdj9id04h7ubgcc` |
| Folder ID | `b1grn5nt77oj1659pgv2` |
| Registry ID | `crpjfs7cp0kc3qg46i5p` |
| Image | `cr.yandex/crpjfs7cp0kc3qg46i5p/smartplayer-frontend:latest` |
| VM | `smartplayer-vm` (`fhmj6lgnsvphfp6tovmt`), 2 vCPU @ 20%, 2GB |
| Security group | `enp2e8lkufep9ioklbgs` |
| VM service account | `ajeudiqi3gr04bj339nd` |
| `yc` CLI | `C:\Users\moskn\yandex-cloud\bin\yc.exe` (not on PATH) |

**Windows note:** neither `docker` nor `yc` is on your PATH. Prefix per shell:
```powershell
$env:PATH += ";C:\Program Files\Docker\Docker\resources\bin;$env:USERPROFILE\yandex-cloud\bin"
```
