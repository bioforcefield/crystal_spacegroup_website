# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

Tip: `main` **aa5df5b**, `gh-pages` **5d82bde**. Tests: **575**.

## Publications /pubs — Crossref recent titles (2026-10-27)
- Tabs: **Recent titles** (live Crossref metadata) | **Curated COD**
- Client: `src/data/pubs/crossref.ts` — ISSN presets ACS / IUCr / RSC / Wiley / All; cursor pagination; title keyword hints
- Worker: `GET /crossref?filter=…&rows=20&cursor=*` → `api.crossref.org/works` with polite UA `CrystalSpaceGroups/1.0 (mailto:chuanjiewu@gmail.com)`
- Vite `/crossref` middleware for local/preview
- Curated COD extended with ~18 entries from 2020–2024
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
- main: `aa5df5b`
- gh-pages: `5d82bde` (VITE_COD_PROXY baked)
- tests: 575
