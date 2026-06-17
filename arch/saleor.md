# saleor — architecture map

Core Saleor commerce backend: a GraphQL-native, API-only, headless e-commerce platform. Python 3.12 / Django 5.2 / Graphene (graphene <3.0, graphql-core 2.x). It is the schema-owning side of the cross-repo contract consumed by `saleor-dashboard` and `storefront`. Version `3.24.0-a.0` (pyproject), branched around the 3.22+ tag line.

## Structure
Monorepo Django project. Code lives under the inner `saleor/` package; project root holds tooling/config.

- Entry points
  - `manage.py` — Django CLI.
  - `saleor/asgi.py` / `saleor/wsgi.py` — app servers; dev runs via `uvicorn saleor.asgi:application --reload`.
  - `saleor/urls.py` — HTTP routes. The only real API surface is `POST /graphql/` (`GraphQLView`, CSRF-exempt). Also: plugin webhook endpoints (`/plugins/...`), thumbnail/image serving, and JWKS at `/.well-known/jwks.json`.
  - `saleor/celeryconf.py` — Celery app; worker = `celery --app saleor.celeryconf:app worker`, beat scheduler via `saleor.schedulers.schedulers.DatabaseScheduler`.
- Config: `saleor/settings.py` (single large settings module, env-driven), `.env.example`, `pyproject.toml` (deps + `poe` task runner), `Dockerfile`.
- Domain apps (Django apps, each typically `models.py`, `migrations/`, `error_codes.py`, `events.py`, business logic; from `INSTALLED_APPS`): `account`, `app`, `attribute`, `channel`, `checkout`, `core`, `csv`, `discount`, `giftcard`, `graphql`, `invoice`, `menu`, `order`, `page`, `payment`, `permission`, `auth`, `plugins`, `product`, `schedulers`, `seo`, `shipping`, `site`, `tax`, `thumbnail`, `warehouse`, `webhook`. The business/domain layer (models, DB, services) is separate from the API layer.
- GraphQL/API layer: `saleor/graphql/` — one subpackage per domain (e.g. `graphql/product/`, `graphql/order/`, `graphql/checkout/`), each with `schema.py` (Queries/Mutations), `types.py`, `mutations/`, `bulk_mutations/`, `filters.py`, `sorters.py`, `dataloaders.py`, `enums.py`, `resolvers.py`, and `tests/`.
- Tests: co-located under each domain's `tests/` and each `graphql/<domain>/tests/` (mutations, benchmark, fixtures). Root `conftest.py` plus shared fixtures.
- Notable agent docs already in-repo: `saleor/graphql/AGENTS.md` (mirrors `graphql/CLAUDE.md`) and `.claude/skills/` (migration, pytest-runner, filter-benchmark, commit).

## GraphQL surface (the contract)
This repo EXPOSES the schema; dashboard and storefront are clients. Schema is assembled in code and serialized to a checked-in SDL file.

- Schema assembly: `saleor/graphql/api.py` composes one root `Query` and one root `Mutation` by multiple-inheritance of per-domain `*Queries` / `*Mutations` classes (Account, App, Attribute, Channel, Checkout, Core, Csv, Discount, GiftCard, Invoice, Menu, Meta, Order, Page, Payment, Plugins, Product, Shipping, Shop, Stock, Tax, Translation, Warehouse, Webhook), plus a `Subscription` root (webhook subscription payloads). Built via `build_federated_schema(...)` — Apollo Federation compatible.
- SDL artifact: `saleor/graphql/schema.graphql` (~38k lines) is the canonical, committed contract. Regenerate with `python manage.py get_graphql_schema` (poe `build-schema`) or `python manage.py graphql_schema --schema saleor/graphql/schema.graphql`. Keeping this file in sync is mandatory — CI diffs it (see below).
- Core types (all `implements Node & ObjectWithMetadata`, grouped by `@doc(category:)`): `Product`, `ProductVariant`, `ProductType`, `Category`, `Collection`, `Order`, `Checkout`, `User`, plus Channel, Warehouse/Stock, Shipping, Payment/Transaction, GiftCard, Discount/Promotion/Voucher, Page, Menu, Attribute, Webhook, App, Shop. Connections follow Relay (`*CountableConnection`), pagination capped at 100 (`GRAPHQL_PAGINATION_LIMIT`).
- Federation: `_entities(representations: [_Any!]!)` and `_Entity` union covering `App, PageType, Address, User, Group, ProductVariant, Product, ProductType, ProductMedia, Category, Collection, Order` — these are the federation-resolvable entities a gateway can stitch.
- Custom directives in the schema: `@doc(category:)` (grouping for changelog/docs) and `@webhookEventsInfo(asyncEvents, syncEvents)` (declares webhook events a field triggers). Field deprecation via standard `@deprecated`; new fields must carry `ADDED_IN_{VERSION}` in descriptions to drive the API changelog.
- Contract conventions enforced by repo guidance (`graphql/CLAUDE.md`): each mutation has its own dedicated error type/error-code enum (never shared); mutation input lists capped at 100; field permissions via `PermissionsField` / `Meta.permissions`; new limited fields must register a cost multiplier in `saleor/graphql/query_cost_map.py`.

## External dependencies & services
- Frameworks: Django 5.2, Graphene/`graphql-core` 2.x, `graphql-relay`, Celery (+ Redis and SQS/kombu), `django-filter`, `django-mptt` (category trees), `django-measurement`, `django-countries`, `django-phonenumber-field`, Pydantic 2 (complex input validation).
- Data/infra: PostgreSQL via `psycopg` 3 (primary/replica split through `saleor.core.db_routers.PrimaryReplicaRouter`); Redis for cache + Celery broker; OpenTelemetry (api/sdk/otlp) for tracing; Sentry for error reporting.
- Storage: pluggable media/static — local, AWS S3 (`django-storages`/boto3), Azure Blob, Google Cloud Storage.
- Payments / integrations: Stripe, Braintree, Razorpay, SendGrid (email), `authlib`/`oauthlib`/PyJWT (auth & external OIDC).
- Consumed BY (cross-repo): `saleor-dashboard` (admin client) and `storefront` (customer client) — both generate typed clients from this schema. Extensibility is via webhooks + Apps (iframe/OIDC), not in-process plugins.

## Env & configuration
All config is env-driven in `saleor/settings.py`. Key vars:
- `SECRET_KEY` (required, no default), `DATABASE_URL` (+ optional replica), `CACHE_URL`, `CELERY_BROKER_URL`, `EMAIL_URL`, `DEFAULT_FROM_EMAIL`.
- `ALLOWED_HOSTS` (default `localhost,127.0.0.1`), `ALLOWED_GRAPHQL_ORIGINS` (default `*` — CORS for the GraphQL endpoint; tighten in prod), `DASHBOARD_URL`.
- Auth/JWT: `RSA_PRIVATE_KEY` (signs JWTs; if unset, generated/managed by `JWT_MANAGER_PATH` = `saleor.core.jwt_manager.JWTManager`), `JWT_TTL_ACCESS` (5 min), `JWT_TTL_REFRESH` (30 days), `JWT_TTL_APP_ACCESS`. Public keys exposed at `/.well-known/jwks.json`.
- GraphQL limits: `GRAPHQL_PAGINATION_LIMIT=100`, `GRAPHQL_QUERY_MAX_COMPLEXITY`, `PLAYGROUND_ENABLED`.
- Multichannel: `DEFAULT_CHANNEL_SLUG` (default `default-channel`).
- Storage creds: AWS_*, GS_*, Azure (only when those backends are selected).
- Workspace note: in the local dockerized stack the API host port is 8001 (not Django's 8000); browser URLs and the product-image Site domain derive from it. The backend itself just reads `ALLOWED_HOSTS`/`Site` — the port mapping lives in the `dev/` overlay, not here.

## CI/CD & tests
- Tests: `pytest` (+ `pytest-django`, `pytest-asyncio`, `pytest-celery`, `pytest-xdist`, `pytest-socket`, `pytest-recording`/vcrpy, `pytest-memray`, `pytest-django-queries`). Run via `pytest --reuse-db` (poe `test`). Conventions in `saleor/CLAUDE.md`: given/when/then, fixtures over mocks (fixtures in `tests/fixtures/`), flat test functions, assert error messages and enum `.name` for codes.
- Lint/type: Ruff (config in pyproject), mypy + `django-stubs` + `pydantic.mypy`, `deptry` (dependency hygiene), `pre-commit`, and custom `.semgrep/` rules (Django/Celery correctness, security: no raw `requests`, logging hygiene, concurrent index migrations).
- GitHub Actions (`.github/workflows/`): `tests-and-linters.yml` (unit tests on Python 3.12 with Postgres 15 + Valkey/Redis services), `graphql-inspector.yml` + `.github/graphql-inspector.yaml` (diffs `schema.graphql` on any `**.graphql` change and flags breaking changes — requires `approved-breaking-change` label to merge), migration-perf and migration-compatibility checks, `e2e.yml`, `changelog-check.yml`, container publishing (`publish-containers.yml`, `publish-main.yml`), release automation (`release-it`/npm). `CODEOWNERS` and dependabot present.
- Build/deploy: `Dockerfile` (container image); `deployment/elasticbeanstalk/Dockerrun.aws.json` (AWS EB) (inferred from path). Dev devcontainer under `.devcontainer/`.

## Security & compliance notes
- Auth: JWT-based (RSA-signed). Two principal types — `User` (staff/customer) and `App` (service/integration tokens). External OIDC/OAuth supported via authlib plugins. JWKS published for token verification by clients/gateways.
- Authorization: permission-based (`saleor.permission` app, `MANAGE_*` permissions visible throughout the schema descriptions). Enforce via `PermissionsField` and mutation `Meta.permissions`; the contract guidance explicitly warns against manual permission checks in `perform_mutation` (can diverge from declared perms).
- Schema-contract risk: `schema.graphql` is the cross-repo source of truth. Any change to types/fields/operations can break dashboard or storefront; `graphql-inspector` gates breaking changes in CI, and `ADDED_IN_{VERSION}` annotations are required. Before declaring an API change done, verify whether dashboard/storefront consume the affected fields.
- CORS: `ALLOWED_GRAPHQL_ORIGINS` defaults to `*` — must be restricted in production. GraphQL Playground is enabled by default (`PLAYGROUND_ENABLED`) — disable in prod.
- Secrets: all sensitive values (SECRET_KEY, RSA_PRIVATE_KEY, DB, payment gateway keys, cloud storage creds) come from env vars; none committed (`.env.example` uses placeholders). `SECRET_KEY` has no default and will fail closed if unset.
- Concurrency/data-integrity (per `saleor/CLAUDE.md`): mandated patterns — `F()` atomic increments, `select_for_update` via per-app `lock_objects.py`, `update_or_create` for upserts, and `traced_atomic_transaction`. Search-index changes require dirty-marking data migrations. Webhook events must be dispatched through `call_event` (not direct manager calls). New filters require concurrently-added DB indexes.
- Requests are hardened (`requests-hardened`, plus a semgrep rule banning raw `requests`) to mitigate SSRF on outbound webhook/integration calls; `HTTP_IP_FILTER_*` settings gate loopback/internal IPs.

Key files: `saleor/graphql/api.py`, `saleor/graphql/schema.graphql`, `saleor/urls.py`, `saleor/settings.py`, `pyproject.toml`, `.github/graphql-inspector.yaml`, `saleor/graphql/CLAUDE.md`.
