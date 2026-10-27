# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

## BFDH interactive + disclaimer (2026-10-27)
- `/morphology` BFDH: Note + amber Disclaimer callout (teaching only; centering Harker only; 2D ab slice; may disagree with experiment)
- After load: per-form rate sliders seeded from R∝1/d_DH, include/exclude checkboxes, live Wulff + habit badge, **Reset to BFDH**
- Helpers: `uniqueFormRates` / `applyFormRates` in `bfdh.ts`

## Morphology phone fix + BFDH predictor (2026-10-27)
- `/morphology` mobile: teach-page/section padding, single-column ≤640px, SVG `max-width:100%`, teach-cards 1-col, site-topbar wrap — stops horizontal cut-off from `minmax(160px)` cards + tight padding
- Shared teach CSS also helps `/kinetics`
- **Predict · BFDH from crystal** on morphology: COD id / cached chips / paste / upload → `rankBfdh` (d_hkl + centering Harker) → ranked table + ab-plane 2D Wulff via `wulffPolygon2D`
- Helpers: `src/data/morphology/{dHkl,centering,bfdh}.ts` + tests

## Morphology & kinetics teaching pages
- `/morphology` (+ `/morph`): 2D Wulff from rates + BFDH predictor
- `/kinetics`: nucleation / growth / size–time schematics
- Teaching only — not full 3D Wulff / not fitted plant kinetics

## CIF map — ASU · 2D diagram
- PCA stick sketch of ASU when discrete molecule; lattices stay formula-only

## Cloudflare COD proxy
- Worker: https://crystal-cod-proxy.crystal-sg.workers.dev/{id}.cif (+ `/search`, `/crossref`)
- Pages bake `VITE_COD_PROXY` via deploy-gh-pages.sh env

## Key paths
- `npm test` · `VITE_COD_PROXY=https://crystal-cod-proxy.crystal-sg.workers.dev bash scripts/deploy-gh-pages.sh`

## SHAs
- main: `c8af9e1`
- gh-pages: `e5e32e6` (VITE_COD_PROXY baked)
