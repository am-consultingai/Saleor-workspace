# saleor-dashboard — architecture map

Admin SPA for Saleor commerce. React 18 + TypeScript, Apollo Client GraphQL consumer, bundled with Vite. Version 3.23.8, schema-pinned to Saleor `3.23`. Package manager: pnpm 10, Node 24.

## Structure

Feature-based modules under `src/`. Each business domain is a self-contained folder following the same convention (`views/`, `components/`, `queries.ts`, `mutations.ts`, `urls.ts`, `fixtures.ts`, sometimes `hooks/`).

- Entry point: `src/index.tsx` (referenced as `main` in package.json); HTML shell `src/index.html`.
- Feature modules (one dir each, all confirmed to ship `queries.ts`): `attributes`, `auth`, `categories`, `channels`, `collections`, `customers`, `discounts`, `extensions` (apps), `giftCards`, `modelTypes`, `modeling`, `orders`, `permissionGroups`, `productTypes`, `products`, `refundsSettings`, `shipping`, `siteSettings`, `staff`, `structures`, `taxes`, `translations`, `warehouses`, `welcomePage`, plus `search`/`searches`.
- Shared UI: `src/components/` (e.g. `Shop`, `NavigatorSearch`, `ConditionalFilter`, `AddressEdit`, `SortableTree`).
- GraphQL layer: `src/graphql/` — Apollo client + all generated artifacts.
- Auth: `src/auth/` (AuthProvider, hooks) on top of `src/legacy-sdk/` (vendored Saleor auth SDK).
- Cross-cutting: `src/config.ts` (runtime config accessors), `src/hooks/`, `src/utils/`, `src/services/`, `src/containers/`.
- Tests/tooling: colocated `*.test.ts(x)` + `.stories.tsx`; E2E in `playwright/`; lint rules in `lint/rules/`; build scripts in `scripts/`; agent helpers in `.claude/`.

## GraphQL surface

This repo is a pure **client** of the Saleor backend GraphQL API. It does **not** expose a schema. The contract is the Saleor schema file itself.

- Codegen: `@graphql-codegen` driven by `codegen-main.ts` (and `codegen-staging.ts` for multi-schema). Input documents are every `src/**/queries.ts`, `src/**/mutations.ts`, `src/**/fragments/*.ts`, and `src/searches/*.ts`. Schema source is `schema-main.graphql` (and `schema-staging.graphql`), fetched via `pnpm run fetch-schema` (raw GitHub for the pinned `3.23` tag) or `fetch-local-schema` (live local instance).
- Generated outputs in `src/graphql/` (regenerate with `pnpm run generate`; runs automatically on `predev`/`prebuild`/`prestart`):
  - `types.generated.ts` — operation + input types (`typescript` + `typescript-operations`).
  - `hooks.generated.ts` — typed Apollo React hooks (`useXxxQuery`/`useXxxMutation`), importing hooks from `@dashboard/hooks/graphql`.
  - `typePolicies.generated.ts` — typed cache `TypedTypePolicies`.
  - `fragmentTypes.generated.ts` — `possibleTypes` for union/interface cache resolution.
  - `fabbrica*.generated.ts` — typed test-data factories.
  - Parallel `*Staging.generated.ts` set for the staging schema.
- Operations are written as `gql` documents in per-feature `queries.ts`/`mutations.ts`; consumers import the generated hooks rather than raw documents.
- Concrete contract types consumed span the full admin domain: `Product`, `ProductVariant`, `ProductType`, `Order`, `OrderLine`, `Checkout`, `Category`, `Collection`, `Attribute`/`AttributeValue`, `Customer`/`User`, `GiftCard`, `Channel`, `Warehouse`, `ShippingZone`, `Voucher`/`Promotion` (discounts), `PermissionGroup`, `Staff`, `Shop`/site settings, `Tax*`, `App`/webhooks (extensions), translations, money types (`Money`, `TaxedMoney`, `Weight`).
- Custom scalar mappings (codegen config): `Day`/`Hour`→number, `Date`→string, `JSON`→unknown, `JSONString`→string. `nonOptionalTypename: true`, `onlyOperationTypes: true`.

## External dependencies & services

- Backend: Saleor GraphQL API — the single upstream service. Talked to over HTTP via Apollo Client. Sibling repos `saleor` (provides the schema) and `storefront` (parallel client) per workspace CLAUDE.md.
- Core libs: `@apollo/client` 3.4, `react`/`react-dom` 18.3, `react-router(-dom)` v5, `react-hook-form` + `zod`, `react-intl` 5 (i18n via FormatJS extraction), `@saleor/macaw-ui-next` (design system; legacy `@saleor/macaw-ui` deprecated), `lucide-react` icons, `jotai` (atoms), `@glideapps/glide-data-grid` (datagrids), `apollo-upload-client` (file uploads), `editorjs` (rich text), `graphiql` (built-in API explorer), `@saleor/app-sdk` (extensions/apps).
- Observability/analytics: `@sentry/react` (prod error tracking), `posthog-js`, `react-gtm-module`.
- Auth dependency: vendored `src/legacy-sdk/` (a bundled Saleor SDK) provides JWT login/refresh; `jwt-decode` used directly.

## Env & configuration

- Runtime config is injected into `window.__SALEOR_CONFIG__` (read in `src/config.ts`), not hardcoded — lets one build target different backends.
- `API_URL` — GraphQL endpoint (default `http://localhost:8000/graphql/`; may be relative, resolved against dashboard origin via `getAbsoluteApiUrl`). NOTE: the surrounding workspace runs the API on port **8001** (dev override), so the `.env.template` default of 8000 is not the workspace dev value.
- Other config keys: `APP_MOUNT_URI`, `STATIC_URL`, `IS_CLOUD_INSTANCE`, `SALEOR_CLOUD_APP_DOMAIN`, `EXTENSIONS_API_URL`, `LOCALE_CODE`.
- `FF_USE_STAGING_SCHEMA` feature flag switches between main/staging generated artifacts (`isStagingSchema()` in client/cache wiring). Same `API_URL` regardless of schema version.
- E2E/Playwright env: `BASE_URL` (default `http://localhost:9000/`), `E2E_USER_*`, `MAILPITURL`. Dev server runs on port 9000 (per CLAUDE.md), browser-bound via `vite --host`.
- Schema version pinned in `package.json` `config.saleor.schemaVersion = "3.23"`.

## CI/CD & tests

- Build: `vite build` (SWC, manual vendor chunking, node polyfills, Sentry source-map upload). `prebuild` runs codegen.
- Dev: `pnpm run dev` (Vite, port 9000). Containerized dev via `.devcontainer/` and the workspace `saleor-platform` compose overlay.
- Test stacks: **Jest** (SWC transform, JSDOM) for unit/component (`pnpm test`, `test:ci` with coverage); **Storybook 10 + Vitest** (`test-storybook`) with Chromatic visual regression; **Playwright** for E2E (`pnpm e2e`, grep `#e2e`). Custom lint-rule tests in `lint/rules/`.
- CI (`.github/workflows/main.yml`, "QA"): on push to `main` + PRs — `pnpm audit`, `check-types` (tsc + tsc-strict), `lint` (eslint + prettier) with uncommitted-diff gate, `test:ci` (Codecov), translation-message extraction diff gate, Storybook tests (in Playwright container, Codecov), Chromatic.
- Other workflows: `update-schema.yml` (auto-sync GraphQL schema), `knip.yml` (dead-code), `codeql-analysis.yml`, `dependency-check.yaml`, `check-licenses.yaml`, plus several deploy pipelines (`deploy-dev`, `deploy-staging-and-prepare-release`, `deploy-master-staging`, `deploy-cloud`) and container publishing (`publish-containers.yml`). Releases use Changesets.

## Security & compliance notes

- Auth: JWT-based. `src/legacy-sdk/apollo/client.ts` (`createFetch`) handles access tokens via `storage.getAccessToken()`, auto-refresh (default skew 120s) and retry-on-Unauthorized; supports both internal (password) and external (OAuth/SSO plugin) login flows (`useAuthProvider`). Optionally integrates the browser Credentials Management API.
- Apollo link sends `credentials: "include"` (cookies) and tags requests with `source-service-name: saleor.dashboard` when enabled. There are **two** Apollo clients — the main app client (`src/graphql/client.ts`) and the legacy-sdk auth client — they intentionally do not share config ("DON'T TOUCH THIS").
- Secrets: none committed; tokens live in browser storage, CI secrets via GitHub Actions (`CODECOV_TOKEN`, `CHROMATIC_PROJECT_TOKEN`, Sentry). Backend URL and all runtime config are externalized through `window.__SALEOR_CONFIG__`.
- Authorization is enforced backend-side; the dashboard reads user permissions/accessible channels (`useUserPermissions`, `useUserAccessibleChannels`) to gate UI only — not a security boundary.
- Cache correctness depends on generated `possibleTypes`/`typePolicies`; manual `typePolicies` overrides exist (`Money`/`TaxedMoney`/`Weight` `merge:false`, `Shop`/`App` keyless, `AttributeValue.slug` fallback) — schema changes to these types can silently break caching.

## Schema-change ripple risk (cross-repo)

This is the primary risk surface. A schema change in the `saleor` backend propagates here as follows:
1. `schema-main.graphql` must be refreshed (`fetch-schema` / `update-schema.yml`) and `config.saleor.schemaVersion` may need bumping.
2. `pnpm run generate` regenerates all `src/graphql/*.generated.ts`. Removed/renamed fields cause **compile-time** breaks in feature `queries.ts`/`mutations.ts` and generated hooks — caught by CI `check-types`. This is the safety net for breaking changes.
3. Non-type-breaking changes (e.g. a field becoming nullable, enum value changes, new required input args, union/interface membership changes) can pass tsc but break at runtime or in the cache — not caught by CI. New required mutation inputs and `possibleTypes`/`typePolicies` shifts are the highest-risk silent failures.
4. Generated files must never be hand-edited or hand-merged (regenerate after resolving source conflicts).

Relevant files: `codegen-main.ts`, `src/graphql/client.ts`, `src/config.ts`, `src/auth/hooks/useAuthProvider.ts`, `src/legacy-sdk/apollo/client.ts`, `.github/workflows/main.yml`, `.github/workflows/update-schema.yml`, `.env.template`.
