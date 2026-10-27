# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

Tip: `main` **bd75421**, `gh-pages` **f855faa**. Pubs review follow-ups + cocrystal shipped.

## Publications /pubs — review follow-ups (2026-10-27)
- Added **cocrystal** PubTag (Curated + Recent topic chip); salt stays salt (not remapped)
- Recent status: **relevance-ranked** when topic/search query active; newest-first otherwise
- Softened Crossref totals copy (“top matches” / bag-of-words) when querying
- Curated: hide tag chips with count 0; suggestTags now tags ml / csp / cocrystal
- Quoted Crossref topic queries for ML and CSP
- Worker: 400 if `cursor` + date `sort` (use offset)
- Fixed mismatched curated cards: Ice Ih→1011023, Gypsum→5000039, NaCl→1000041, Quartz→1011097
- ACS blurb notes Inorganic Chemistry is broad / not crystal-only

## Cloudflare COD proxy
- Worker: https://crystal-cod-proxy.crystal-sg.workers.dev/{id}.cif (+ `/search`, `/crossref`)
- Pages bake `VITE_COD_PROXY` via deploy-gh-pages.sh env

## Key paths
- Pubs: `src/data/pubs/`, `src/pages/PublicationsPage.tsx`
- COD: `scripts/cod-cors-worker.js`
- `npm test` · `VITE_COD_PROXY=… bash scripts/deploy-gh-pages.sh`

## SHAs
- main: `bd75421`
- gh-pages: `f855faa` (VITE_COD_PROXY baked)
