# SpaceGroupDemo contract

Practical checklist for adding a teaching demo. Types live in `types.ts`.

## Required fields (`SpaceGroupDemo`)

| Field | Notes |
| --- | --- |
| `meta` | ITA number, HM symbol, system, point group, lattice, **multiplicity**, blurb |
| `cell` | Teaching `a,b,c`; monoclinic sets `betaDeg` (unique axis **b**) |
| `seed` | Fractional general position (off special sites) |
| `operators` | Length **=** `meta.multiplicity`; each has `R`, `t`, ITA `triplet`, `classId`, `seitz` |
| `symmetryClasses` / `classLegendOrder` | Palette + legend subset for this group |
| `screwAxes` / `inversionCenters` / `glidePlanes` | Loci for 3D/2D overlays (may be hand-authored) |
| `elementLocusForOp` | Short locus string per op index (or null) |
| `defaultProjection` | `'a' \| 'b' \| 'c'` for the 2D diagram |
| `primaryInversionOp` | Op index of the primary −1 (if centrosymmetric) |
| `shortName` | Diagram / nav label |

Operators use Seitz form **x′ = R x + t** with fractional coords. `|det(R)|` must be 1. The set must be **closed** under composition mod ℤ³ (see `groups/closure.ts`).

## ITA setting convention

- **Monoclinic:** unique axis **b**, **cell choice 1** (ITA standard setting used by P21/c and C2/c demos).
- **Orthorhombic / others:** conventional ITA setting matching the HM symbol on the demo (e.g. Pbca).
- Triplets may use Unicode minus `−` and vulgar fractions `½` `¼` `¾`, or ASCII `-` and `1/2` etc. Parser: `groups/parseTriplet.ts`.

## How to add a group

1. **Author or generate operators** from ITA general-position triplets (`buildOperatorsFromTriplets` helps; golden demos still hand-tune labels/loci).
2. **Validate** with `npm test` (closure, det, multiplicity, seed orbit, parse round-trip).
3. **Module:** add `src/data/<slug>.ts` exporting `<slug>Demo: SpaceGroupDemo` (keep beside existing `pbar1.ts` / `p21c.ts` / `c2c.ts` / `pbca.ts` for now). Shared helpers go under `src/data/groups/`.
4. **Registry:** import and append in `registry.ts` (`DEMOS` array). Slugs use `slugifyHm`: crystallographic bar `-` → `bar` (so **P-1 → pbar1**, not `p1`).
5. **Catalog:** set that entry’s status to `ready` and matching `slug` in `spaceGroupCatalog.ts` (and any hub ordering you need).
6. **UI routes** already resolve via `getDemo(number | slug)` — no new space groups in Foundation itself.

## Generator limitations (Foundation)

- Element derivation heuristics target **unique-b monoclinic** 2-fold/screw and mirrors/glides ⊥ b, plus generic inversion (`R = −I`). Orthorhombic screws/glides (Pbca) need hand loci or future axis-agnostic code.
- Derived loci are for smoke checks; they do **not** yet replace hand-authored overlays in golden demos.
- Tolerances: fractional coords within ~`1e-6` for op equality; locus checks typically ~`1e-3`–`0.02`.
