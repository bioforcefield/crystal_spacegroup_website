# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`  
Plan canvas: https://cursor.com/canvas/store-47b63095-92bb-4ade-8ecd-d65e434f207d/99fd7be7-25b5-4ea5-9402-ecaaffb9adf8  

## Done (this batch) — code-review High/Medium/Low + phone UX

### High
- **`buildOperators.classify`**: det/trace crystallographic classification (orders 1–6 / −1…−6); axis-aligned screw/glide refinement; **no heuristic `c-glide`/`screw` fallbacks** (coverage test over all 230).
- **`deriveElements`**: axis-aligned 2/2₁ ‖ a,b,c; 4/4ₙ ‖ c; 3/3ₙ ‖ c (hex); mirrors/a·b·c·n·d glides ⊥ a,b,c; inversions. Generated demos fill `screwAxes`/`glidePlanes` from these. Body-diagonal / non-axis elements → `geometryLimited` + UI note.

### Medium
- Generated demos: richer blurbs, `operatorFocusIndices` (≤12, identity + one per class), geometry note.
- `React.lazy` + Suspense for `/sg/*` and `/cif`.
- Op listbox keyboard (↑↓ / ←→, Home/End) on panel + mobile chip strip.
- Faint overlay opacity bumped (3D).
- Demo topbar with **Home + CIF map** (phone-reachable); panel CIF jump; Index UCL chip; **3D|2D pane toggle** on ≤900px; touch-sized chips/buttons.
- README rewritten (230 demos + CIF + deploy rules).

### Low
- Index **Live only** toggle removed (all 230 ready).
- Index UCL diagrams chip added.
- oxlint `setState-in-effect` fixed in `GhostAnimator` (remount key) and `SpaceGroupDiagram2D` (adjust state during render).
- Deploy documented: **temp `dist/` → orphan `gh-pages` only**.

Tests: **335** green.

## Teaching core
Hand-polished demos: **57** (CSD top + textbook). CIF map at `/cif`.

## Remaining gaps (deferred)
- Body-diagonal 3-folds / general eigenvectors still not drawn as loci (honest geometryLimited note instead).
- CIF v1: no residue clustering, occupancy filter, ellipsoids, Cartesian-only sites.
- Full 3D screen-reader a11y not attempted.

## Key paths
- Classify/derive: `src/data/groups/buildOperators.ts`, `deriveElements.ts`
- Generated: `src/data/generatedDemo.ts`
- CIF: `src/data/cif/*`, `src/pages/CifExplorerPage.tsx`
- Chrome: `src/App.tsx` (lazy + demo-topbar)
- `npm test` · `npm run build:pages` · Pages via **temp `dist/` → orphan gh-pages**

## SHAs
- main tip: `38e2f29` · feature: `a7b7691`
- gh-pages: `0ecc6cf` (238 files from clean dist/)
