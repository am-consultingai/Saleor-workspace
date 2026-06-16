# dev/ — local development mode

These files run the Saleor stack from your **local source** with live reload,
instead of the published images the upstream `saleor-platform/docker-compose.yml`
uses. They live in the overlay (tracked) so they travel to every machine — the
`saleor-platform/` child repo is git-ignored and never modified.

## Files

- **`docker-compose.dev.yml`** — a compose *override* layered on top of the base
  platform file. It:
  - builds `api` / `worker` from `../saleor` and bind-mounts the source
    (`uvicorn --reload` → Python edits are live);
  - replaces the dashboard's static nginx image with a Vite dev server that
    bind-mounts `../saleor-dashboard` (HMR);
  - adds a `storefront` Next.js dev server (not in the base file) that bind-mounts
    `../storefront` (hot reload).
- **`dev.sh`** — day-to-day driver (`up`, `down`, `logs`, `restart`, `setup`, …).
  It wires the two compose files together and exports `API_PORT`.

For a fresh machine use the repo-root **`bootstrap.sh`**, which calls into `dev.sh`.

## How the override is applied

```bash
docker compose -f saleor-platform/docker-compose.yml -f dev/docker-compose.dev.yml ...
```

The first `-f` file's directory (`saleor-platform/`) becomes the compose **project
directory**, so the base file's relative paths resolve, the override's `../saleor`
paths point at the sibling repos, and the project name matches a plain
`docker compose` run (shared DB/volumes). Requires Docker Compose **≥ 2.24** for the
`!override` YAML tag.

## Ports

The host-facing API port is `${API_PORT:-8001}`. We default to **8001**, not the
upstream **8000**, because 8000 is commonly taken by other local stacks.
`bootstrap.sh` auto-bumps `API_PORT` if even 8001 is busy and threads the chosen
value through compose, the storefront, and the image-URL domain.

| Service     | Host port |
|-------------|-----------|
| API         | `${API_PORT}` (default 8001) → container 8000 |
| Dashboard   | 9000      |
| Storefront  | 3000      |
| Mailpit     | 8025      |
| Jaeger      | 16686     |

## Two gotchas this setup handles for you

1. **Product images.** Saleor builds absolute image URLs from a *Site domain* stored
   in the DB, which `populatedb` sets to `localhost:8000`. After we publish the API on
   `8001`, those URLs would 404. `dev.sh fix-domain` (run by `setup`/`bootstrap`)
   updates the Site domain to `localhost:${API_PORT}`.

2. **Storefront SSR networking.** The storefront renders **server-side inside its
   container**, so `localhost` there means the container, not the host API. Its
   `NEXT_PUBLIC_SALEOR_API_URL` therefore uses `host.docker.internal:${API_PORT}`
   (reachable from the container, and resolvable on the host so browser-side calls
   work too), and the API's `ALLOWED_HOSTS` is extended to accept that host header.
   On native Linux Docker the `host.docker.internal:host-gateway` mapping makes this
   resolve as well.

## Manual equivalents

```bash
./dev/dev.sh build            # build local images
./dev/dev.sh migrate          # apply migrations
./dev/dev.sh seed             # seed demo data (skips if already seeded)
./dev/dev.sh fix-domain       # repoint image URLs at the current API port
./dev/dev.sh setup            # migrate + seed + fix-domain
```
