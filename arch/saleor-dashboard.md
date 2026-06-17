# saleor-dashboard — architecture map

Admin SPA for Saleor commerce. React 18 + TypeScript, Apollo Client GraphQL consumer, bundled with Vite/SWC. Version 3.23.8, schema-pinned to Saleor `3.23`. Package manager: pnpm 10, Node 24. Pure **GraphQL client** of the `saleor` backend — it defines no schema of its own.

## Structure

Feature-based modules under `src/`. Each business domain is a self-contained folder following the same convention (`views/`, `components/`, `queries.ts`, `mutations.ts`, `urls.ts`, `fixtures.ts`, sometimes `hooks/`).

- **Entry point:** `src/index.tsx` — mounts `#dashboard-app`, builds the deep provider tree, and declares the top-level `<Switch>` of permission-gated `SectionRoute`s. All sections are `React.lazy`-loaded.
- **Feature modules** (`src/<domain>/`): `attributes`, `auth`, `categories`, `channels`, `collections`, `customers`, `discounts`, `extensions` (apps), `giftCards`, `modelTypes`, `modeling` (formerly pages/page-types), `orders`, `permissionGroups`, `productTypes`, `products`, `refundsSettings`, `shipping`, `siteSettings`, `staff`, `structures` (navigation menus), `taxes`, `translations`, `warehouses`, `welcomePage`, plus `search`/`searches`.
- **Shared UI:** `src/components/` (e.g. `AppLayout`, `Router`, `Sidebar`, `Savebar`, `Form`, `notifications`, `DevModePanel`, datagrid wrappers, `NavigatorSearch`, `ConditionalFilter`, `AddressEdit`, `SortableTree`).
- **GraphQL layer:** `src/graphql/` — Apollo client + all generated artifacts. Fragments centralized in `src/fragments/` (~30 shared fragment files by domain). `src/searches/` holds paginated search queries.
- **Auth:** `src/auth/` (AuthProvider, hooks) on top of `src/legacy-sdk/` (vendored Saleor auth SDK — `SaleorProvider`, `createSaleorClient`, `useAuth`/`useAuthState`, token storage).
- **Cross-cutting:** `src/config.ts` (runtime config accessors), `src/hooks/`, `src/utils/`, `src/services/` (e.g. `errorTracking` → Sentry), `src/containers/` (`AppState` reducer, `BackgroundTasks`).
- **Tests/tooling:** colocated `*.test.ts(x)` + `.stories.tsx`; E2E in `playwright/` (`playwright/.auth` caches auth state); lint rules in `lint/rules/`; build scripts in `scripts/`; agent helpers in `.claude/`.

## GraphQL surface

This repo is a pure **client** of the Saleor backend GraphQL API. It does **not** expose a schema. The contract is the Saleor schema file itself.

- **Codegen:** `@graphql-codegen` driven by `codegen-main.ts` (and `codegen-staging.ts` for multi-schema). Input documents: every `src/**/queries.ts`, `mutations.ts`, `src/fragments/*.ts`, `src/searches/*.ts`. Schema source: `schema-main.graphql` (and `schema-staging.graphql`), fetched via `pnpm run fetch-schema` (pinned `3.23` tag) or `fetch-local-schema` (live local instance).
- **Generated outputs in `src/graphql/`** (regenerate with `pnpm run generate`; runs automatically on `predev`/`prebuild`/`prestart`):
  - `types.generated.ts` — operation + input/enum types.
  - `hooks.generated.ts` — typed Apollo React hooks (`useXxxQuery`/`useXxxMutation`), wired to `@dashboard/hooks/graphql`.
  - `typePolicies.generated.ts` — typed cache `TypedTypePolicies`.
  - `fragmentTypes.generated.ts` — `possibleTypes` for union/interface cache resolution.
  - `fabbrica*.generated.ts` — typed test-data factories.
  - Parallel `*Staging.generated.ts` set for the staging schema.
- **Multi-schema support:** `FF_USE_STAGING_SCHEMA` feature flag selects between main (3.23) and staging (`main`) generated artifacts at runtime via `src/graphql/schemaVersion.ts`. A schema change in `saleor` requires `pnpm run fetch-schema` + `pnpm run generate` here.
- **Operations** are written as `gql` documents in per-feature `queries.ts`/`mutations.ts`; consumers import the generated hooks rather than raw documents.
- **Custom scalar mappings:** `Day`/`Hour`→number, `Date`→string, `JSON`→unknown, `JSONString`→string. `nonOptionalTypename: true`, `onlyOperationTypes: true`.
- **Contract types consumed** span the full admin domain: `Product`, `ProductVariant`, `ProductType`, `Order`, `OrderLine`, `Checkout`, `Category`, `Collection`, `Attribute`/`AttributeValue`, `Customer`/`User`, `GiftCard`, `Channel`, `Warehouse`, `ShippingZone`, `Voucher`/`Promotion` (discounts), `PermissionGroup`, `Staff`, `Shop`/site settings, `Tax*`, `App`/webhooks (extensions), translations, money types (`Money`, `TaxedMoney`, `Weight`).

## External dependencies & services

- **Backend:** Saleor GraphQL API — the single upstream service. Talked to over HTTP via Apollo Client. Sibling repos `saleor` (provides the schema) and `storefront` (parallel client) per workspace CLAUDE.md.
- **Core libs:** `@apollo/client` 3.4, `react`/`react-dom` 18.3, `react-router(-dom)` v5, `react-hook-form` + `zod`, `react-intl` 5 (i18n via FormatJS extraction), `@saleor/macaw-ui-next` (current design system; legacy `@saleor/macaw-ui` 0.7 still mounted — both theme providers during migration), `lucide-react` icons, `jotai` (atoms; primary state is React Context + `containers/AppState` reducer), `@glideapps/glide-data-grid` (list datagrids), `apollo-upload-client` (multipart file uploads), `@editorjs/*` (rich text), `@dnd-kit/*` (drag-drop), `@saleor/app-sdk` (extensions/apps).
- **Observability/analytics:** `@sentry/react` + Vite plugin, `posthog-js`, `react-gtm-module`.
- **Auth dependency:** vendored `src/legacy-sdk/` (forked Saleor SDK) provides JWT login/refresh; `jwt-decode` used directly.

## Env & configuration

Runtime config is injected into `window.__SALEOR_CONFIG__` (read in `src/config.ts`), not bundled — lets one build target different backends without rebuild.

- `API_URL` — GraphQL endpoint. Default `http://localhost:8000/graphql/`; may be relative, resolved via `getAbsoluteApiUrl()`. **NOTE:** the workspace dev overlay uses port **8001**, not 8000.
- `APP_MOUNT_URI` (default `/`), `STATIC_URL`, `IS_CLOUD_INSTANCE`, `SALEOR_CLOUD_APP_DOMAIN`, `EXTENSIONS_API_URL`, `LOCALE_CODE`, `FF_USE_STAGING_SCHEMA`.
- Build/analytics env (`process.env`): `GTM_ID`, `CUSTOM_VERSION`, `ENABLED_SERVICE_NAME_HEADER` (adds `source-service-name: saleor.dashboard` header), Sentry vars.
- E2E/Playwright env: `BASE_URL` (default `http://localhost:9000/`), `E2E_USER_NAME`/`_PASSWORD`, `MAILPITURL`. Dev server runs on port 9000.
- Schema version pinned in `package.json` `config.saleor.schemaVersion = "3.23"`. Template: `.env.template`.

## CI/CD & tests

- **Build:** `vite build` (SWC, manual vendor chunking, node polyfills, Sentry source-map upload). `prebuild` runs codegen. Dev: `pnpm run dev` (Vite, port 9000).
- **Test stacks:** **Jest** 27 (SWC transform, JSDOM) for unit/component (`pnpm test`, `test:ci` with Codecov); **Storybook 10 + Vitest** (`test-storybook`) with Chromatic visual regression; **Playwright** for E2E (`pnpm e2e`, grep `#e2e`). Custom lint-rule tests in `lint/rules/`.
- **CI (`.github/workflows/main.yml` "QA"):** on push/PR — `pnpm audit`, `check-types` (tsc + tsc-strict), `lint` (eslint + prettier) with uncommitted-diff gate, `test:ci`, Storybook tests, Chromatic. Also: `update-schema.yml` (auto-sync GraphQL schema), `knip.yml` (dead-code), `codeql-analysis.yml`, `dependency-check.yaml`, `check-licenses.yaml`, deploy + container-publishing pipelines. Releases use Changesets.

## Security & compliance notes

- **Auth:** JWT-based. `src/legacy-sdk/apollo/client.ts` (`createFetch`) handles access tokens via `storage.getAccessToken()`, auto-refresh (120s skew), retry-on-Unauthorized, and browser Credentials Management API integration. Supports both internal (password) and external (OAuth/SSO plugin) login flows (`useAuthProvider`). Tokens persisted in localStorage via the SDK.
- **Two Apollo clients** — the main app client (`src/graphql/client.ts`) and the legacy-sdk auth client (`saleorClient`) — intentionally do not share config ("DON'T TOUCH THIS"). Apollo link sends `credentials: "include"` (cookies) and the `source-service-name` header when enabled.
- **Authorization:** enforced backend-side; the dashboard reads `useUserPermissions`/`useUserAccessibleChannels` to gate UI — not a security boundary. Every route is wrapped in `SectionRoute` gated by `PermissionEnum` values from the API.
- **Secrets:** none committed; tokens live in browser storage. Backend URL and all runtime config externalized through `window.__SALEOR_CONFIG__`.
- **Cache correctness** depends on generated `possibleTypes`/`typePolicies`. Manual `typePolicies` overrides exist (`Money`/`TaxedMoney`/`Weight` `merge:false`, `Shop`/`App` keyless, `AttributeValue.slug` fallback) — schema changes to these types can silently break caching.
- **Generated files** (`src/graphql/*.generated.ts`) are committed and must never be hand-edited or hand-merged — regenerate after resolving source conflicts.

## Schema-change ripple risk (cross-repo)

1. `schema-main.graphql` must be refreshed (`fetch-schema` / `update-schema.yml`) and `config.saleor.schemaVersion` may need bumping.
2. `pnpm run generate` regenerates all `src/graphql/*.generated.ts`. Removed/renamed fields cause **compile-time** breaks — caught by CI `check-types`.
3. Non-type-breaking changes (nullability, enum values, new required inputs, union/interface membership) can pass tsc but break at runtime or in the cache — **not caught by CI**.
4. New required mutation inputs and `possibleTypes`/`typePolicies` shifts are the highest-risk silent failures.

Key files: `codegen-main.ts`, `src/graphql/client.ts`, `src/config.ts`, `src/auth/hooks/useAuthProvider.ts`, `src/legacy-sdk/apollo/client.ts`, `src/fragments/`, `.github/workflows/main.yml`, `.github/workflows/update-schema.yml`, `.env.template`.
