# Saleor Workspace

This is a **workspace overlay**: one folder that holds several independent Saleor
repos plus the shared context for working across them. Each child repo is a normal,
autonomous git repo (its own history, branches, PRs, and origin). This overlay's git
tracks **only** the files in this folder — never the child repos' code.

## Repos in this workspace

| Folder             | What it is                                  | Stack              |
|--------------------|---------------------------------------------|--------------------|
| `saleor/`          | Core commerce backend / **GraphQL API**     | Python, Django     |
| `saleor-dashboard/`| Admin UI (manage products, orders, etc.)    | React, TypeScript  |
| `storefront/`      | Customer-facing shop                        | Next.js, React, TS |
| `saleor-platform/` | docker-compose to run the whole stack       | Docker             |

## The shared contract

`saleor` exposes everything over **GraphQL**. Both `saleor-dashboard` and
`storefront` are *clients* of that API. **The GraphQL schema is the contract** —
a change to the schema in `saleor` may require matching changes in the dashboard
and/or storefront. Treat cross-repo coordination through the schema as the main
risk surface.

**Before any cross-repo change, read the architecture maps in `arch/`** — they are
the pre-computed cross-repo contract (one `arch/<repo>.md` per repo). Query them
instead of re-reading the repos. Run `/investigate` to (re)generate them.

## Running the stack

**One command from a fresh clone:** `./bootstrap.sh` — clones the child repos,
builds from local source, migrates + seeds the DB, fixes image URLs, and starts the
API, worker, dashboard, and storefront with live reload. It is idempotent.

Day-to-day use `./dev/dev.sh` (`up`/`down`/`logs`/`restart`/`setup`). These layer
`dev/docker-compose.dev.yml` on top of the upstream `saleor-platform/docker-compose.yml`
so the stack runs from the local checkouts instead of published images. `dev/README.md`
documents the override, ports, and the image-URL / storefront-SSR gotchas.

Key facts for the agent:
- The API host port defaults to **8001** (not 8000); browser-facing URLs and the
  product-image Site domain are derived from it. If you query the API by hand, use
  the port `bootstrap.sh` reported.
- `saleor-platform/` is a git-ignored child repo — never edit its compose file to
  change dev behavior; change `dev/docker-compose.dev.yml` (tracked) instead.
- `scripts/create-workspace.sh` is a maintainer-only tool for spinning up a new
  overlay from this one; it is not part of the normal run flow.

## Working guidance for the agent

- Each child repo is autonomous: commit/branch/PR **inside** the relevant child folder.
- When asked for a change that touches the API, check whether the dashboard or
  storefront consume the affected fields/types before declaring the task done.
- Keep changes scoped to one repo per session where possible.
- This file is **living** — update it when repos, relationships, or run steps change.
