# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

## Review fixes (2026-10-27 evening)
- **P0:** R lattices in rhombohedral axes (`RS` / `:R`, or rhombohedral cell metric) no longer apply hexagonal −h+k+l=3n extinctions — affects calcite COD 1010962 powder + BFDH (`effectiveCentering` in `morphology/centering.ts`, wired into powder + BFDH).
- **P1:** Morph/Kinetics stay visible on narrow demo chrome (removed `nav-demo-hide-xs`); polymorph chip warns when map Form A chemistry ≠ pair chemistry; disclaimers mention R:H vs R:R.

## CIF map — X-ray ↔ polymorph compare
- `/cif` X-ray powder + Compare · polymorph (curated pairs, Form B overlay, Load pair)

## BFDH / morphology / kinetics
- `/morphology`, `/kinetics` teaching pages; interactive BFDH rates + disclaimers; phone CSS stack

## Cloudflare COD proxy
- Worker: https://crystal-cod-proxy.crystal-sg.workers.dev/{id}.cif
- Deploy: `VITE_COD_PROXY=https://crystal-cod-proxy.crystal-sg.workers.dev bash scripts/deploy-gh-pages.sh`

## Key paths
- `npm test` · deploy script above

## SHAs
- main: `1797360`
- gh-pages: `28fd7da` (VITE_COD_PROXY baked)
