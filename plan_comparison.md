# Plan Comparison: `plan_without.md` vs `plan_with.md`

## Dimension 1: Technical Accuracy

**`plan_with` wins.**

| Point | `plan_without` | `plan_with` |
|---|---|---|
| GraphQL enum registration | Manual `BaseEnum` subclass | `to_enum()` utility — the actual Saleor idiom, used by `ProductTypeKindEnum` in the same file |
| Resolver | Explicit `resolve_sustainability_label` static method | Correctly notes `ModelObjectType` auto-resolves model fields — no resolver needed |
| Mutation wiring | Vague: "verify `sustainability_label` is forwarded… if an allow-list exists, add it" | Correctly notes `construct_instance` handles simple `CharField` inputs automatically |
| DB field | Only `default=` | Both `default=` and `db_default=` — important for migrations on populated tables |

---

## Dimension 2: Coverage of Failure Modes

**Roughly equal, each catches something the other misses.**

- `plan_with` has the better-organized **Silent Failure Summary** table and explicitly calls out the `predev` hook issue (storefront runs `generate:all` before dev starts, so API must be up first).
- `plan_without` mentions the **`schema-main.graphql` is a symlink** (useful on Windows), and explicitly documents the `ADDED_IN_324` version annotation — which `plan_with` omits entirely. In Saleor, that annotation is a required convention for all new schema fields; skipping it is a real gap.

---

## Dimension 3: Enum Case Mapping

**`plan_with` wins clearly.**

`plan_with` explicitly documents the three-layer case transformation:

> DB stores `"fair_trade"` → GraphQL sends `FAIR_TRADE` → storefront TS uses `FairTrade` (PascalCase)

`plan_without` doesn't address this at all. A developer following `plan_without` and hardcoding `"FAIR_TRADE"` in the storefront would have a runtime bug.

---

## Dimension 4: Storefront Codegen Setup

**`plan_with` is more robust.**

`plan_without` uses the `GITHUB_ACTION=generate-schema-from-file` env-var trick with a copied `schema.graphql`. `plan_with` instead says: point `NEXT_PUBLIC_SALEOR_API_URL` at the running local API. The `plan_with` approach is simpler and matches how the storefront is actually designed to work, though it introduces the API-must-be-up dependency it correctly flags.

---

## Dimension 5: Concision / Signal-to-Noise

**`plan_with` wins.** Same information density with ~30% fewer words. `plan_without` over-explains things that are automatic (the resolver, `construct_instance`) and repeats mutation wiring points.

---

## Overall Verdict

**`plan_with` is the stronger plan** — more idiomatic Saleor code, no unnecessary boilerplate, better enum case guidance, and tighter writing.

The one concrete gap in `plan_with`: it **omits the `ADDED_IN_324` version annotation** that Saleor requires on all new schema fields and types. `plan_without` gets this right. A merged `plan_with` that adds that annotation would be the ideal document.
