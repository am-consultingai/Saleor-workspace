#!/usr/bin/env bash
# Day-to-day driver for the Saleor dev stack (live code reload).
#
# For a brand-new machine, run ./bootstrap.sh instead — it does preflight checks,
# clones the child repos, picks a free port, and calls into this script.
#
# Usage:
#   ./dev/dev.sh up [args]      build (if needed) and start the stack
#   ./dev/dev.sh up -d          ... detached
#   ./dev/dev.sh build          build the local images
#   ./dev/dev.sh setup          one-time: migrate + seed + fix image domain
#   ./dev/dev.sh migrate        apply Django migrations
#   ./dev/dev.sh seed           seed demo data + admin (skips if already seeded)
#   ./dev/dev.sh fix-domain     point the API Site domain at the host API port
#   ./dev/dev.sh warm           pre-generate product thumbnails (fast first browse)
#   ./dev/dev.sh down           stop and remove containers
#   ./dev/dev.sh logs [svc]     follow logs
#   ./dev/dev.sh restart worker restart a service (e.g. to pick up Celery changes)
#   ./dev/dev.sh <anything>     passed straight through to `docker compose`
#
# Env:
#   API_PORT   host port the API is published on (default 8001). Browser-facing
#              URLs (dashboard, storefront, image links) are derived from it.
set -euo pipefail

WORKSPACE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$WORKSPACE"

# Exported so docker compose interpolates ${API_PORT} in the override file, and so
# nested invocations (bootstrap.sh) share the same value.
export API_PORT="${API_PORT:-8001}"

BASE="saleor-platform/docker-compose.yml"
OVERRIDE="dev/docker-compose.dev.yml"

for required in "$BASE" "saleor" "saleor-dashboard" "storefront"; do
  if [ ! -e "$required" ]; then
    echo "✗ Missing '$required'. Run ./clone-all.sh (or ./bootstrap.sh) first." >&2
    exit 1
  fi
done

# Project dir = saleor-platform/ (dir of first -f), so the base file's relative paths
# and the project name (shared volumes) match a plain `docker compose` run.
compose() { docker compose -f "$BASE" -f "$OVERRIDE" "$@"; }

# Run a one-off manage.py command in a throwaway api container.
manage() { compose run --rm -T api python manage.py "$@"; }

seed_if_needed() {
  echo "→ Checking whether demo data already exists..."
  local seeded
  seeded="$(manage shell -c "from saleor.product.models import Product; print('YES' if Product.objects.exists() else 'NO')" 2>/dev/null | grep -oE 'YES|NO' | head -1 || true)"
  if [ "$seeded" = "YES" ]; then
    echo "✓ Demo data already present — skipping seed."
  else
    echo "→ Seeding demo data + admin user (admin@example.com / admin)..."
    manage populatedb --createsuperuser
  fi
}

fix_domain() {
  echo "→ Pointing API Site domain at localhost:${API_PORT} (so product image URLs resolve)..."
  manage shell -c "from django.contrib.sites.models import Site; Site.objects.all().update(domain='localhost:${API_PORT}')" >/dev/null
}

# Pre-generate product thumbnails by hitting the API's own thumbnail endpoint from
# inside the RUNNING api container (Saleor generates each size/format lazily on first
# request). Best-effort and non-fatal — uncached thumbnails just generate on demand.
# Requires the stack to be up (uses `exec`, not a throwaway `run` container).
warm() {
  echo "→ Pre-generating product thumbnails so the first browse is fast (best effort)..."
  compose exec -T api python manage.py shell <<'PY' 2>/dev/null | grep -E '^WARMED' || echo "  (warm skipped — non-fatal; thumbnails will generate on demand)"
import base64, urllib.request
from saleor.product.models import ProductMedia
sizes = [(1024, "webp"), (256, "webp")]
n = 0
for pk in ProductMedia.objects.filter(type="IMAGE").values_list("pk", flat=True):
    gid = base64.b64encode(("ProductMedia:%d" % pk).encode()).decode()
    for size, fmt in sizes:
        try:
            urllib.request.urlopen(
                "http://localhost:8000/thumbnail/%s/%d/%s/" % (gid, size, fmt), timeout=20
            ).read()
            n += 1
        except Exception:
            pass
print("WARMED", n)
PY
}

cmd="${1:-up}"
shift || true

case "$cmd" in
  build)      compose build "$@" ;;
  up)         compose up --build "$@" ;;
  migrate)    manage migrate ;;
  seed)       seed_if_needed ;;
  fix-domain) fix_domain ;;
  warm)       warm ;;
  setup)
    echo "→ Applying database migrations..."
    manage migrate
    seed_if_needed
    fix_domain
    echo "✓ Setup complete. Now run: ./dev/dev.sh up"
    ;;
  logs)       compose logs -f "$@" ;;
  *)          compose "$cmd" "$@" ;;
esac
