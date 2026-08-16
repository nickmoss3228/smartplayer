#!/usr/bin/env bash
#
# Build, push and deploy smartplayer to the Yandex Cloud VM.
#
#   ./deploy.sh backend        # backend only
#   ./deploy.sh frontend       # frontend only
#   ./deploy.sh all            # both
#   ./deploy.sh frontend --build-only   # build + verify locally, don't push/deploy
#
# Why this script exists: three separate footguns will silently break a manual
# deploy, and all three are easy to forget. They are documented inline below.
#
set -euo pipefail

REGISTRY="cr.yandex/crpjfs7cp0kc3qg46i5p"
SSH_TARGET="${SSH_TARGET:-smartplayer}"

# --- Vite build args -------------------------------------------------------
# VITE_API_URL MUST default to the empty string. nginx.conf proxies /api/ to
# the backend container, so the bundle should emit RELATIVE urls and let nginx
# route them. An absolute origin re-introduces CORS and, once the site is on
# HTTPS, gets blocked as mixed content. `${VAR-}` (not `${VAR:-}`) is
# deliberate: it lets an explicit empty string through instead of overriding it.
VITE_API_URL="${VITE_API_URL-}"
VITE_YOS_BASE_URL="${VITE_YOS_BASE_URL:-https://storage.yandexcloud.net/audioplayer-data}"

cd "$(dirname "$0")"

# Docker Desktop's binaries are not on PATH under Git Bash on Windows. Without
# this the credential helper is missing and `docker login` fails to save creds.
if ! command -v docker >/dev/null 2>&1; then
  export PATH="/c/Program Files/Docker/Docker/resources/bin:$PATH"
fi

# yc is likewise not on PATH in a default Windows install.
YC="$(command -v yc || true)"
if [ -z "$YC" ] && [ -x "$HOME/yandex-cloud/bin/yc.exe" ]; then
  YC="$HOME/yandex-cloud/bin/yc.exe"
fi
if [ -z "$YC" ]; then
  echo "ERROR: yc CLI not found (looked on PATH and in ~/yandex-cloud/bin)" >&2
  exit 1
fi

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

# ---------------------------------------------------------------------------
# Yandex Container Registry only accepts short-lived IAM tokens (~12h), so a
# previously-saved credential WILL be expired by the next deploy. Always
# re-authenticate; never assume the stored one still works.
# ---------------------------------------------------------------------------
registry_login() {
  log "Authenticating to $REGISTRY"
  "$YC" iam create-token | docker login --username iam --password-stdin cr.yandex
}

# ---------------------------------------------------------------------------
# --provenance=false --sbom=false is REQUIRED.
# Modern BuildKit attaches provenance/SBOM attestations, which turn the push
# into an OCI manifest list. Yandex CR rejects that with a misleading
# "Cannot read manifest data" AFTER all layers have uploaded successfully.
# ---------------------------------------------------------------------------
build_backend() {
  log "Building backend"
  docker build --provenance=false --sbom=false \
    -t "$REGISTRY/smartplayer-backend:latest" \
    ./backend
}

build_frontend() {
  log "Building frontend (VITE_API_URL='${VITE_API_URL}')"
  docker build --provenance=false --sbom=false \
    --build-arg VITE_API_URL="$VITE_API_URL" \
    --build-arg VITE_YOS_BASE_URL="$VITE_YOS_BASE_URL" \
    -t "$REGISTRY/smartplayer-frontend:latest" \
    .
}

# bcrypt is the only native addon; a base-image bump can break its ABI.
verify_backend() {
  log "Verifying backend image (node version + bcrypt round-trip)"
  docker run --rm --entrypoint node "$REGISTRY/smartplayer-backend:latest" -e '
    console.log("node", process.version);
    import("bcrypt").then(m => {
      const b = m.default || m, h = b.hashSync("probe", 10);
      if (!b.compareSync("probe", h) || b.compareSync("wrong", h)) throw new Error("bcrypt round-trip failed");
      console.log("bcrypt OK", h.slice(0, 7));
    }).catch(e => { console.error("BCRYPT FAILED:", e.message); process.exit(1); });'
}

# Catch the classic failure: a bundle compiled against localhost or a stale
# absolute origin. Both produce a site that looks fine and cannot reach the API.
verify_frontend() {
  log "Verifying frontend bundle"
  docker run --rm --entrypoint sh "$REGISTRY/smartplayer-frontend:latest" -c '
    if grep -rqE "localhost:3000" /usr/share/nginx/html/assets/; then
      echo "FAIL: bundle contains localhost:3000 — VITE_API_URL was unset at build time"; exit 1
    fi
    hits=$(grep -rhoE "https?://[a-zA-Z0-9.-]+(:[0-9]+)?/api/" /usr/share/nginx/html/assets/ | sort -u || true)
    if [ -n "$hits" ]; then
      echo "WARNING: bundle contains ABSOLUTE api origins (expected relative /api/):"; echo "$hits"
    else
      echo "OK: no absolute API origin — bundle uses relative /api/ paths"
    fi'
}

push() {
  log "Pushing $1"
  docker push "$REGISTRY/smartplayer-$1:latest"
}

# ---------------------------------------------------------------------------
# The VM authenticates via its attached service account, fetching a fresh token
# from the metadata endpoint. Nothing long-lived is stored on disk. Any IAM
# token baked into ~/.docker/config.json is expired and must be replaced.
# ---------------------------------------------------------------------------
deploy() {
  local svc="$1"
  log "Deploying $svc to $SSH_TARGET"
  ssh -o ConnectTimeout=25 "$SSH_TARGET" bash -s -- "$svc" "$REGISTRY" <<'REMOTE'
set -euo pipefail
SVC="$1"; REGISTRY="$2"
IMG="$REGISTRY/smartplayer-$SVC"

TOKEN=$(curl -s -H "Metadata-Flavor: Google" \
  "http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token" \
  | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
[ -z "$TOKEN" ] && { echo "ERROR: could not get IAM token from metadata"; exit 1; }
echo "$TOKEN" | docker login --username iam --password-stdin cr.yandex >/dev/null

# Snapshot what is currently deployed BEFORE pulling over :latest.
docker tag "$IMG:latest" "$IMG:rollback" 2>/dev/null && echo "rollback tag updated" || true

cd ~/smartplayer
docker compose pull "$SVC"
docker compose up -d --wait --wait-timeout 120 "$SVC"
docker ps --filter "name=smartplayer-$SVC" --format "  {{.Names}}  {{.Status}}"
REMOTE
}

main() {
  local target="${1:-}" build_only=""
  if [ "${2:-}" = "--build-only" ]; then build_only=1; fi
  case "$target" in
    backend|frontend|all) ;;
    *) echo "usage: $0 [backend|frontend|all] [--build-only]" >&2; exit 1 ;;
  esac

  if [ "$target" = "backend" ] || [ "$target" = "all" ]; then
    build_backend
    verify_backend
  fi
  if [ "$target" = "frontend" ] || [ "$target" = "all" ]; then
    build_frontend
    verify_frontend
  fi

  if [ -n "$build_only" ]; then log "--build-only: stopping before push"; exit 0; fi

  registry_login
  for svc in backend frontend; do
    if [ "$target" = "$svc" ] || [ "$target" = "all" ]; then push "$svc"; deploy "$svc"; fi
  done
  log "Done"
}

main "$@"
