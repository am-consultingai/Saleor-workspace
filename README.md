# Saleor Workspace

Everything you need to run the full Saleor stack locally and start contributing —
**from a fresh clone to a running shop with one command.**

This repo is a **workspace overlay**: a single folder that holds several independent
Saleor repos plus the shared tooling to run them together. Each child repo
(`saleor`, `saleor-dashboard`, `storefront`, `saleor-platform`) is its own
autonomous git repo with its own history and remote; this overlay git-ignores their
code and tracks only the shared setup (this README, `bootstrap.sh`, `dev/`, etc.).

---

## 1. Prerequisites

You only need two things on your machine:

- **Docker** — Docker Desktop (macOS / Windows / WSL2) or Docker Engine + Compose v2
  on Linux. **Compose must be ≥ 2.24** (`docker compose version`). Give Docker ≥ 5 GB RAM.
- **git**

That's it. Python, Node, pnpm, Postgres, Redis, etc. all run **inside containers** —
you do not install them on the host.

> On Docker Desktop, make sure the engine is running before you start.

---

## 2. Quick start (one command)

```bash
git clone git@github.com:am-consultingai/Saleor-workspace.git
cd Saleor-workspace
./bootstrap.sh
```

`./bootstrap.sh` is **idempotent** (safe to re-run) and does everything:

1. Checks prerequisites (Docker running, Compose ≥ 2.24, git).
2. Picks a free host port for the API (defaults to **8001**, auto-bumps if busy).
3. Clones the four child repos (`clone-all.sh`).
4. Builds the API images from your **local `saleor/` source**.
5. Migrates the database and seeds demo data + an admin user (only if empty).
6. Fixes product-image URLs to use the chosen API port.
7. Starts the **API, worker, dashboard, and storefront** with live code reload.
8. Warms thumbnails and waits for everything, then prints the URLs.

First run takes several minutes (it builds images and installs JS deps). Re-runs are fast.

### What you get

| Service     | URL                              | What it is                              |
|-------------|----------------------------------|-----------------------------------------|
| Storefront  | http://localhost:3000            | Customer-facing shop (Next.js)          |
| Dashboard   | http://localhost:9000            | Admin UI — log in `admin@example.com` / `admin` |
| GraphQL API | http://localhost:8001/graphql/   | The backend + GraphQL Playground (port may differ — see bootstrap output) |
| Mailpit     | http://localhost:8025            | Catches outgoing emails (order confirmations, etc.) |
| Jaeger      | http://localhost:16686           | Request tracing / APM                   |

---

## 3. What's in here

| Path                | What it is                                  | Stack              |
|---------------------|---------------------------------------------|--------------------|
| `saleor/`           | Core commerce backend / **GraphQL API**     | Python, Django     |
| `saleor-dashboard/` | Admin UI (products, orders, …)              | React, TypeScript  |
| `storefront/`       | Customer shop                               | Next.js, React, TS |
| `saleor-platform/`  | Upstream docker-compose for the services    | Docker             |
| `bootstrap.sh`      | One-command setup (this is what you run)    | —                  |
| `dev/`              | Dev-mode compose override + `dev.sh` driver | — (see `dev/README.md`) |
| `clone-all.sh`      | Clone just the child repos                  | —                  |
| `scripts/`          | Maintainer tooling                          | —                  |

**The contract:** `saleor` exposes everything over **GraphQL**; the dashboard and
storefront are clients of that API. A change to the schema in `saleor` may require
matching changes in the dashboard and/or storefront — that's the main cross-repo risk.

---

## 4. Day-to-day commands

After the first `bootstrap.sh`, use `./dev/dev.sh`:

```bash
./dev/dev.sh up -d              # start the whole stack (detached)
./dev/dev.sh down               # stop and remove containers
./dev/dev.sh logs storefront    # follow a service's logs (api | worker | dashboard | storefront | db | …)
./dev/dev.sh restart worker     # restart one service (Celery has no autoreload — do this after editing tasks)
./dev/dev.sh warm               # re-generate product thumbnails (fast image loads)
./dev/dev.sh <anything>         # passed straight through to `docker compose`
```

### Live reload

Edit code and changes apply automatically:

- **`saleor/` (Python)** → `uvicorn --reload` restarts the API on save.
- **`saleor-dashboard/` (React)** → Vite HMR at `:9000`.
- **`storefront/` (Next.js)** → Fast Refresh at `:3000`.
- **`worker/` (Celery)** → no autoreload; run `./dev/dev.sh restart worker`.

---

## 5. Making changes across repos

Each child folder is its **own git repo** with its own remote. Commit, branch, and
open PRs **inside** the relevant child folder — not from the workspace root:

```bash
cd saleor                       # or saleor-dashboard / storefront
git checkout -b my-feature
git commit -am "..."
git push -u origin my-feature
```

The workspace root git only tracks the shared tooling (this README, `dev/`, etc.) —
it deliberately ignores the child repos' code. A change that spans the API and a
client is therefore **two PRs** (one per repo). When you change the GraphQL schema in
`saleor`, check whether the dashboard or storefront consume the affected
fields/types before calling it done.

---

## 6. Troubleshooting

**Images don't show / page looks stale after a rebuild.**
Hard-refresh the browser: **Ctrl+Shift+R** (Cmd+Shift+R on macOS), or open an
Incognito window. Next.js dev caches aggressively; a normal refresh can serve a stale
bundle. If product images are blank specifically, run `./dev/dev.sh warm`.

**First page load is slow.**
Expected once: Next.js compiles each route on first visit and Saleor generates each
thumbnail on first request. Both are cached afterward — subsequent loads are fast.
`bootstrap.sh` pre-warms thumbnails to minimize this.

**Port 8000 / 8001 already in use.**
`bootstrap.sh` auto-selects a free API port. Check its output for the actual port —
the dashboard, storefront, and image URLs are all wired to whatever it picked.

**`docker compose` errors about `!override` / version.**
You need Compose ≥ 2.24. Update Docker Desktop / the compose plugin.

**A child repo is missing.**
Run `./clone-all.sh` (or just re-run `./bootstrap.sh`). Child repos are git-ignored,
so they don't come with the overlay clone.

**Reset the database (wipe all data and re-seed).**
```bash
./dev/dev.sh down -v     # removes containers + volumes (DB, media, node_modules)
./bootstrap.sh           # rebuilds, migrates, re-seeds from scratch
```

**See what's running.**
```bash
./dev/dev.sh ps
```

For how the dev override works (ports, the storefront SSR networking, the image
optimizer note), see **`dev/README.md`**.

---

## 7. Maintainer note

`scripts/create-workspace.sh` spins up a brand-new overlay repo from this one (reads
the real tracked files, creates a GitHub remote, clones children, bootstraps).
Teammates never need this — it's for maintainers creating a new workspace.

`CLAUDE.md` is the cross-repo context for the Claude Code agent; keep it current when
repos, relationships, or run steps change.
