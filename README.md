# Saleor-workspace

A workspace overlay around the Saleor polyrepo. See `CLAUDE.md` for the cross-repo
overview. The child repos (`saleor`, `saleor-dashboard`, `storefront`,
`saleor-platform`) are git-ignored here and each lives as its own repo.

## Quick start (one command)

```bash
git clone <your-user>/Saleor-workspace
cd Saleor-workspace
./bootstrap.sh
```

`bootstrap.sh` is idempotent and does everything:

1. Checks prerequisites (Docker running, Docker Compose ≥ 2.24, git).
2. Picks a free host port for the API (defaults to `8001`, auto-bumps if busy).
3. Clones the four child repos (`clone-all.sh`).
4. Builds the API/dashboard images from your **local source**.
5. Migrates the database and seeds demo data + an admin user (only if empty).
6. Fixes product-image URLs to use the chosen API port.
7. Starts the **API, worker, dashboard, and storefront** with live code reload.
8. Waits for each service and prints the URLs.

When it finishes:

| Service     | URL                              | Notes                                 |
|-------------|----------------------------------|---------------------------------------|
| Storefront  | http://localhost:3000            | customer shop (Next.js)               |
| Dashboard   | http://localhost:9000            | admin — `admin@example.com` / `admin` |
| GraphQL API | http://localhost:8001/graphql/   | the shared contract (port may vary)   |
| Mailpit     | http://localhost:8025            | captured outgoing emails              |
| Jaeger      | http://localhost:16686           | request tracing                       |

> Requirement: **Docker** (Docker Desktop on Mac/Windows/WSL, or engine + compose v2
> on Linux). Nothing else needs to be installed on the host — Python/Node/pnpm all
> run inside containers.

## Day-to-day

```bash
./dev/dev.sh up -d            # start everything (after first bootstrap)
./dev/dev.sh logs storefront  # follow a service's logs
./dev/dev.sh restart worker   # pick up Celery code changes
./dev/dev.sh down             # stop everything
```

Edit code in `saleor/`, `saleor-dashboard/`, or `storefront/` and changes hot-reload.
See `dev/README.md` for how the dev override works and the port/networking details.

## Set up children without starting the stack

```bash
./clone-all.sh                # just clone the child repos (CLONE_DEPTH=0 for full history)
```

## Maintainer: create a new overlay from this template

`scripts/create-workspace.sh` spins up a brand-new overlay repo from this one
(reads the real tracked files, creates a GitHub remote, clones children, bootstraps).
Teammates never need this — it's for maintainers only.
