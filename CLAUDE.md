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

## Running the stack

`saleor-platform/` wires the services together with docker-compose. See its README
for `docker compose up`. The dashboard and storefront point at the backend's GraphQL
endpoint via their own env config.

## Working guidance for the agent

- Each child repo is autonomous: commit/branch/PR **inside** the relevant child folder.
- When asked for a change that touches the API, check whether the dashboard or
  storefront consume the affected fields/types before declaring the task done.
- Keep changes scoped to one repo per session where possible.
- This file is **living** — update it when repos, relationships, or run steps change.
