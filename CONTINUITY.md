# Crystal space-group site — resume notes (2026-10-27)

Live: https://crystalspacegroups.com/ (also https://bioforcefield.github.io/crystal_spacegroup_website/)  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

## Front-page spotlights
- CIF / Publications / Morphology+kinetics share `.home-spotlights` (1280px, same padding as hero/main)
- Pubs + teach sit in equal-height `.home-spotlight-row` (2-col → 1-col ≤900px)
- Hero uses same 1.4rem inset column as spotlights/main (no double outer pad)
- System cards stretch evenly in the explore grid

## CIF map layout (2026-10-27 evening)
- Desktop toolbar wraps in-bounds (no `width:100%` primary on desktop; actions can shrink)
- Canvas frame absolutely fills `.canvas-wrap`; R3F wrapper forced to 100%
- Camera frames AABB of cell + visible atoms (nearest images), aspect-aware distance, origin-front dir

## Cloudflare COD proxy
- Worker: https://crystal-cod-proxy.crystal-sg.workers.dev/{id}.cif
- Deploy: `VITE_COD_PROXY=https://crystal-cod-proxy.crystal-sg.workers.dev bash scripts/deploy-gh-pages.sh`

## Key paths
- `npm test` · deploy script above

## SHAs
- main: `7ff52cd`
- gh-pages: `ed1c3aa` (VITE_COD_PROXY baked; CNAME crystalspacegroups.com)
