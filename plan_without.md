# Plan: Sustainability Label Feature

## Context

Merchandisers need to mark products with a sustainability certification. The label is a fixed four-value enum (None / Recycled / Organic / Fair Trade), stored per product, surfaced as a typed GraphQL enum, and rendered as a badge on the storefront PDP. The feature is end-to-end: DB → API → Dashboard UI → Storefront badge.

---

## Repos and Roles

| Repo | Role |
|---|---|
| `saleor/` | Django backend + Graphene GraphQL API. Source of truth for schema. |
| `saleor-dashboard/` | React SPA (Apollo Client). Merchandiser UI. Reads from a **local** schema snapshot (`schema-main.graphql`). |
| `storefront/` | Next.js app. Customer-facing PDP. Reads schema from a **live API URL** at codegen time (or a local file via env-var trick). |

---

## Every File Touched and Why

### 1. Backend — `saleor/`

**`saleor/saleor/product/__init__.py`**
Add `SustainabilityLabel` Python class with CHOICES tuple — the same pattern already used for `ProductTypeKind` and `ProductMediaTypes` in the same file.

```python
class SustainabilityLabel:
    NONE = "none"
    RECYCLED = "recycled"
    ORGANIC = "organic"
    FAIR_TRADE = "fair_trade"

    CHOICES = [
        (NONE, "No sustainability label"),
        (RECYCLED, "Made from recycled materials"),
        (ORGANIC, "Certified organic"),
        (FAIR_TRADE, "Fair Trade certified"),
    ]
```

**`saleor/saleor/product/models.py`** (Product class, ~line 213 after `rating`)
Add a `CharField` using the CHOICES pattern already used on `ProductMedia.type`:

```python
sustainability_label = models.CharField(
    max_length=32,
    choices=SustainabilityLabel.CHOICES,
    default=SustainabilityLabel.NONE,
    blank=True,
)
```

**`saleor/saleor/product/migrations/0206_product_sustainability_label.py`**
New migration — `migrations.AddField` on `product.Product`. The field has a default so it is non-destructive against live data.

**`saleor/saleor/graphql/product/enums.py`**
Add `SustainabilityLabelEnum` using `BaseEnum` (the same pattern as `StockAvailability` etc. already in this file):

```python
from ...product import SustainabilityLabel

class SustainabilityLabelEnum(BaseEnum):
    NONE = "none"
    RECYCLED = "recycled"
    ORGANIC = "organic"
    FAIR_TRADE = "fair_trade"

    class Meta:
        doc_category = DOC_CATEGORY_PRODUCTS
```

**`saleor/saleor/graphql/product/types/products.py`**
Add `sustainability_label` field on the `Product` GraphQL type. Annotate with `ADDED_IN_324` (that constant already exists in `saleor/graphql/core/descriptions.py`):

```python
sustainability_label = graphene.Field(
    SustainabilityLabelEnum,
    description="Sustainability certification label for this product." + ADDED_IN_324,
)

@staticmethod
def resolve_sustainability_label(root: models.Product, _info):
    return root.sustainability_label
```

**`saleor/saleor/graphql/product/mutations/product/product_create.py`** (`ProductInput` class)
Add to `ProductInput` (shared by both Create and Update mutations via `ProductCreateInput` subclass):

```python
sustainability_label = SustainabilityLabelEnum(
    description="Sustainability certification label." + ADDED_IN_324,
)
```

**`saleor/saleor/graphql/product/mutations/product/product_update.py`** (or the shared cleaner/`perform_mutation`)
The mutation already reads `input` dict and calls `instance.save()`. Confirm `sustainability_label` is forwarded — check `product_cleaner.py` or `perform_mutation` to ensure the new field is not excluded from the model update (Saleor's `ModelMutation` typically auto-maps input fields to model fields by name, so this may be zero extra code; verify before assuming).

**`saleor/saleor/graphql/schema.graphql`** — REGENERATED, not edited directly.
Command (run from `saleor/` directory, inside the virtualenv):
```
python manage.py graphql_schema --schema saleor/graphql/schema.graphql
```

---

### 2. Dashboard — `saleor-dashboard/`

**`saleor-dashboard/schema-main.graphql`** — REPLACED.
**Do NOT run `pnpm run fetch-schema`** — that curl command fetches from `https://raw.githubusercontent.com/saleor/saleor/3.23/…`, which is the published 3.23 schema and does not contain the new field. Instead copy the freshly generated backend schema:

```bash
cp ../saleor/saleor/graphql/schema.graphql schema-main.graphql
```

Alternatively, with the local API running: `pnpm run fetch-local-schema` introspects `API_URL` and writes through the `schema.graphql` symlink to `schema-main.graphql`.

**`saleor-dashboard/src/fragments/products.ts`** — `Product` fragment (line 197)
Add `sustainabilityLabel` to the fragment body so the dashboard query fetches it:

```graphql
sustainabilityLabel
```

**`saleor-dashboard/src/products/mutations.ts`** — `productUpdateMutation`
The mutation already sends `input: ProductInput!`. No change to the mutation string is required — `sustainability_label` is part of `ProductInput` in the schema. What's needed is passing the value from the form state into the `input` object in the submit handler.

**`saleor-dashboard/src/products/views/ProductUpdate/ProductUpdate.tsx`** (submit handler)
Wire the form field value into the `ProductInput` when calling `productUpdate`:

```ts
sustainabilityLabel: formData.sustainabilityLabel,
```

**`saleor-dashboard/src/products/components/ProductOrganization/`** (or `ProductDetailsForm`)
Add a `<Select>` / `<SingleAutocompleteSelectField>` for the sustainability label. Options come from `SustainabilityLabelEnum` values. Use `@saleor/macaw-ui-next` `Select` component (not legacy macaw). Add `react-intl` message IDs for each label string.

**`saleor-dashboard/src/graphql/types.generated.ts` et al.** — REGENERATED:
```bash
pnpm run generate:main
```

---

### 3. Storefront — `storefront/`

**`storefront/schema.graphql`** — CREATED (local copy for codegen).
**Do NOT** rely on `NEXT_PUBLIC_SALEOR_API_URL` pointing to a live instance with the new field; that URL may point to a deployed 3.23 instance that rejects the new field, silently or with an error. Instead:

```bash
cp ../saleor/saleor/graphql/schema.graphql schema.graphql
```

Then run codegen with the env-var override that `.graphqlrc.ts` already handles:
```bash
GITHUB_ACTION=generate-schema-from-file pnpm run generate
```

**`storefront/src/graphql/ProductDetails.graphql`**
Add `sustainabilityLabel` to the `product { … }` selection set. The field returns a nullable enum; querying it when the API doesn't have the field would be a validation error at codegen time — this is why the schema file swap above must happen first.

**`storefront/src/app/(storefront)/[channel]/(main)/products/[slug]/page.tsx`** (ProductShell component)
Read `product.sustainabilityLabel` from the fetched data and render a badge in the product info column (the right column under the price section). Only render when the value is not `NONE` (or null):

```tsx
{product.sustainabilityLabel && product.sustainabilityLabel !== "NONE" && (
  <SustainabilityBadge label={product.sustainabilityLabel} />
)}
```

Add a small `SustainabilityBadge` component (in `src/ui/components/` following existing component patterns) that maps each enum value to a display string and a Tailwind badge style.

**`storefront/src/gql/graphql.ts` et al.** — REGENERATED by the codegen command above.

---

## Downstream Consumer Sync Summary

| Consumer | What changes | How to re-sync |
|---|---|---|
| Dashboard GraphQL types | `SustainabilityLabelEnum` enum, `sustainabilityLabel` field on `Product`, `sustainability_label` on `ProductInput` | Copy schema → `pnpm run generate:main` |
| Dashboard staging types | Same, for the staging config | `cp` schema → `pnpm run generate:staging` (or skip if staging tracks main) |
| Storefront gql types | `sustainabilityLabel` on `ProductDetailsQuery` result | Copy schema → `GITHUB_ACTION=generate-schema-from-file pnpm run generate` |
| Storefront checkout codegen | No product fields — unaffected | No action needed |
| Apollo fragment cache | New scalar field on `Product` type — Apollo auto-includes it alongside existing fields; no `typePolicies` change needed | Automatically correct after `generate:main` |

---

## Pitfalls to Avoid

1. **Dashboard schema source is pinned to a GitHub tag.** `pnpm run fetch-schema:main` curls `saleor/saleor@3.23/…` — which is the released 3.23 schema, not your local branch. Running it will overwrite `schema-main.graphql` and erase the new enum. Always copy from local backend instead.

2. **Storefront codegen introspects a live URL by default.** If `NEXT_PUBLIC_SALEOR_API_URL` points to a prod/staging instance running 3.23, codegen will fail because `sustainabilityLabel` is not in the remote schema. Use `GITHUB_ACTION=generate-schema-from-file` with a local `schema.graphql` copy.

3. **`schema.graphql` in dashboard root is a symlink** to `schema-main.graphql`. `fetch-local-schema.cjs` writes through it correctly on Linux. Direct `cp` to `schema-main.graphql` also works.

4. **Enum default must be set in migration.** The `AddField` migration must specify `default=SustainabilityLabel.NONE` (or `default="none"`) so existing rows are backfilled non-destructively.

5. **`ProductUpdate` mutation performs partial updates.** Verify in `product_update.py` / `product_cleaner.py` that the new `sustainability_label` input field is not filtered out. Saleor's `ModelWithExtRefMutation.perform_mutation` uses `cleaned_input`, and fields must not be excluded by any allow-list. If an allow-list exists, add `sustainability_label` to it.

6. **`ADDED_IN_324` is the correct version annotation.** `ADDED_IN_323` is already used for webhook subscription fields; the backend descriptions.py already defines `ADDED_IN_324`. Use it for all new fields and types.

---

## Verification

1. **Migration**: `python manage.py migrate product` — no errors; `sustainability_label` column exists in `product_product` table.
2. **API**: Run a `productUpdate` mutation with `input: { sustainabilityLabel: RECYCLED }` via GraphiQL or curl, then `product(id:…) { sustainabilityLabel }` — returns `"RECYCLED"`.
3. **Schema file**: `grep sustainabilityLabel saleor/saleor/graphql/schema.graphql` — field and enum appear.
4. **Dashboard codegen**: `pnpm run generate:main` exits 0; `grep SustainabilityLabel src/graphql/types.generated.ts` — enum type present.
5. **Dashboard UI**: Navigate to a product → save with label "Organic" → reload → field shows "Organic".
6. **Storefront codegen**: `GITHUB_ACTION=generate-schema-from-file pnpm run generate` exits 0; `grep sustainabilityLabel src/gql/graphql.ts` — field present in generated type.
7. **Storefront badge**: Navigate to the product PDP → badge "Organic" is visible; product with label "None" shows no badge.
