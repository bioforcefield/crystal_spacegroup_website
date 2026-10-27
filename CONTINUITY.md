# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

## CIF map — X-ray ↔ polymorph compare (2026-10-27)
- `/cif` **X-ray · powder**: teaching note that calculated PXRD fingerprints polymorphs / solvates / hydrates
- **Compare · polymorph**: Form A = map structure; Form B overlay (COD chip / id / paste / upload)
- Curated pairs (cached COD): diamond↔graphite, calcite↔aragonite, quartz↔cristobalite, rutile↔anatase, sphalerite↔wurtzite, BaTiO₃ tet↔cubic
- Overlay SVG (A solid cyan, B dashed lime), shared λ/2θ/FWHM; strongest peaks A vs B; peak-shift table
- Chips set Form B only; **Load pair into map** loads Form A via `onLoadCodId` + Form B overlay; **Open B in map**
- Helpers: `polymorphPairs.ts`, `peakCompare.ts` + vitest; 62 same-origin COD samples
- Honest: calculated vs calculated — not measured phase ID

## CIF map — X-ray / PXRD
- Experiment tags + interactive simulated PXRD (prior)

## BFDH / morphology / kinetics
- `/morphology`, `/kinetics` teaching pages

## Cloudflare COD proxy
- Worker: https://crystal-cod-proxy.crystal-sg.workers.dev/{id}.cif
- Pages bake `VITE_COD_PROXY` via env on deploy

## Key paths
- `npm test` · `VITE_COD_PROXY=https://crystal-cod-proxy.crystal-sg.workers.dev bash scripts/deploy-gh-pages.sh`

## SHAs
- main: `faa89dc`
- gh-pages: `a650957` (VITE_COD_PROXY baked)
