#!/usr/bin/env bash
# bootstrap.sh — ONE command to take a fresh clone to a fully running Saleor stack.
#
#   git clone <this-repo> && cd Saleor-workspace && ./bootstrap.sh
#
# Idempotent: safe to re-run. It clones the child repos, builds the local images,
# migrates + seeds the database (only if empty), fixes the product-image domain,
# and starts the API, dashboard, and storefront with live code reload.
#
# Env (all optional):
#   API_PORT=8001   host port for the API; auto-bumped if busy
set -euo pipefail

WORKSPACE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$WORKSPACE"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
step() { printf '\n\033[1;34m==>\033[0m \033[1m%s\033[0m\n' "$*"; }
ok()   { printf '   \033[1;32m✓\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ---- 1. preflight -----------------------------------------------------------
step "Checking prerequisites"
command -v git >/dev/null    || die "git is not installed."
command -v docker >/dev/null || die "Docker is not installed (Docker Desktop or engine)."
docker info >/dev/null 2>&1  || die "Docker daemon is not running. Start Docker and retry."

# docker compose v2 with !override support (>= 2.24)
cver="$(docker compose version --short 2>/dev/null || echo 0)"
cmajor="${cver%%.*}"; crest="${cver#*.}"; cminor="${crest%%.*}"
if [ "${cmajor:-0}" -lt 2 ] || { [ "${cmajor:-0}" -eq 2 ] && [ "${cminor:-0}" -lt 24 ]; }; then
  die "Docker Compose >= 2.24 required (found ${cver}). Update Docker."
fi
ok "git, Docker daemon, and Docker Compose ${cver} present."

# ---- 2. pick a free host port for the API -----------------------------------
step "Selecting API host port"
port_in_use() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null && { exec 3>&- 3<&-; return 0; } || return 1; }
API_PORT="${API_PORT:-8001}"
REQUESTED_PORT="$API_PORT"
tries=0
while port_in_use "$API_PORT"; do
  # Skip our own already-running stack on the requested port (re-run case).
  if [ "$API_PORT" = "$REQUESTED_PORT" ] && docker compose \
       -f saleor-platform/docker-compose.yml -f dev/docker-compose.dev.yml ps api 2>/dev/null \
       | grep -q api; then
    ok "Port $API_PORT is our own running stack — reusing it."
    break
  fi
  API_PORT=$((API_PORT + 1))
  tries=$((tries + 1))
  [ "$tries" -gt 50 ] && die "Could not find a free port near 8001."
done
export API_PORT
ok "API will be published on host port ${API_PORT}."

# ---- 3. clone the child repos ----------------------------------------------
step "Ensuring child repos are cloned"
./clone-all.sh

# ---- 4. build local images --------------------------------------------------
step "Building local images (first run compiles deps — this can take a few minutes)"
./dev/dev.sh build

# ---- 5. database: migrate, seed (if empty), fix image domain ----------------
step "Preparing the database"
./dev/dev.sh setup

# ---- 6. start everything ----------------------------------------------------
step "Starting the stack (api, worker, dashboard, storefront)"
./dev/dev.sh up -d

# ---- 7. wait for services to answer ----------------------------------------
step "Waiting for services to come up"
# Probe over HTTP without assuming a specific client is installed on the host.
http_ok() { curl -fsS -o /dev/null --max-time 3 "$1" 2>/dev/null || wget -q -O /dev/null -T 3 "$1" 2>/dev/null; }
wait_http() { # name url max_seconds
  local name="$1" url="$2" max="$3" i=0
  while [ "$i" -lt "$max" ]; do
    if http_ok "$url"; then ok "$name is up ($url)"; return 0; fi
    i=$((i + 2)); sleep 2
  done
  printf '   \033[1;33m·\033[0m %s not responding yet at %s (it may still be compiling)\n' "$name" "$url"
  return 1
}
# API: a GET to /graphql/ returns 200 (the playground); good readiness signal.
wait_http "API"        "http://localhost:${API_PORT}/graphql/" 90 && API_UP=1 || API_UP=0
wait_http "Dashboard"  "http://localhost:9000/"                120 || true
wait_http "Storefront" "http://localhost:3000/"                180 || true

# ---- 7b. pre-generate thumbnails so the first browse is fast ----------------
if [ "${API_UP:-0}" = "1" ]; then
  step "Warming product thumbnails (one-time, so the first page load is fast)"
  ./dev/dev.sh warm || true
fi

# ---- 8. summary -------------------------------------------------------------
step "Ready"
bold "Saleor is running:"
cat <<EOF
   Storefront   http://localhost:3000        (customer shop)
   Dashboard    http://localhost:9000        (admin — admin@example.com / admin)
   GraphQL API  http://localhost:${API_PORT}/graphql/
   Mailpit      http://localhost:8025        (captured emails)
   Jaeger       http://localhost:16686       (tracing)

Next:
   Edit code in saleor/ or saleor-dashboard/ or storefront/ — changes hot-reload.
   ./dev/dev.sh logs [service]     follow logs
   ./dev/dev.sh restart worker     pick up Celery code changes
   ./dev/dev.sh down               stop everything
EOF
