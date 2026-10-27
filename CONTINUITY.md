# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

## Done (this batch) — CIF symmetry-element overlays

### CIF `/cif` — screws / glides / inversions / mirrors on the real cell
- When the CIF resolves an ITA number (1–230), load the teaching demo via `getDemo(n)` and **substitute the CIF cell** (`demoWithCifCell`) so fractional loci use the structure’s a,b,c,α,β,γ — not the teaching metric.
- Render with shared `SymmetryElements` (`soft` opacity ~0.72× so molecules stay readable).
- Toolbar toggle **Symmetry elements · on/off** (default on when drawable loci exist; disabled if SG unknown or no loci). Phone-friendly min-height.
- Class-color legend strip + honest `geometryLimited` note when body-diagonal etc. are missing.
- Molecules, origin marker, lattice labels, operator list unchanged.
- Verified path: sample acetic P21/c (14); COD 1100303 is P-1 (2) → inversions.

### Key files
- `src/data/cif/demoWithCifCell.ts` (+ test)
- `src/components/CifStructureScene.tsx`, `SymmetryElements.tsx` (`soft`)
- `src/pages/CifExplorerPage.tsx`

Tests: **353** green.

## Remaining gaps
- Body-diagonal loci still geometryLimited (no invented loci).
- CIF: no ellipsoids; Cartesian-only unsupported; no cross-op H-bond dimers.
- Production COD arbitrary-id stream needs `VITE_COD_PROXY` worker or paste (bundled 1100303 works same-origin).

## Key paths
- CIF: `src/data/cif/*`, `CifExplorerPage.tsx`, `CifStructureScene.tsx`
- `npm test` · `npm run build:pages` · `scripts/deploy-gh-pages.sh`

## SHAs
- main tip: `d0f9401` (feature `5e33203`)
- gh-pages: `22df158` (239 files)
