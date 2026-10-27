# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

## Done (latest) — Review #2 High fix: CIF ops before ITA demo
- **Bug:** `resolveOperators` preferred ITA teaching-demo operators whenever an SG number was known, even when the CIF already listed `_symmetry_equiv_pos_as_xyz`. Wrong for non-standard settings / alternate origins (common in CSD/COD) — packing would not match the AU.
- **Fix:** CIF symops win; ITA demo only when the CIF omits a symmetry loop (with warning). `operatorSource` on `ExpandedStructure`. `elementsDemoForStructure` keeps Near/overlays on the **same** operators (deriveElements for CIF source; hand loci for demo source).
- Z′ computed for `nOps >= 1` (P1: Z′ = Z).
- Tests 367. See review report in agent handoff for Med/Low backlog.

## Prior (same day)
- CIF metadata panel (name, Z′, resolution, literature)
- Near/Cell placement, phone lattice strip, symmetry overlays, COD/CSD load

## Remaining gaps (from review #2)
- Body-diagonal loci still geometryLimited
- −6 classified under `threefold` classId (label says −6)
- Z′ = Z/ops pitfalls on special positions / incomplete CIF op lists
- No cross-op H-bond dimers; no ellipsoids; Cartesian-only unsupported
- Production COD CORS needs `VITE_COD_PROXY`
- Oversized pages (`CifExplorerPage` ~770, `SpaceGroupDiagram2D` ~810); SymmetryElements chunk ~1MB
- Hand vs generated demo polish gap (~57 hand / 173 generated)

## Key paths
- CIF: `src/data/cif/*` (esp. `expandStructure.ts`, `demoWithCifCell.ts`), `CifExplorerPage.tsx`
- `npm test` · `npm run build:pages` · `scripts/deploy-gh-pages.sh`

## SHAs
- main tip: `59bb018` (fix `a122326`)
- gh-pages: `29fece8` (239 files)
