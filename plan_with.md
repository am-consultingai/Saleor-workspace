# Plan: Sustainability Label Feature

## Context

Merchandisers need to tag products with a sustainability label (None / Recycled / Organic / Fair Trade) and have that label appear as a badge on the storefront product page. The requirement of "typed enum (not free text)" rules out Saleor's existing flexible attribute system — which stores dropdown values as `AttributeValue` DB records and exposes them as plain strings, not as a schema-level enum. We need a first-class `CharField` on the `Product` model, following Saleor's own `ProductTypeKind` pattern.

---

## Repo 1: `saleor/` (backend)

### Files to change

**`saleor/product/__init__.py`** — add the choices class (matches the `ProductTypeKind` pattern used in the same file):
```python
class SustainabilityLabel:
    NONE = "none"
    RECYCLED = "recycled"
    ORGANIC = "organic"
    FAIR_TRADE = "fair_trade"
    CHOICES = [
        (NONE, "No sustainability label"),
        (RECYCLED, "Recycled materials"),
        (ORGANIC, "Organic"),
        (FAIR_TRADE, "Fair Trade"),
    ]
```

**`saleor/product/models.py`** — add field to `Product` model:
```python
sustainability_label = models.CharField(
    max_length=32,
    choices=SustainabilityLabel.CHOICES,
    default=SustainabilityLabel.NONE,
    db_default=SustainabilityLabel.NONE,
)
```

**`saleor/graphql/product/enums.py`** — register the GraphQL enum using the existing `to_enum()` utility (same pattern as `ProductTypeKindEnum` and `ProductMediaType` in this file):
```python
SustainabilityLabelEnum: Final[graphene.Enum] = to_enum(SustainabilityLabel)
SustainabilityLabelEnum.doc_category = DOC_CATEGORY_PRODUCTS
```
`to_enum()` maps DB values (lowercase, e.g. `"fair_trade"`) → GraphQL enum names (uppercase, e.g. `FAIR_TRADE`) via `str_to_enum(code.upper())`.

**`saleor/graphql/product/types/products.py`** — add to the `Product` GraphQL type (`ModelObjectType[models.Product]`):
```python
sustainability_label = SustainabilityLabelEnum(
    description="The sustainability label of this product.",
    required=True,
)
```
No resolver needed — `ModelObjectType` resolves it from the model field automatically.

**`saleor/graphql/product/mutations/product/product_create.py`** — add to `ProductInput` (shared by both `productCreate` and `productUpdate`):
```python
sustainability_label = SustainabilityLabelEnum(
    description="The sustainability label of this product."
)
```
`construct_instance` handles simple `CharField` inputs automatically; no `clean_input` override needed.

### Commands to run (inside the running stack)
```bash
# 1. Generate migration
docker compose exec api python manage.py makemigrations product -n product_sustainability_label

# 2. Apply migration
docker compose exec api python manage.py migrate

# 3. Regenerate the SDL artifact (canonical contract for all clients)
docker compose exec api python manage.py graphql_schema --out saleor/graphql/schema.graphql
```

The output `saleor/graphql/schema.graphql` is what the dashboard consumes.

---

## Repo 2: `saleor-dashboard/` (admin UI)

### Schema source — critical trap

The dashboard does **not** introspect the live API. It reads local files:
- `schema-main.graphql` — normally fetched from GitHub at the pinned `config.saleor_schemaVersion`
- `schema-staging.graphql` — same, from `main` branch

Running `pnpm run fetch-schema` would overwrite our changes with the published version. Instead, copy the locally regenerated schema:
```bash
# From saleor-dashboard/:
cp ../saleor/saleor/graphql/schema.graphql schema-main.graphql
cp ../saleor/saleor/graphql/schema.graphql schema-staging.graphql
```

### Files to change

**Product GraphQL fragment** — find the fragment that `ProductUpdatePage.tsx` uses (likely in `src/graphql/fragments/products.graphql` or `src/graphql/products.graphql`). Add `sustainabilityLabel` to the product fragment fields.

**Product update mutation** — find the `productUpdate` mutation `.graphql` file. Add `$sustainabilityLabel: SustainabilityLabelEnum` to the variables and `sustainabilityLabel: $sustainabilityLabel` to the `ProductInput` argument.

**`src/products/components/ProductUpdatePage/ProductUpdatePage.tsx`** — add a `<Select>` (or `<SingleAutocompleteSelectField>` following existing dashboard patterns) for sustainability label, wired into the form data and passed to the mutation handler.

### Codegen command
```bash
# From saleor-dashboard/:
pnpm run generate
```
Regenerates both `src/graphql/types.generated.ts` and `src/graphql/typesStaging.generated.ts` (plus hooks, fragment matchers, type policies). The TypeScript enum will use UPPER_CASE values (e.g. `SustainabilityLabelEnum.RECYCLED`).

---

## Repo 3: `storefront/` (customer shop)

### Schema source — critical trap

The storefront introspects from `NEXT_PUBLIC_SALEOR_API_URL` at codegen time — it hits the running API directly. If this points to a cloud instance (the default in `.env.example`), codegen silently generates types without `sustainabilityLabel`.

Verify `.env.local` contains:
```
NEXT_PUBLIC_SALEOR_API_URL=http://localhost:8001/graphql/
```
The API must be running before generating. Start it first: `./dev/dev.sh up`.

A second trap: `pnpm run dev` runs `pnpm run predev` first, which runs `pnpm run generate:all`. If the API is down, this fails silently or uses stale generated files.

### Files to change

**`src/graphql/ProductDetails.graphql`** — add `sustainabilityLabel` to the product query:
```graphql
product(slug: $slug, channel: $channel) {
  # ... existing fields ...
  sustainabilityLabel
}
```

**`src/app/(storefront)/[channel]/(main)/products/[slug]/page.tsx`** — import the generated enum and add the badge. The page already uses `ProductDetailsDocument` from `@/gql/graphql`. Add after the existing product metadata display:
```tsx
import { SustainabilityLabel } from "@/gql/graphql";

// In the render:
{product.sustainabilityLabel && product.sustainabilityLabel !== SustainabilityLabel.None && (
  <span className="inline-block px-2 py-1 text-sm font-medium bg-green-100 text-green-800 rounded">
    {{ [SustainabilityLabel.Recycled]: "Recycled",
       [SustainabilityLabel.Organic]: "Organic",
       [SustainabilityLabel.FairTrade]: "Fair Trade" }[product.sustainabilityLabel]}
  </span>
)}
```
Note: the storefront codegen generates PascalCase enum members (`FairTrade`, not `FAIR_TRADE`).

### Codegen command
```bash
# From storefront/ (API must be running at localhost:8001):
pnpm run generate:all
```
Regenerates `src/gql/graphql.ts` (main types) and `src/checkout/graphql/generated/` (checkout, uses `enumsAsTypes: true` — union types, not enums; not relevant here since sustainability is not in checkout).

---

## Silent failure summary

| Trap | Symptom | Fix |
|---|---|---|
| Running `pnpm run fetch-schema` in dashboard | Overwrites schema with pinned published version → `sustainabilityLabel` disappears from TS types | Copy from local schema file; never run fetch-schema during local dev |
| Storefront `NEXT_PUBLIC_SALEOR_API_URL` pointing to cloud | Codegen introspects cloud schema → field missing → TS error or runtime undefined | Set to `http://localhost:8001/graphql/` in `.env.local` |
| Storefront `pnpm run dev` before API is up | `predev` codegen hits dead endpoint → silently uses stale or empty types | Run `./dev/dev.sh up` first, wait for API healthcheck |
| Skipping `graphql_schema` management command | `schema.graphql` artifact stale → dashboard copy lacks the field | Always regenerate SDL after any schema-affecting backend change |
| Forgetting `schema-staging.graphql` in dashboard | `generate:staging` uses old schema → `typesStaging.generated.ts` stale; dashboard staging build breaks | Copy schema to both `schema-main.graphql` and `schema-staging.graphql` |
| `to_enum()` name mapping | DB stores `"fair_trade"` (lowercase); GraphQL sends `FAIR_TRADE` (uppercase); storefront TS uses `FairTrade` (PascalCase) | All handled automatically by `to_enum()` and codegen — just don't hardcode string literals in client code |

---

## Verification (end-to-end)

1. `./dev/dev.sh up` — confirm API, dashboard, storefront all running
2. GraphQL Playground at `http://localhost:8001/graphql/` — run `productUpdate(id: "...", input: { sustainabilityLabel: RECYCLED })` → expect `sustainabilityLabel: RECYCLED` in response
3. Query `product(id: "...")` → confirm `sustainabilityLabel` is returned
4. Dashboard at `http://localhost:9000/` → open a product → confirm sustainability label dropdown exists → change to "Organic" → save → confirm persisted on reload
5. Storefront at `http://localhost:3000/` → open that product → confirm "Organic" badge renders
6. Set label back to `None` in dashboard → confirm badge disappears on storefront
