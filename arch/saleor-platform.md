# saleor-platform — architecture map

Upstream Saleor "run the whole stack locally" repo. Pure Docker Compose orchestration — no application code. Intended for **local development only** (README explicitly says not for production). In this workspace it is a git-ignored child repo; the overlay's `dev/docker-compose.dev.yml` layers on top of this file to run from local source instead of published images (per workspace `CLAUDE.md`).

## Structure
Flat repo, root: `saleor-platform/`
- `docker-compose.yml` — the only orchestration file; defines all 7 services, volumes, network.
- `common.env` — non-secret app config shared by api + worker (channel slug, IP filter flags).
- `backend.env` — connection strings + secrets for api + worker (DB, cache, Celery broker, email, OTEL, `SECRET_KEY`).
- `replica_user.sql` — Postgres init script; creates read-only `saleor_read_only` user (runs only on first volume init).
- `setup-e2e-db.sh` — maintainer helper to load a SQL snapshot into a separate `e2e` DB (macOS-only, not part of normal run).
- `.github/workflows/test-platform.yml` — CI: build + run backend pytest.

## Services (docker-compose.yml)
All on one bridge network `saleor-backend-tier` except `dashboard` (no network declared — uses default, intentionally off the backend network so browser calls go via host ports).

| Service | Image | Host:Container ports | Role |
|---|---|---|---|
| `api` | `ghcr.io/saleor/saleor:3.23` | 8000:8000 | Core GraphQL API (Django). `stdin_open`/`tty` on. |
| `dashboard` | `ghcr.io/saleor/saleor-dashboard:3.23` | 9000:80 | Admin UI (static nginx). No env/network. |
| `db` | `library/postgres:15-alpine` | 5432:5432 | Postgres. Runs `replica_user.sql` on init. |
| `cache` | `valkey/valkey:8.1-alpine` | 6379:6379 | Redis-compatible cache + Celery broker. |
| `worker` | `ghcr.io/saleor/saleor:3.23` | none | Celery worker+beat: `celery -A saleor --app=saleor.celeryconf:app worker --loglevel=info -B`. |
| `jaeger` | `jaegertracing/jaeger` | 16686 (UI), 4317 (OTLP gRPC), 4318 (OTLP HTTP) | Tracing/APM. tmpfs `/tmp`. |
| `mailpit` | `axllent/mailpit` | 1025 (SMTP), 8025 (web UI) | Captures outgoing dev email. |

## Wiring
- `api` `depends_on`: `db`, `cache`, `jaeger`. `worker` `depends_on`: `cache`, `mailpit`. (`depends_on` = start order only, no healthchecks/readiness wait.)
- `api` ↔ `worker` share media via named volume `saleor-media` (`/app/media`).
- Service discovery by compose DNS name: `db`, `cache`, `mailpit`, `jaeger` (see `backend.env` URLs).
- `api` and `worker` both load `common.env` + `backend.env` (identical config).
- `dashboard` talks to `api` only from the browser via `localhost:9000` → API at `localhost:8000`; not wired server-side.
- Tracing: api/worker export OTLP to `jaeger:4317` (`OTEL_*` in backend.env).

## Volumes
Named: `saleor-db` (Postgres data), `saleor-cache` (Valkey data), `saleor-media` (shared api/worker media). Bind: `./replica_user.sql` → Postgres `docker-entrypoint-initdb.d` (`:ro,z`). `jaeger` `/tmp` is tmpfs.

## Env & config
- `common.env`: `DEFAULT_CHANNEL_SLUG=default-channel`, `HTTP_IP_FILTER_ALLOW_LOOPBACK_IPS=True`, `HTTP_IP_FILTER_ENABLED=True`.
- `backend.env`: `DATABASE_URL=postgres://saleor:saleor@db/saleor`, `CACHE_URL=redis://cache:6379/0`, `CELERY_BROKER_URL=redis://cache:6379/1`, `EMAIL_URL=smtp://mailpit:1025`, `DEFAULT_FROM_EMAIL=noreply@example.com`, `SECRET_KEY=changeme`, `OTEL_SERVICE_NAME=saleor`, `OTEL_TRACES_EXPORTER=otlp`, `OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317`.
- Inline on `api`: `DASHBOARD_URL=http://localhost:9000/`, `ALLOWED_HOSTS=localhost,127.0.0.1,api`.
- Inline on `db`: `POSTGRES_USER=saleor`, `POSTGRES_PASSWORD=saleor`.
- DB cache uses logical DB 0; Celery broker uses logical DB 1 (same Valkey instance).
- First-run setup is manual (README): `migrate`, then `populatedb --createsuperuser` (admin `admin@example.com` / `admin`). Workspace `bootstrap.sh` automates this.
- **Workspace note:** upstream API port here is `8000`; the overlay remaps it to `8001` via `dev/docker-compose.dev.yml`. Do **not** edit this file to change dev behavior — change the overlay.

## CI/CD & tests
- Single GitHub Actions workflow `.github/workflows/test-platform.yml`, trigger `pull_request`: `docker compose build` then `docker compose run api pytest -n logical --allow-hosts cache` (parallel via pytest-xdist).
- No deploy pipeline — repo is dev-only, ships nothing.

## Security & compliance notes (dev-only repo)
- All credentials are hardcoded dev defaults committed to git: `SECRET_KEY=changeme`, Postgres `saleor/saleor`, replica user `saleor_read_only/saleor`, admin `admin@example.com/admin`. **Never deploy as-is.**
- Every backend service publishes its port to the host with no auth on cache/jaeger/mailpit — fine on localhost, risky on shared/exposed hosts.
- `worker` runs with `-B` (embedded beat) — fine for single-node dev, would double-schedule if scaled to multiple workers.
- Pinned images: api/dashboard `3.23`, postgres `15-alpine`, valkey `8.1-alpine`; `jaeger` and `mailpit` are unpinned (`latest`).
- `replica_user.sql` runs only on first volume init; changing it later requires dropping the `saleor-db` volume.
