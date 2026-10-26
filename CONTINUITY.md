# Crystal space-group site — resume notes (2026-10-26)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`  
Plan canvas: https://cursor.com/canvas/store-47b63095-92bb-4ade-8ecd-d65e434f207d/99fd7be7-25b5-4ea5-9402-ecaaffb9adf8  
Latest: `main` `43b2621` · `gh-pages` `c53143f`

## Done
- All 230 `/sg/N` interactive (gemmi ITA JSON → `generatedDemo.ts`; catalog all `ready`)
- Hand overrides (**19**): **1** P1, **2** P-1, **4** P21, **5** C2, **7** Pc, **9** Cc, **11** P21/m, **12** C2/m, **13** P2/c, **14** P21/c, **15** C2/c, **18** P21212, **19** P212121, **29** Pca21, **33** Pna21, **60** Pbcn, **61** Pbca, **62** Pnma, **148** R-3
- **Hex/trigonal teaching cells:** `CellParams.gammaDeg`, α=90° `fracToCart`/`cartToFrac` (β and/or γ), diagram2d ↓c parallelogram, FitCamera/wireframe via shared math, OperatorPanel + footer γ readout; generated trigonal/hex use γ=120°
- **R-3 (148)** hand: hexagonal setting R-3:H, mult 18, 3-fold ‖ c (+ R sites), inversion, γ=120° cell
- Foundation: parseTriplet/buildOperators (incl. 3 / −3 ‖ c), closure/deriveElements, vitest
- Pages: `PAGES=1` build + force-push `gh-pages` (no Actions token)
- **Mobile UX:** pinch-zoom + operator chip strip; pure-mirror planes skip zero-glide arrows

## Gaps / next
- Full triclinic α (and simultaneous α/β/γ) still deferred — teaching triclinic uses unique-b β only
- `deriveElements` sparse for many ortho/tetra/cubic; class labels heuristic outside hand set
- **I41/a (88)** deferred (tetragonal, 16 ops, 4₁ / a-glide) — next high-CSD after Wave B
- Next CSD ranks not yet hand: **88** I41/a, **56** Pccn, **43** Fdd2, then ranks 23+
- Reset view orbits **cell center** — optional: origin-front reset
- Mobile remaining: toolbar wraps on ~390px; 2D still below 3D on phone
- Domain idea: `spacegroups.app`

## Key paths
- `src/data/itaSpaceGroups.json`, `generatedDemo.ts`, `registry.ts` (`HAND_DEMOS`)
- Hand modules: `p1`, `pbar1`, `p21`, `c2`, `pc`, `cc`, `p21m`, `c2m`, `p2c`, `p21c`, `c2c`, `p21212`, `p212121`, `pca21`, `pna21`, `pbcn`, `pbca`, `pnma`, `rbar3`
- `npm test` · `npm run build:pages`

## Deploy cadence tip
Commit on `main`, then `npm run build:pages` and force-push `dist/` to `gh-pages`.
