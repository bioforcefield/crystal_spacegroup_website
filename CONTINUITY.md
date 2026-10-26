# Crystal space-group site — resume notes (2026-10-26)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`  
Plan canvas: https://cursor.com/canvas/store-47b63095-92bb-4ade-8ecd-d65e434f207d/99fd7be7-25b5-4ea5-9402-ecaaffb9adf8  
Latest: feature `5d348b3` · tip `5d348b3c9344b3f19b3755fbadcf899770ed70f8` · `gh-pages` `4308908`

## Done
- All 230 `/sg/N` interactive (gemmi ITA JSON → `generatedDemo.ts`; catalog all `ready`)
- Hand overrides (**41**): CSD top-30 + teaching set including **10** P2/m, **76** P41, **80** I41, **123** P4/mmm, **147** P-3, **194** P6₃/mmc, **221** Pm-3m, **225** Fm-3m, **227** Fd-3m, **229** Im-3m, **230** Ia-3d
- **Mirror class:** dedicated `SymmetryClassId` `mirror` (#facc15) in palette/types; pure mirrors no longer piggyback on `c-glide`; GlidePlaneSpec accepts `mirror`; generator classify uses `mirror`
- **6₃ screw kind:** `ScrewAxisSpec.kind = '63'` with 3D/2D overlays (P6₃/mmc)
- **Triclinic α/β/γ** + diagonal glides + cubic focus chips + hex γ=120 + tetra a=b
- Foundation + vitest (**239** tests)
- Pages: `PAGES=1` build + force-push `gh-pages`

## Gaps / next
- R-3c third glide locus teaching labels approximate
- Reset view orbits cell center — optional origin-front reset
- Mobile toolbar wraps on ~390px; 2D still below 3D
- Next ROI: more textbook leftovers (P6/mmm, Pmmm, Fmmm, Cmmm, P4₂/ncm, Fm-3, …) / CSD ranks 31+

## Key paths
- Mirror: `types.ts` · `symmetryPalette.ts` · `buildOperators.ts`
- New hand: `p2m` · `p4mmm` · `p63mmc` · `pm3m` · `im3m`
- `npm test` · `npm run build:pages`

## Deploy cadence tip
Commit on `main`, then `npm run build:pages` and force-push `dist/` to `gh-pages`.
