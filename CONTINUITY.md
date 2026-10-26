# Crystal space-group site — resume notes (2026-10-26)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`  
Plan canvas: https://cursor.com/canvas/store-47b63095-92bb-4ade-8ecd-d65e434f207d/99fd7be7-25b5-4ea5-9402-ecaaffb9adf8  
Latest: feature `FEATURE_SHA` · tip `TIP_SHA` · `gh-pages` `GHPAGES_SHA`

## Done
- All 230 `/sg/N` interactive (gemmi ITA JSON → `generatedDemo.ts`; catalog all `ready`)
- Hand overrides (**36**): CSD top-30 + **76** P41, **80** I41, **147** P-3, **225** Fm-3m, **227** Fd-3m, **230** Ia-3d
- **Triclinic α:** `CellParams.alphaDeg` + full ITA `fracToCart`/`cartToFrac` (α/β/γ); P1 / P-1 teaching cells α=75° β=85° γ=100°; generated triclinic same; OperatorPanel + SpaceGroupPage show α
- **Cubic heavyweights:** Fm-3m (192 ops, mirrors + focus chips) · Ia-3d (96 ops, d-glides + 4₁ + focus chips) — same `operatorFocusIndices` pattern as Fd-3m
- **Diagonal glides:** `GlidePlaneSpec.corners`; R-3c vertical c-glides
- Overlays: 4₁ / 4₃ / ¯4; d-glide; tetragonal a=b; hex γ=120
- Foundation + vitest (**214** tests)
- Pages: `PAGES=1` build + force-push `gh-pages`
- Mobile: pinch-zoom + chips; pure-mirror skip zero-glide arrows; cubic expand shortlist

## Gaps / next
- Pure mirrors still reuse `c-glide` palette slot
- R-3c third glide locus teaching labels are approximate (3-fold images of x=−y)
- Reset view orbits cell center — optional origin-front reset
- Mobile toolbar wraps on ~390px; 2D still below 3D
- Next ROI: high-teaching generated leftovers (Pm-3m, Im-3m, P6₃/mmc, P4/mmm, P2/m, …) / CSD ranks 31+

## Key paths
- Triclinic: `types.ts` alphaDeg · `math.ts` ITA orthogonalization · `p1.ts` / `pbar1.ts` / `generatedDemo.ts`
- Cubic: `fm3m.ts` · `ia3d.ts` · `fd3m.ts` (operatorFocusIndices)
- Diagonal: `GlidePlaneSpec.corners` · `SymmetryElements.tsx` · `diagram2d.ts`
- `npm test` · `npm run build:pages`

## Deploy cadence tip
Commit on `main`, then `npm run build:pages` and force-push `dist/` to `gh-pages`.
