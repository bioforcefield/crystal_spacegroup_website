# Crystal space-group site — resume notes (2026-10-26)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`  
Plan canvas: https://cursor.com/canvas/store-47b63095-92bb-4ade-8ecd-d65e434f207d/99fd7be7-25b5-4ea5-9402-ecaaffb9adf8  
Latest: feature `71257a8` · tip (this note) · `gh-pages` `f48dc4d`

## Done
- All 230 `/sg/N` interactive (gemmi ITA JSON → `generatedDemo.ts`; catalog all `ready`)
- Hand overrides (**34**): full CSD top-30 plus **76** P41, **80** I41, **147** P-3, **227** Fd-3m
- **Diagonal glides:** `GlidePlaneSpec.corners` for non-axis-aligned planes; 3D + 2D projectGlide; R-3c vertical c-glides (x=−y family) drawn
- **Overlays:** 4₁ / 4₃ / ¯4; d-glide; tetragonal a=b; hex γ=120; cubic Fd-3m teaching shortlist via `operatorFocusIndices`
- Foundation + vitest (**202** tests)
- Pages: `PAGES=1` build + force-push `gh-pages`
- Mobile: pinch-zoom + chips; pure-mirror skip zero-glide arrows; cubic expand shortlist

## Gaps / next
- Full triclinic α (and simultaneous α/β/γ) still deferred
- Pure mirrors still reuse `c-glide` palette slot
- Cubic clutter: chips shortlist done for Fd-3m; Ia-3d / Fm-3m still generated-only
- R-3c third glide locus teaching labels are approximate (3-fold images of x=−y)
- Reset view orbits cell center — optional origin-front reset
- Mobile toolbar wraps on ~390px; 2D still below 3D
- Next ROI: Ia-3d (230), Fm-3m (225), triclinic α, or ranks 31+ teaching set

## Key paths
- Diagonal: `types.ts` GlidePlaneSpec.corners · `SymmetryElements.tsx` · `diagram2d.ts` projectGlide
- New hand: `p41`, `i41`, `fd3m`, `pbar3`; R-3c upgraded
- `npm test` · `npm run build:pages`

## Deploy cadence tip
Commit on `main`, then `npm run build:pages` and force-push `dist/` to `gh-pages`.
