# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

## CIF map — X-ray / PXRD (2026-10-27)
- `/cif` structure panel: **X-ray · powder** section after ASU/meta
- Experiment tags from CIF when present: λ, radiation type/probe, T, R/wR/GoF (`metadata.xray`)
- Interactive simulated PXRD: wavelength presets (Cu/Mo/Co + CIF λ + custom), 2θ min/max, FWHM Lorentzian envelope, hover sticks (hkl/d/2θ/I), peak table
- Helpers: `src/data/cif/xray/{formFactors,bragg,powder,envelope}.ts` + vitest; centering extinctions via morphology helpers
- Teaching only — not Rietveld / not measured data

## BFDH interactive + disclaimer (2026-10-27)
- `/morphology` BFDH: Note + amber Disclaimer; per-form rate sliders; Reset to BFDH

## Morphology phone fix + BFDH predictor
- Mobile single-column; BFDH from COD/CIF

## Morphology & kinetics teaching pages
- `/morphology`, `/kinetics`

## Cloudflare COD proxy
- Worker: https://crystal-cod-proxy.crystal-sg.workers.dev/{id}.cif (+ `/search`, `/crossref`)
- Pages bake `VITE_COD_PROXY` via deploy-gh-pages.sh env

## Key paths
- `npm test` · `VITE_COD_PROXY=https://crystal-cod-proxy.crystal-sg.workers.dev bash scripts/deploy-gh-pages.sh`

## SHAs
- main: (pending)
- gh-pages: (pending)
