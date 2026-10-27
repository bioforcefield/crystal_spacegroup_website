# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

## Done (this batch) — CIF Near / Cell placement

### CIF `/cif` — Nearest images + In cell (mirror SG demos)
- Same semantics as `/sg/{n}` Motif placement:
  - **Near** (`nearest`, default): intact molecules keep relative geometry; each molecule is lattice-translated so its centroid sits near the selected symmetry element (may leave the cell). Uses `distToElement` from `nearestImages.ts`.
  - **Cell** (`wrapped`): every atom at wrapped `[0,1)³` cartesian; bonds that stretch across faces after wrap are hidden.
- Toolbar segmented control with full labels “Nearest images” / “In cell” and phone short labels **Near** / **Cell** (same `label-full`/`label-short` as SG demos).
- Visibility chips (Molecules / All / BASE+IMAGE / AU) unchanged; Molecules remains default visibility.
- Module: `src/data/cif/placement.ts` + tests; wired through `CifStructureScene` / `CifExplorerPage`.

Tests: **359** green.

## Prior (same day)
- CIF phone layout: lattice strip below canvas, wrapped toolbar.
- Symmetry-element overlays on CIF cell via `demoWithCifCell`.
- Intact molecules, operator list, origin marker, COD/CSD load-by-code.

## Remaining gaps
- Body-diagonal loci still geometryLimited (no invented loci).
- CIF: no ellipsoids; Cartesian-only unsupported; no cross-op H-bond dimers.
- Production COD arbitrary-id stream needs `VITE_COD_PROXY` worker or paste (bundled 1100303 works same-origin).
- Near placement uses per-molecule centroid→element (not full BASE/IMAGE pair search like motif seeds); good enough for CIF density.

## Key paths
- CIF: `src/data/cif/*` (incl. `placement.ts`), `CifExplorerPage.tsx`, `CifStructureScene.tsx`
- SG placement reference: `src/data/nearestImages.ts`, `SpaceGroupPage.tsx`
- `npm test` · `npm run build:pages` · `scripts/deploy-gh-pages.sh`

## SHAs
- (fill after commit/deploy)
