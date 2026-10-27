# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

## Front-page spotlights
- CIF / Publications / Morphology+kinetics share `.home-spotlights` (1280px, same padding as hero/main)
- Pubs + teach sit in equal-height `.home-spotlight-row` (2-col → 1-col ≤900px)
- System cards stretch evenly in the explore grid

## Review leftovers addressed (P1 later + P2)
- Peak-shift: same-hkl preferred; nearest-2θ labeled in UI
- Powder sliders debounced (~80 ms)
- MorphologyBfdhSection + CifPolymorphCompare extracted; optional 3D Wulff habit
- Screw/glide extinctions from operators (`extinctions.ts`) when CIF/SG ops present
- Expanded Cromer–Mann form-factor table; merge-label cleanup; safe `{h,k,l}` labels
- Kinetics amber disclaimer; polymorph chips default to Load pair into map

## Cloudflare COD proxy
- Worker: https://crystal-cod-proxy.crystal-sg.workers.dev/{id}.cif
- Deploy: `VITE_COD_PROXY=https://crystal-cod-proxy.crystal-sg.workers.dev bash scripts/deploy-gh-pages.sh`

## Key paths
- `npm test` · deploy script above

## SHAs
- main: (pending commit)
- gh-pages: (pending deploy)
