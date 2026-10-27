# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

## Publications /pubs — review follow-ups (2026-10-27)
- Added **cocrystal** PubTag (Curated + Recent topic chip); salt stays salt (not remapped)
- Recent status: **relevance-ranked** when topic/search query active; newest-first otherwise
- Softened Crossref totals copy (“top matches” / bag-of-words) when querying
- Curated: hide tag chips with count 0; suggestTags now tags ml / csp / cocrystal
- Quoted Crossref topic queries for ML and CSP
- Worker: 400 if `cursor` + date `sort` (use offset)
- Fixed mismatched curated cards: Ice Ih, Gypsum, NaCl, Quartz → correct COD ids
- ACS blurb notes Inorganic Chemistry is broad / not crystal-only

## COD name / SMILES search
- Worker: `GET /search?text=` + `GET /search?smile=` (+ optional `year=`)
- Production proxy: `https://crystal-cod-proxy.crystal-sg.workers.dev`

## Cloudflare COD proxy
- Worker: https://crystal-cod-proxy.crystal-sg.workers.dev/{id}.cif (+ `/search`, `/crossref`)
- Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- Pages: bake `VITE_COD_PROXY` + keep `.nojekyll`

## Key paths
- Pubs: `src/data/pubs/`, `src/pages/PublicationsPage.tsx`
- COD: `scripts/cod-cors-worker.js`, `public/samples/cod/`
- `npm test` · `VITE_COD_PROXY=… npm run build:pages` · `scripts/deploy-gh-pages.sh`

## SHAs
- main: (pending commit)
- gh-pages: (pending deploy)
