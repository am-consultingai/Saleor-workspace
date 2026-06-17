# storefront — architecture map

Saleor customer-facing shop. Next.js 16 (App Router, React 19, TypeScript, `type: module`), pnpm 10, Node 24. **Server-first:** all Saleor traffic goes through server-side `fetch` (no client GraphQL client except inside the checkout island). Pure **GraphQL client** of the `saleor` backend.

## Structure

Root config: `package.json`, `.graphqlrc.ts` (codegen), `.env.example`, `Dockerfile` (standalone Next output), `next`/`tailwind`/`postcss` configs, `skills/` (Paper storefront migration playbooks — docs only).

Code lives in `src/`:
- **`src/app/`** — App Router. Two route groups:
  - `(storefront)/[channel]/(main)/` — the shop, channel-scoped by URL segment: `page.tsx` (home), `products/[slug]/` (PDP), `categories/[slug]/`, `collections/[slug]/`, `search/`, `cart/`, `pages/[slug]/` (CMS), `account/` (+ `orders/`, `addresses/`, `settings/`), `login/`, `signup/`, `orders/`. Each leaf has `page.tsx` (+ `loading.tsx`, optional `client.tsx`/`not-found.tsx`). `src/app/page.tsx` redirects `/` to `NEXT_PUBLIC_DEFAULT_CHANNEL`.
  - `(checkout)/checkout/` — separate checkout shell (`page.tsx`, `complete/page.tsx`, `checkout-session-loader.tsx`). Mountable standalone via `NEXT_PUBLIC_CHECKOUT_URL`.
  - `src/app/api/` — Route Handlers (BFF): `auth/{login,register,confirm-account,set-password,reset-password}`, `revalidate` (Saleor webhook + manual cache purge), `cache-info`, `og`.
- **`src/checkout/`** — self-contained checkout module: own `graphql/` + own codegen → `graphql/generated/`, `components/` (incl. `payment/stripe/`), `hooks/`, `providers/`, `views/`. Uses **urql** client-side. Context providers: `CheckoutSession`, `CheckoutUser`, `CheckoutData`, `PaymentReturnError`.
- **`src/lib/`** — server logic: `graphql.ts` (the API client core), `auth/` (BFF + cookie sessions), `cache-manifest.ts` + `cache-life-profiles.ts` (caching/revalidation rules), `catalog/`, `menus/`, `channels/`, `search/`, `seo/`, `images.ts`, `pricing.ts`, `api-auth.ts`.
- **`src/gql/`** — auto-generated storefront types (do not edit). `src/checkout/graphql/generated/` — auto-generated checkout types.
- **`src/graphql/*.graphql`** — storefront query/mutation/fragment source files.
- **`src/session-bridge/`** — shares checkout-session/cart state (cookies, URL params) between storefront and checkout deployments.
- **`src/ui/`** — presentational components grouped by surface: `plp/`, `pdp/`, `cart/`, `nav/`, `account/`, `auth/`, Radix-based primitives.
- Tests are colocated `*.test.ts(x)` run by Vitest. Root: `next.config.js`, `.graphqlrc.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, `knip.config.ts`, `Dockerfile`, `docker-compose.yml`.

## GraphQL surface

This repo **consumes** Saleor's schema (it is a client). Two independent codegen pipelines, both pointed at `NEXT_PUBLIC_SALEOR_API_URL`:

1. **Storefront** (`.graphqlrc.ts`): `@graphql-codegen` `client` preset, `documentMode: "string"` (`TypedDocumentString`), `strictScalars`, `fragmentMasking: false`. Sources `src/graphql/**/*.graphql` → `src/gql/`. Executed by the bespoke `fetch` client in `src/lib/graphql.ts` (no Apollo/urql on the storefront side).
2. **Checkout** (`src/checkout/graphql/codegen.ts`): `typescript` + `typescript-operations` + `typescript-urql`, `documentMode: "graphQLTag"`. Sources `src/checkout/graphql/**/*.graphql` → `src/checkout/graphql/generated/`. Runs in-browser via **urql**.

Concrete operations / contract types:
- **Catalog/content:** `ProductDetails`, `ProductList(ByCategory|ByCollection|Paginated|Item)`, `SearchProducts`, `CategoriesBySlug`, `PageGetBySlug`, `MenuGetBySlug`, `ChannelsList`.
- **Account/auth:** `CurrentUser`, `CurrentUserProfile`, `CurrentUserOrderList`, `CurrentUserOrdersPaginated`, `OrderByNumber`, `AccountUpdate`, `AccountAddress*`, `AccountSetDefaultAddress`, `AccountRequestDeletion`, `PasswordChange`.
- **Cart:** `CheckoutCreate`, `CheckoutFind`, `CheckoutAddLine`, `CheckoutLinesUpdate`, `CheckoutDeleteLines`, `CheckoutCustomerDetach`.
- **Checkout module (`src/checkout/graphql/*.graphql`):** full flow — `checkout`/`channel`/`order`/`addressValidationRules` queries; mutations `checkoutCreate`, `checkoutLinesAdd/Update`, `checkoutLineDelete`, `checkoutEmailUpdate`, `checkoutMetadataUpdate`, `checkoutCustomerAttach/Detach`, `checkoutShipping/BillingAddressUpdate`, `checkoutDeliveryMethodUpdate`, `deliveryOptionsCalculate`, `checkoutAdd/RemovePromoCode`, `checkoutComplete`, `paymentGatewaysInitialize`, `transactionInitialize`, `transactionProcess`, user address mutations.
- **Key types in contract:** `Product`/`ProductVariant`/`Attribute`/`Category`/`Collection`, `Checkout`/`CheckoutLine`/`PaymentGateway`/`Money`, `Order`/`OrderLine`, `User`/`Address`/`AddressValidationData`, `Channel`, `Menu`, `Page`, `GiftCard`.
- **Webhook payloads consumed** (cache invalidation): `PRODUCT_UPDATED`, `PRODUCT_VARIANT_UPDATED`, `CATEGORY_UPDATED`, `COLLECTION_UPDATED`, `PAGE_UPDATED`, `MENU_ITEM_UPDATED`.

Schema changes in `saleor` break `pnpm generate` or typecheck here. `update_types.yml` is the canary.

## External dependencies & services

- **Backend:** `saleor` GraphQL API only. Custom scalar map: `Decimal`→number, `DateTime`→string, `Metadata`→`Record<string,string>`, etc.
- **Auth:** `@saleor/auth-sdk` (JWT, cookie-backed token storage) via `src/lib/auth/server.ts`, `cookie-token-storage.ts`.
- **Payments:** Stripe (`@stripe/stripe-js`, `@stripe/react-stripe-js`) wired through Saleor's transaction/payment-gateway API; dev-only dummy payment. Publishable keys come from Saleor `paymentGatewaysInitialize`, not env.
- **GraphQL clients:** `urql` (checkout SPA only), `graphql`/`graphql-tag`, `@graphql-typed-document-node/core`. Storefront pages use a bespoke `fetch` client with no heavy client library.
- **UI/infra:** React 19, Tailwind 3 (+ forms/typography/container-queries), Radix UI, `embla-carousel`, `lucide-react`, `editorjs-html` + `xss` (CMS rich text), `sharp` (image), `@vercel/speed-insights`, `schema-dts` (JSON-LD SEO).
- **Depended on by:** none (leaf client) alongside `saleor-dashboard`.

## Env & configuration

Defined in `.env.example`; dev values in `.env.local` (points at dockerized API on host port **8001**):
- `NEXT_PUBLIC_SALEOR_API_URL` (required, trailing slash) — the API endpoint; doubles as the codegen schema source. Dev: `http://localhost:8001/graphql/`.
- `NEXT_PUBLIC_DEFAULT_CHANNEL` (required) — fallback channel; `/` redirects here.
- `NEXT_PUBLIC_STOREFRONT_URL` — canonical/OG URLs.
- `STOREFRONT_CHANNELS` (allowlist) / `STOREFRONT_DISCOVER_CHANNELS` + `SALEOR_APP_TOKEN` (opt-in API discovery; app token also used for `channels` query via `executeAppGraphQL`).
- `NEXT_PUBLIC_CHECKOUT_URL` — split checkout deploy + redirect allowlist.
- `REVALIDATE_SECRET` (≥32 chars in prod) + `SALEOR_WEBHOOK_SECRET` (HMAC) — cache invalidation auth.
- Stripe/dummy toggles: `(NEXT_PUBLIC_)ENABLE_STRIPE_PAYMENTS`, `(NEXT_PUBLIC_)ALLOW_DUMMY_PAYMENT`, `NEXT_PUBLIC_ENABLE_CHECKOUT_MARKETING_OPT_IN`.
- Tuning (read in `src/lib/graphql.ts`): `SALEOR_MAX_CONCURRENT_REQUESTS` (3), `SALEOR_MIN_REQUEST_DELAY_MS` (200), `SALEOR_REQUEST_TIMEOUT_MS` (15000), `NEXT_BUILD_RETRIES`.
- `NEXT_OUTPUT` (`standalone`|`export`) controls Next build mode; `NEXT_PUBLIC_IMAGE_UNOPTIMIZED` controls image optimization (see gotcha below).

## Rendering patterns & state

- **RSC-first:** pages are async Server Components fetching via `executePublicGraphQL`. Data fetchers use the Next `"use cache"` directive + `applyCacheProfile(...)` from `src/lib/cache-manifest.ts` (per-type cache-life profiles + tag/path scheme). On-demand ISR — no `generateStaticParams` for products.
- **Cache invalidation** via `/api/revalidate` POST (Saleor webhook, HMAC-verified) and GET (manual, bearer-token), translating payloads to `revalidatePath`/`revalidateTag` per channel.
- **`Suspense` islands:** PDP splits static shell from dynamic gallery/variant sections that read `searchParams`.
- **`src/lib/graphql.ts` `executeGraphQL`** has three auth modes (`none`/`session`/`app`), a request queue (concurrency + min-delay throttle), retry-with-backoff on 429/5xx, timeout, and a `GraphQLResult<T>` ok/error union (does not throw).
- **State management:** no Redux/Zustand. Server state via RSC + server actions (`actions.ts` files). Client state via React Context — cart (`src/ui/components/cart/cart-context.tsx`), account. Cart/checkout identity flows through Saleor `Checkout` IDs (the ID is the credential for public reads).

## CI/CD & tests

- **Build:** `next build` (`prebuild` runs `generate:all`); Docker multi-stage → Next standalone, runs as non-root `nextjs` user.
- **Tests:** Vitest (`pnpm test` / `test:run`), colocated `*.test.ts(x)` (auth, cache-manifest, plp filters). `typecheck` = `tsc --noEmit`; lint = ESLint 9 (`eslint-config-next`); `knip` for dead-code; Husky + lint-staged pre-commit.
- **Workflows:** `lint.yml` (runs on Vercel `deployment_status` success), `check-licenses.yaml`, `update_types.yml` (scheduled, workdays 18:00 — fetches latest `saleor/saleor` release `schema.graphql`, regenerates types, opens PR "Update schema to Saleor <tag>").
- **Deploy:** Vercel (inferred from `@vercel/speed-insights` and `deployment_status` trigger) and/or Docker standalone.

## Security & compliance notes

- **Auth = BFF pattern.** `src/lib/auth/` signs in against Saleor via `@saleor/auth-sdk`; JWT tokens persist in **server-side cookies**, never exposed to client JS. Rate-limited (`auth-rate-limit.ts`); redirect URLs validated (`validate-redirect-url.ts`).
- **Three credential planes in `graphql.ts`:** anonymous public reads; customer session (cookie JWT via `fetchWithAuth`); `SALEOR_APP_TOKEN` (server-only env, never reaches client).
- **`/api/revalidate`** verifies Saleor HMAC (`saleor-signature`, timing-safe) or `REVALIDATE_SECRET` bearer token; warns if secret < 32 chars. CR/LF log-injection guard on webhook payloads.
- **Rich-text:** `xss()` sanitizes EditorJS HTML before `dangerouslySetInnerHTML` — XSS surface if bypassed.
- **Resilience:** `RequestQueue` (max 3 concurrent, 200ms spacing) + retry/backoff on 429/5xx.
- **SSR / image-URL gotchas (highest-risk for changes):**
  - In dockerized dev the Next image optimizer blocks private/loopback IPs, so `NEXT_PUBLIC_IMAGE_UNOPTIMIZED=true` is needed; browser loads image URLs directly from `localhost:8001`.
  - `images.remotePatterns` currently allows `hostname: "*"` — **must be restricted in production**.
  - AVIF disabled (WebP only) for LCP/cold-start reasons.
- **Channel routing:** `[channel]` segment is validated against an allowlist (`isAllowedStorefrontChannel`) in the layout — unknown channels 404. `STOREFRONT_DISCOVER_CHANNELS` requires `SALEOR_APP_TOKEN` and broadens the public surface.

Key files: `src/lib/graphql.ts`, `.graphqlrc.ts`, `src/checkout/graphql/codegen.ts`, `next.config.js`, `src/lib/api-auth.ts`, `src/app/api/revalidate/route.ts`, `src/lib/auth/server.ts`, `src/lib/cache-manifest.ts`, `src/checkout/checkout-app.tsx`, `.github/workflows/update_types.yml`, `.env.example`.
