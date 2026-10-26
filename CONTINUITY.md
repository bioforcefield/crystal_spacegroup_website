# Crystal space-group site — resume notes (2026-10-26)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`  
Plan canvas: https://cursor.com/canvas/store-47b63095-92bb-4ade-8ecd-d65e434f207d/99fd7be7-25b5-4ea5-9402-ecaaffb9adf8  
Latest: `main` `6c11a9e` (feature) · `gh-pages` `b1a647a`

## Done
- All 230 `/sg/N` interactive (gemmi ITA JSON → `generatedDemo.ts`; catalog all `ready`)
- Hand overrides (**30** = full CSD top-30): **1** P1, **2** P-1, **4** P21, **5** C2, **7** Pc, **9** Cc, **11** P21/m, **12** C2/m, **13** P2/c, **14** P21/c, **15** C2/c, **18** P21212, **19** P212121, **20** C2221, **29** Pca21, **33** Pna21, **36** Cmc21, **43** Fdd2, **56** Pccn, **60** Pbcn, **61** Pbca, **62** Pnma, **64** Cmca, **82** I-4, **88** I41/a, **92** P41212, **96** P43212, **146** R3, **148** R-3, **167** R-3c
- **Overlays:** 4₁ / 4₃ / ¯4 screw kinds; d-glide class; tetragonal a=b cells; hex γ=120 for R3/R-3/R-3c
- **Hex/trigonal teaching cells:** `CellParams.gammaDeg`, α=90° `fracToCart`/`cartToFrac` (β and/or γ), diagram2d ↓c parallelogram
- Foundation: parseTriplet/buildOperators (incl. 3 / −3 ‖ c), closure/deriveElements, vitest (**180** tests)
- Pages: `PAGES=1` build + force-push `gh-pages` (no Actions token)
- **Mobile UX:** pinch-zoom + operator chip strip; pure-mirror planes skip zero-glide arrows

## Gaps / next
- Full triclinic α (and simultaneous α/β/γ) still deferred — teaching triclinic uses unique-b β only
- `deriveElements` sparse for many tetra/cubic; class labels heuristic outside hand set
- R-3c vertical c-glides labelled but not overlaid (planes like x=−y not axis-aligned in GlidePlaneSpec)
- Pure mirrors still reuse `c-glide` palette slot (Pnma, P21/m, C2/m, Cmca)
- Cubic clutter (e.g. Ia-3d, 96 ops) needs smarter show-on-select filtering
- Reset view orbits **cell center** — optional: origin-front reset
- Mobile remaining: toolbar wraps on ~390px; 2D still below 3D on phone
- Domain idea: `spacegroups.app`
- Next polish ROI: deepen tetra/cubic overlays, or hand ranks 31+ (e.g. P41, I41, Fd-3m)

## Key paths
- `src/data/itaSpaceGroups.json`, `generatedDemo.ts`, `registry.ts` (`HAND_DEMOS`)
- New hand modules: `i41a`, `pccn`, `fdd2`, `c2221`, `cmc21`, `cmca`, `ibar4`, `p41212`, `p43212`, `r3`, `rbar3c`
- `npm test` · `npm run build:pages`

## Deploy cadence tip
Commit on `main`, then `npm run build:pages` and force-push `dist/` to `gh-pages`.
