# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

## Done (this batch) — CIF intact molecules + operators + cell params + COD/CSD codes

### CIF `/cif`
- **Intact molecules**: min-image covalent bonds + unwrap (`src/data/cif/molecules.ts`).
- **Symmetry operators**: ITA xyz / Seitz / class; color-matched; keyboard + phone chips; default **Molecules** mode.
- **Lattice on 3D box**: a/b/c Å Billboard labels + corner `CellParamsBadge` (α/β/γ).
- **Origin + label size (766d662 / pages f99172c)**: amber sphere + "O (0,0,0)" billboard at frac (0,0,0), offset away from cell centre; badge line "● O = origin". 3D text scale 0.038→0.06·min(a,b,c) (min 0.34); badge 0.72→0.95rem desktop, 0.68→0.85rem phone.
- **Occupancy / disorder**: skip occ &lt; 0.05; one altloc group.
- **Load by code**:
  - **COD** `1100303`: cache `public/samples/cod/{id}.cif` → optional `VITE_COD_PROXY` → Vite `/cod-proxy` (dev/preview) → direct crystallography.net. CORS often blocks direct on GH Pages → UI open-link + paste. Optional Worker: `scripts/cod-cors-worker.js`.
  - **CSD** `ACETAC01`: no anonymous stream (CCDC); link to Access Structures; upload/paste. No scraping.

Tests: **350** green.

## Remaining gaps
- Body-diagonal loci still geometryLimited.
- CIF: no ellipsoids; Cartesian-only unsupported; no cross-op H-bond dimers.
- Production COD arbitrary-id stream needs `VITE_COD_PROXY` worker or paste (bundled 1100303 works same-origin).

## Key paths
- CIF: `src/data/cif/*`, `CifExplorerPage.tsx`, `CifStructureScene.tsx`
- `npm test` · `npm run build:pages` · `scripts/deploy-gh-pages.sh`

## SHAs
- main tip: `7652504` (feature `5478cd5`)
- gh-pages: `ba33397` (239 files)
