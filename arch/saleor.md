# saleor — architecture map

Core Saleor commerce backend: a GraphQL-native, API-only, headless e-commerce platform. Python 3.12 / Django 5.2 / Graphene (`graphene <3.0`, `graphql-core` 2.x). It is the **schema-owning** side of the cross-repo contract consumed by `saleor-dashboard` and `storefront`. Version `3.24.0-a.0`.

## Structure

Monorepo Django project. Code lives under the inner `saleor/` package; project root holds tooling/config.

- **Entry points:**
  - `manage.py` — Django CLI.
  - `saleor/asgi.py` / `saleor/wsgi.py` — app servers; dev runs via `uvicorn saleor.asgi:application --reload`.
  - `saleor/urls.py` — HTTP routes. Single real API surface: `POST /graphql/` (`GraphQLView`, CSRF-exempt). Also: plugin webhook endpoints (`/plugins/...`), thumbnail/image serving, `/.well-known/jwks.json`.
  - `saleor/celeryconf.py` — Celery app; worker = `celery --app saleor.celeryconf:app worker`, beat scheduler via `saleor.schedulers.schedulers.DatabaseScheduler`.
- **Config:** `saleor/settings.py` (single large env-driven settings module), `.env.example`, `pyproject.toml` (deps + `poe` task runner), `Dockerfile`.
- **Domain apps** (each typically `models.py`, `migrations/`, `error_codes.py`, `events.py`, business logic): `account`, `app`, `attribute`, `channel`, `checkout`, `core`, `csv`, `discount`, `giftcard`, `graphql`, `invoice`, `menu`, `order`, `page`, `payment`, `permission`, `auth`, `plugins`, `product`, `schedulers`, `seo`, `shipping`, `site`, `tax`, `thumbnail`, `warehouse`, `webhook`. The domain/business layer (models, DB, services) is separate from the API layer.
- **GraphQL/API layer:** `saleor/graphql/` — one subpackage per domain (e.g. `graphql/product/`, `graphql/order/`, `graphql/checkout/`), each with `schema.py` (Queries/Mutations), `types/`, `mutations/`, `bulk_mutations/`, `filters.py`, `sorters.py`, `dataloaders.py`, `enums.py`, `resolvers.py`, and `tests/`. CLAUDE.md guidance at `saleor/graphql/CLAUDE.md`.
- **Plugins:** `saleor/plugins/` holds built-in integrations — payment gateways (`braintree`, `razorpay`, `stripe`, `dummy`), `avatax` (tax), `openid_connect` (auth), email backends (`sendgrid`, `user_email`, `admin_email`).
- **Tests:** co-located under each domain's `tests/` and `graphql/<domain>/tests/`. Root `conftest.py` + shared fixtures under `tests/fixtures/`. E2E suite in `saleor/tests/e2e/` (account, checkout, orders, product, payment, taxes, vouchers).
- **Agent docs:** `saleor/graphql/AGENTS.md` (mirrors `graphql/CLAUDE.md`) and `.claude/skills/` (migration, pytest-runner, filter-benchmark, commit).

## GraphQL surface (the contract)

This repo **EXPOSES** the schema; dashboard and storefront are clients. Schema is assembled in code and serialized to a checked-in SDL file.

- **Schema assembly:** `saleor/graphql/api.py` composes one root `Query` and one root `Mutation` by multiple-inheritance of per-domain `*Queries` / `*Mutations` classes (Account, App, Attribute, Channel, Checkout, Core, Csv, Discount, GiftCard, Invoice, Menu, Meta, Order, Page, Payment, Plugins, Product, Shipping, Shop, Stock, Tax, Translation, Warehouse, Webhook), plus a `Subscription` root (`webhook/subscription_types.py`; subscription queries are how Apps subscribe to webhook event payloads). Built via `build_federated_schema(...)` — Apollo Federation compatible.
- **SDL artifact:** `saleor/graphql/schema.graphql` (~38k lines) is the canonical committed contract. Regenerate with `python manage.py get_graphql_schema` (poe `build-schema`) or `python manage.py graphql_schema --schema saleor/graphql/schema.graphql`. **Keeping this in sync is mandatory — CI diffs it.**
- **Core types** (all `implements Node & ObjectWithMetadata`, grouped by `@doc(category:)`): `Product`, `ProductVariant`, `ProductType`, `Category`, `Collection`, `Order`, `Checkout`, `User`, plus `Channel`, `Warehouse`/`Stock`, `Shipping`, `Payment`/`TransactionItem`, `GiftCard`, `Discount`/`Promotion`/`Voucher`, `Page`, `Menu`, `Attribute`, `Webhook`, `App`, `Shop`. Connections follow Relay (`*CountableConnection`), pagination capped at 100 (`GRAPHQL_PAGINATION_LIMIT`).
- **Federation:** `_entities(representations: [_Any!]!)` and `_Entity` union covering `App`, `PageType`, `Address`, `User`, `Group`, `ProductVariant`, `Product`, `ProductType`, `ProductMedia`, `Category`, `Collection`, `Order`.
- **Custom directives:** `@doc(category:)` (grouping for changelog/docs) and `@webhookEventsInfo(asyncEvents, syncEvents)` (declares webhook events a field triggers). New fields must carry `ADDED_IN_{VERSION}`.
- **Contract conventions** (`graphql/CLAUDE.md`): each mutation has its own dedicated error type/enum (never shared); mutation input lists capped at 100; permissions via `PermissionsField` / `Meta.permissions`; new costly fields must register in `saleor/graphql/query_cost_map.py`; field usage monitored by `monitor_fields_usage`.

## External dependencies & services

- **Frameworks:** Django 5.2, Graphene/`graphql-core` 2.x, `graphql-relay`, Celery (+ Redis and SQS/kombu backends), `django-filter`, `django-mptt` (category trees), `django-measurement`, `django-countries`, `django-phonenumber-field`, Pydantic 2 (complex input validation).
- **Data/infra:** PostgreSQL via `psycopg` 3 (primary/replica split via `saleor.core.db_routers.PrimaryReplicaRouter`); Redis for cache + Celery broker; full OpenTelemetry stack (`saleor/core/telemetry/`); Sentry for error reporting.
- **Storage:** pluggable — local, AWS S3 (`django-storages`/boto3), Azure Blob, Google Cloud Storage.
- **Payments/integrations:** Stripe, Braintree, Razorpay, SendGrid (email), `authlib`/`oauthlib`/PyJWT (auth + external OIDC).
- **Outbound HTTP** hardened via `requests-hardened` + custom semgrep rule banning raw `requests` (SSRF mitigation).
- **Consumed BY:** `saleor-dashboard` (admin client) and `storefront` (customer client) — both generate typed clients from this schema. Extensibility via webhooks + Apps (iframe/OIDC), not in-process plugins.

## Env & configuration

All config is env-driven in `saleor/settings.py`. Key vars:
- `SECRET_KEY` (required; no default — fails closed if unset), `DATABASE_URL` (+ optional `DATABASE_URL_REPLICA`), `CACHE_URL`, `CELERY_BROKER_URL` (empty → `CELERY_TASK_ALWAYS_EAGER`), `EMAIL_URL`, `DEFAULT_FROM_EMAIL`.
- `ALLOWED_HOSTS` (default `localhost,127.0.0.1`), `ALLOWED_CLIENT_HOSTS` (required when not DEBUG), `ALLOWED_GRAPHQL_ORIGINS` (default `*` — tighten in prod), `DASHBOARD_URL`.
- **Auth/JWT:** `RSA_PRIVATE_KEY` (signs JWTs; if unset, managed by `JWT_MANAGER_PATH` = `saleor.core.jwt_manager.JWTManager`), `JWT_TTL_ACCESS` (5 min), `JWT_TTL_REFRESH` (30 days), `JWT_TTL_APP_ACCESS`. Public keys at `/.well-known/jwks.json`.
- **GraphQL limits:** `GRAPHQL_PAGINATION_LIMIT=100`, `GRAPHQL_QUERY_MAX_COMPLEXITY`, `PLAYGROUND_ENABLED` (disable in prod).
- **Multichannel:** `DEFAULT_CHANNEL_SLUG=default-channel`.
- **Storage creds:** `AWS_*`, `GS_*`, Azure (selected via `MEDIA_URL` pattern).
- **Workspace note:** in the local dockerized stack the API host port is **8001** (not 8000); this is set by the `dev/docker-compose.dev.yml` overlay, not by backend config. `ALLOWED_HOSTS` and the `Site` domain must match.

## CI/CD & tests

- **Tests:** `pytest` (+ `pytest-django`, `pytest-asyncio`, `pytest-celery`, `pytest-xdist`, `pytest-socket`, `pytest-recording`/vcrpy, `pytest-memray`, `pytest-django-queries`). Run via `pytest --reuse-db` (poe `test`). Conventions (`saleor/CLAUDE.md`): given/when/then, fixtures over mocks, flat test functions, assert error messages and enum `.name` for codes.
- **Lint/type:** Ruff (config in `pyproject.toml`), mypy + `django-stubs` + `pydantic.mypy`, `deptry`, `pre-commit`, custom `.semgrep/` rules (Django/Celery correctness, security: no raw `requests`, logging hygiene, concurrent index migrations).
- **GitHub Actions:** `tests-and-linters.yml` (unit tests on Python 3.12 with Postgres 15 + Valkey), `graphql-inspector.yml` + `.github/graphql-inspector.yaml` (**diffs `schema.graphql` on any `**.graphql` change; flags breaking changes; requires `approved-breaking-change` label to merge**), migration-perf + compatibility checks, `e2e.yml`, `changelog-check.yml`, container publishing, release automation (`release-it`).
- **Build/deploy:** `Dockerfile` (container image); `deployment/elasticbeanstalk/Dockerrun.aws.json` (AWS EB). Dev devcontainer under `.devcontainer/`.

## Security & compliance notes

- **Auth:** JWT-based (RSA-signed). Two principal types — `User` (staff/customer) and `App` (service/integration tokens). External OIDC/OAuth supported via authlib plugins. JWKS published at `/.well-known/jwks.json`.
- **Authorization:** permission-based (`saleor.permission` app, `MANAGE_*` permissions). Enforced via `PermissionsField` and mutation `Meta.permissions` — **never hand-roll checks in `perform_mutation`** (can diverge from declared perms).
- **Schema-contract risk:** `schema.graphql` is the cross-repo source of truth. `graphql-inspector` gates breaking changes in CI. Before declaring an API change done, verify whether dashboard/storefront consume the affected fields. `ADDED_IN_{VERSION}` annotations required for new fields.
- **CORS/security defaults:** `ALLOWED_GRAPHQL_ORIGINS=*` and `PLAYGROUND_ENABLED=True` are dev defaults; both must be restricted in production.
- **Secrets:** all sensitive values (SECRET_KEY, RSA_PRIVATE_KEY, DB, payment keys, cloud storage creds) from env vars; none committed.
- **Concurrency/data-integrity** (per `saleor/CLAUDE.md`): mandatory patterns — `F()` atomic increments, `select_for_update` via per-app `lock_objects.py`, `update_or_create` for upserts, `traced_atomic_transaction`. Search-index changes require dirty-marking data migrations. Webhook events must be dispatched through `call_event` (not direct manager calls). New filters require concurrently-added DB indexes.
- **SSRF mitigation:** outbound HTTP hardened via `requests-hardened` + semgrep rule; `HTTP_IP_FILTER_*` settings gate loopback/internal IPs on incoming webhook calls.

Key files: `saleor/graphql/api.py`, `saleor/graphql/schema.graphql`, `saleor/urls.py`, `saleor/settings.py`, `saleor/celeryconf.py`, `pyproject.toml`, `saleor/core/auth_backend.py`, `saleor/graphql/CLAUDE.md`, `.github/graphql-inspector.yaml`.
