# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

Tip: `main` **07bfa8e**, `gh-pages` **07e3810**. Pubs review fixes applied.

## Publications /pubs — Crossref recent titles (2026-10-27)
- Tabs: **Recent titles** (live Crossref metadata) | **Curated COD**
- Client: `src/data/pubs/crossref.ts` — ISSN presets; **offset** pagination; `sort=published` only when no query; topic chips → relevance
- Topic chips (`TOPIC_HINT_TAGS`): hydrate, MOF, drug, salt, mineral, ML, CSP — organic/inorganic are Curated-only
- Worker: `GET /crossref?…` → `api.crossref.org/works` with polite UA
- Vite `/crossref` middleware for local/preview
- No PDFs, no ACS HTML scrape, no CSD scrape

## COD name / SMILES search (2026-10-27)
- Worker: `GET /search?text=` + `GET /search?smile=` (+ optional `year=`)
- Client: `src/data/cif/codSearch.ts`; UI tabs on `CifLoadPanel`
- Production proxy: `https://crystal-cod-proxy.crystal-sg.workers.dev`

## Home UX (2026-10-27)
- CIF spotlight + pubs spotlight; animated HeroCellMotif (reduced-motion safe)

## Cloudflare COD proxy
- Worker: https://crystal-cod-proxy.crystal-sg.workers.dev/{id}.cif (+ `/search`, `/crossref`)
- Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- Pages: bake `VITE_COD_PROXY` + keep `.nojekyll`

## Key paths
- Pubs: `src/data/pubs/`, `src/pages/PublicationsPage.tsx`
- COD: `scripts/cod-cors-worker.js`, `public/samples/cod/`
- `npm test` · `npm run build:pages` · `scripts/deploy-gh-pages.sh`

## SHAs
- main: `07bfa8e`
- gh-pages: `07e3810` (VITE_COD_PROXY baked)
