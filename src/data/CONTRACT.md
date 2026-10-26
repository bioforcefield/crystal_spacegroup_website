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
| `screwAxes` / `inversionCenters` / `glidePlanes` | Loci for 3D/2D overlays (may be hand-authored or derived) |
| `elementLocusForOp` | Short locus string per op index (or null) |
| `defaultProjection` | `'a' \| 'b' \| 'c'` for the 2D diagram |
| `primaryInversionOp` | Op index of the primary −1 (if centrosymmetric) |
| `shortName` | Diagram / nav label |

Operators use Seitz form **x′ = R x + t** with fractional coords. `|det(R)|` must be 1. The set must be **closed** under composition mod ℤ³ (see `groups/closure.ts`).

## ITA setting convention

- **Monoclinic:** unique axis **b**, **cell choice 1** (ITA standard setting used by P21/c and C2/c demos).
- **Orthorhombic / others:** conventional ITA setting matching the HM symbol on the demo (e.g. Pbca).
- Triplets may use Unicode minus `−` and vulgar fractions `½` `¼` `¾`, or ASCII `-` and `1/2` etc. Parser: `groups/parseTriplet.ts`.

## All 230 via generator

1. **Source:** `scripts/ita_space_groups.json` (gemmi) copied to `src/data/itaSpaceGroups.json` (`npm run gen:ita`).
2. **Builder:** `generatedDemo.ts` → `buildGeneratedDemo(n)` from triplets + **catalog HM/system** (not gemmi’s compact `P121/c1` form).
3. **Registry:** `getDemo(n)` returns a **hand override** for 2 (P-1), 14 (P21/c), 15 (C2/c), 61 (Pbca); otherwise the generated demo. Every `n` in 1…230 resolves.
4. **Catalog:** all entries `status: 'ready'` so the hub Live filter shows every group.
5. **Validate:** `npm test` (hand golden suite + multiplicity/det for all 230 + stratified closure samples).

Hand modules (`pbar1.ts`, `p21c.ts`, `c2c.ts`, `pbca.ts`) keep teaching-quality loci and blurbs. Generated groups are valid closed operator sets; element overlays are best-effort.

## How to polish one group further

1. Author a dedicated `src/data/<slug>.ts` (or deepen an existing override).
2. Register it in `registry.ts` `HAND_DEMOS` so it wins over the generator.
3. Keep catalog HM/slug aligned; run `npm test` / `npm run build`.

## Generator / cell limitations

- **`fracToCart` / `cartToFrac`:** unique-axis-**b** monoclinic β only. Triclinic α/γ and hexagonal/trigonal **γ = 120°** are **not** modeled — teaching cells for those systems are orthogonal (or use a single β for triclinic) so operator teaching still works; metric angles are approximate.
- **Element derivation** (`deriveElements`): tuned for unique-b monoclinic 2/2₁ and mirrors/glides ⊥ b, plus generic inversion (`R = −I`). Orthorhombic / tetragonal / cubic screws and glides often have **empty or partial** overlay lists — do not claim perfect element geometry for every group yet.
- Class labels for generated ops are heuristics (identity / inversion / unique-b / fallback improper→glide-ish, proper→screw-ish).
- Tolerances: fractional coords within ~`1e-6` for op equality; locus checks typically ~`1e-3`–`0.02`.
