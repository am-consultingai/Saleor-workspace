# storefront — architecture map

Saleor customer-facing shop. Next.js 16 (App Router, React 19, TypeScript, `type: module`), pnpm 10, Node 24. GraphQL **client** of the `saleor` backend.

## Structure

- `src/app/` — App Router routes (RSC by default; SSR/streaming, Partial Prerendering via `cacheComponents`).
  - `src/app/(storefront)/[channel]/(main)/` — the shop, scoped by **channel slug** segment: `page.tsx` (home), `products/`, `products/[slug]/` (PDP), `categories/[slug]/`, `collections/[slug]/`, `search/`, `cart/`, `pages/[slug]/` (CMS), `account/` (+ `orders/`, `addresses/`, `settings/`), `login/`, `signup/`, `orders/`. Each leaf has `page.tsx` (+ `loading.tsx`, optional `client.tsx`/`not-found.tsx`).
  - `src/app/(checkout)/checkout/` — separate route group for the checkout SPA host (`page.tsx`, `complete/page.tsx`, `checkout-session-loader.tsx`). Mountable standalone via `NEXT_PUBLIC_CHECKOUT_URL`.
  - `src/app/api/` — Route Handlers (BFF): `auth/{login,register,confirm-account,set-password,reset-password}`, `revalidate` (webhook/cache), `cache-info`, `og`, `og/route.tsx`.
  - `src/app/config.ts` — `ProductsPerPage=12`, `DefaultChannelSlug`.
- `src/checkout/` — self-contained checkout module: a **urql**-based React SPA (`checkout-app.tsx`, `views/`, `components/payment/stripe/...`, `lib/payment/...`) with its **own** GraphQL setup and codegen.
- `src/lib/` — server utilities: `graphql.ts` (the API client core), `auth/` (Saleor auth SDK + cookie token storage + BFF), `cache-manifest.ts` / `revalidate-tags.ts` / `cache-life-profiles*`, `catalog/`, `channels/`, `menus/`, `search/`, `images.ts`, `seo/`, `pricing.ts`, `api-auth.ts`.
- `src/gql/` — **auto-generated** storefront types (do not edit). `src/checkout/graphql/generated/` — auto-generated checkout types.
- `src/graphql/*.graphql` — storefront query/mutation/fragment source files.
- `src/session-bridge/` — shares checkout-session/cart state (cookies, URL params) between storefront and checkout deployments.
- `src/ui/`, `src/config/` — components and channel config. Tests are colocated `*.test.ts(x)` run by Vitest.
- Root: `next.config.js`, `.graphqlrc.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, `knip.config.ts`, `Dockerfile`, `docker-compose.yml`.

## GraphQL surface

This repo **consumes** Saleor's schema (it is a client). Two independent codegen pipelines, both pointed at the live schema via `NEXT_PUBLIC_SALEOR_API_URL`:

1. **Storefront** (`.graphqlrc.ts`): `@graphql-codegen` `client` preset, `documentMode: "string"` (`TypedDocumentString`), `strictScalars`, `fragmentMasking: false`. Sources `src/graphql/**/*.graphql` → `src/gql/`. Executed by hand-rolled fetch client in `src/lib/graphql.ts` (no Apollo/urql on the storefront side).
2. **Checkout** (`src/checkout/graphql/codegen.ts`): `typescript` + `typescript-operations` + `typescript-urql`, `documentMode: "graphQLTag"`. Sources `src/checkout/graphql/**/*.graphql` → `src/checkout/graphql/generated/`. Runs in-browser via **urql**.

Concrete operations defined (the cross-repo contract):
- Catalog/content (storefront): `ProductDetails`, `ProductList`, `ProductListPaginated`, `ProductListByCategory`, `ProductListByCollection`, `SearchProducts`, `CategoriesBySlug`, `PageGetBySlug`, `MenuGetBySlug`, `ChannelsList`; fragments `ProductListItem`, `VariantDetails`, `OrderDetails`, `AddressDetails`, `UserDetails`.
- Account/auth (storefront): `CurrentUser`, `CurrentUserProfile`, `CurrentUserOrderList`, `CurrentUserOrdersPaginated`, `OrderByNumber`, `AccountUpdate`, `AccountAddressCreate/Update/Delete`, `AccountSetDefaultAddress`, `AccountRequestDeletion`, `PasswordChange`. Raw (untyped) mutations in `api/auth/*` route handlers (e.g. `AccountRegister`).
- Cart (storefront): `CheckoutCreate`, `CheckoutFind`, `CheckoutAddLine`, `CheckoutLinesUpdate`, `CheckoutDeleteLines`, `CheckoutCustomerDetach`.
- Checkout module (`src/checkout/graphql/*.graphql`): full flow — `checkout`/`channel`/`order`/`addressValidationRules` queries; mutations `checkoutCreate`, `checkoutLinesAdd/Update`, `checkoutLineDelete`, `checkoutEmailUpdate`, `checkoutMetadataUpdate`, `checkoutCustomerAttach/Detach`, `checkoutShipping/BillingAddressUpdate`, `checkoutDeliveryMethodUpdate`, `deliveryOptionsCalculate`, `checkoutAddPromoCode`/`checkoutRemovePromoCode`, `checkoutComplete`, `paymentGatewaysInitialize`, `transactionInitialize`, `transactionProcess`; user mutations `userRegister`, `requestPasswordReset`, `userAddress*`. Key types: `Product`/`ProductVariant`, `Checkout`/`CheckoutLine`, `Order`/`OrderLine`, `Address`, `User`, `Channel`, `Menu`, `Page`, `Money`, `PaymentGateway`.

**Ripple risk:** any backend schema change to these types/fields (rename, nullability, removal, scalar change) breaks `pnpm generate` or typecheck here. Codegen and the `update_types.yml` workflow are the canaries — see CI below.

## External dependencies & services

- **Backend:** the `saleor` GraphQL API (only external service it talks to). Custom scalar map in both codegen configs (`Decimal`→number, `DateTime`→string, `Metadata`→`Record<string,string>`, etc.).
- **Auth:** `@saleor/auth-sdk` (JWT, cookie-backed token storage) — `src/lib/auth/server.ts`, `cookie-token-storage.ts`.
- **Payments:** Stripe (`@stripe/stripe-js`, `@stripe/react-stripe-js`) wired through Saleor's transaction/payment-gateway API; plus a dev-only "dummy payment". Publishable keys come from Saleor `paymentGatewayInitialize`, not env.
- **GraphQL clients:** `urql` (checkout SPA only), `graphql`/`graphql-tag`, `@graphql-typed-document-node/core`. Storefront pages use a bespoke `fetch` client.
- **UI/infra:** React 19, Tailwind 3 (+ forms/typography/container-queries), Radix UI, `embla-carousel`, `lucide-react`, `editorjs-html` + `xss` (CMS rich text), `sharp` (image), `@vercel/speed-insights`, `schema-dts` (JSON-LD SEO).
- **Depended on by:** none (leaf client). It is one of the two consumers of the shared schema alongside `saleor-dashboard`.

## Env & configuration

Defined in `.env.example`; dev values in `.env.local` (points at dockerized API on host port **8001**):
- `NEXT_PUBLIC_SALEOR_API_URL` (required, trailing slash) — the API endpoint; doubles as the codegen schema source. Dev: `http://localhost:8001/graphql/`.
- `NEXT_PUBLIC_DEFAULT_CHANNEL` (required) — fallback channel; `/` redirects here.
- `NEXT_PUBLIC_STOREFRONT_URL` — canonical/OG URLs.
- `STOREFRONT_CHANNELS` (allowlist, comma-separated) / `STOREFRONT_DISCOVER_CHANNELS` + `SALEOR_APP_TOKEN` (opt-in API discovery; app token also used for `channels` query via `executeAppGraphQL`).
- `NEXT_PUBLIC_CHECKOUT_URL` — split checkout deploy + redirect allowlist.
- `REVALIDATE_SECRET` (≥32 chars in prod) + `SALEOR_WEBHOOK_SECRET` (HMAC) — cache invalidation auth.
- Stripe/dummy toggles: `(NEXT_PUBLIC_)ENABLE_STRIPE_PAYMENTS`, `..._EXPRESS_CHECKOUT`, `(NEXT_PUBLIC_)ALLOW_DUMMY_PAYMENT`, `NEXT_PUBLIC_ENABLE_CHECKOUT_MARKETING_OPT_IN`.
- Tuning (read in `src/lib/graphql.ts`): `SALEOR_MAX_CONCURRENT_REQUESTS` (3), `SALEOR_MIN_REQUEST_DELAY_MS` (200), `SALEOR_REQUEST_TIMEOUT_MS` (15000), `NEXT_BUILD_RETRIES`.
- `NEXT_OUTPUT` (`standalone`|`export`) controls Next build mode for Docker; `NEXT_PUBLIC_IMAGE_UNOPTIMIZED` controls image optimization (see gotcha).

## CI/CD & tests

- **Tests:** Vitest (`pnpm test` / `test:run`); many colocated unit tests under `src/checkout/lib`, `src/lib/auth`, etc. No e2e framework found.
- **Quality gates:** ESLint 9 (`eslint-config-next`), `tsc --noEmit` (`typecheck`), `knip` (dead-code), Prettier + Tailwind plugin; Husky + lint-staged pre-commit.
- **Codegen is a build step:** `predev`/`prebuild` run `generate:all` (storefront + checkout) — a build requires a reachable schema (live URL, or `schema.graphql` file when `GITHUB_ACTION=generate-schema-from-file`).
- **Workflows** (`.github/workflows/`): `lint.yml` (runs on Vercel `deployment_status` success), `check-licenses.yaml`, and `update_types.yml` — **scheduled (workdays 18:00)**: fetches the latest `saleor/saleor` release's `schema.graphql`, runs `pnpm generate`, and opens a PR titled "Update schema to Saleor <tag>". This is the automated mechanism for absorbing backend schema changes.
- **Deploy:** Vercel (inferred from speed-insights, deployment-status trigger) and/or Docker (`Dockerfile`, `output: standalone`). No explicit deploy pipeline file in-repo.

## Security & compliance notes

- **Auth = Saleor JWT in cookies.** `src/lib/auth/server.ts` uses `@saleor/auth-sdk` with cookie token storage; `secure` only in production. Auth flows proxied through `src/app/api/auth/*` BFF route handlers (login/register/confirm/reset). `src/lib/graphql.ts` separates three auth modes: `executePublicGraphQL` (no header — catalog/menus/checkout-by-id, where the ID is the credential), `executeAuthenticatedGraphQL` (session JWT via `fetchWithAuth`), `executeAppGraphQL` (server-only `SALEOR_APP_TOKEN`). The app token must never reach the client.
- **Cache-invalidation endpoint** (`POST /api/revalidate`): verifies Saleor HMAC (`SALEOR_WEBHOOK_SECRET`) and/or `REVALIDATE_SECRET` via timing-safe compare (`src/lib/api-auth.ts`). Query-string `?secret=` is supported but deprecated/insecure. Warns if `REVALIDATE_SECRET` < 32 chars in prod.
- **Rich-text rendering** uses `xss` to sanitize EditorJS HTML from CMS pages — XSS surface if bypassed.
- **Rate limiting / resilience:** client-side `RequestQueue` (max 3 concurrent, 200ms spacing) + retry/backoff on 429/5xx in `src/lib/graphql.ts` to avoid hammering the API.
- **SSR / image-URL gotchas (highest-risk for changes):**
  - `next.config.js` `images.unoptimized` is gated on `NEXT_PUBLIC_IMAGE_UNOPTIMIZED`. In dockerized dev the Next image optimizer fetches sources server-side but **blocks private/loopback IPs**, while the only container-reachable route to the API is a private IP — so dev must skip optimization and let the browser load `localhost:<API_PORT>` image URLs directly. Image URLs derive from the API host/port (default **8001**, not 8000).
  - `images.remotePatterns` currently allows `hostname: "*"` (must be restricted in production).
  - Only WebP is enabled (AVIF disabled for LCP/cold-start reasons).
- **Channel routing:** `[channel]` segment is validated against an allowlist (`isAllowedStorefrontChannel`) in `src/app/(storefront)/[channel]/layout.tsx`; unknown channels 404. Enabling `STOREFRONT_DISCOVER_CHANNELS` exposes all active backend channels and requires `SALEOR_APP_TOKEN` — broadens the public surface (inferred).

Key files: `src/lib/graphql.ts`, `.graphqlrc.ts`, `src/checkout/graphql/codegen.ts`, `next.config.js`, `src/lib/api-auth.ts`, `src/app/api/revalidate/route.ts`, `src/lib/auth/server.ts`, `.github/workflows/update_types.yml`, `.env.example`.
