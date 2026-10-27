# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

Tip: `main` **2e005a4**, `gh-pages` **21fbe5b**. Tests: **557**.

## Publications /pubs (2026-10-27)
- Route `/pubs` — curated COD literature by year + tags (`src/data/pubs/`, `PublicationsPage.tsx`)
- Tags: organic, inorganic, drug, hydrate, salt, mineral, mof (manual + heuristics in `tagHeuristics.ts`)
- Cards → DOI + `/cif?cod={id}` deep-link (CIF explorer autoloads once)
- Home teaser + nav Pubs; worker also accepts `/search?year=YYYY` (optional, capped)
- Not a full paper stream / no PDFs / no CSD scrape

## COD name / SMILES search (2026-10-27)
- Worker: `GET /search?text=` + `GET /search?smile=` (maps to COD `smarts`) + optional `year=` in `scripts/cod-cors-worker.js`
- Client: `src/data/cif/codSearch.ts`; UI tabs on `CifLoadPanel`
- Production proxy: `https://crystal-cod-proxy.crystal-sg.workers.dev`

## Home UX (2026-10-27)
- CIF spotlight + pubs spotlight; animated HeroCellMotif (reduced-motion safe)

## Cloudflare COD proxy
- Worker: https://crystal-cod-proxy.crystal-sg.workers.dev/{id}.cif
- Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- Pages: bake `VITE_COD_PROXY` + keep `.nojekyll`

## Key paths
- Pubs: `src/data/pubs/`, `src/pages/PublicationsPage.tsx`
- COD: `scripts/cod-cors-worker.js`, `public/samples/cod/`
- `npm test` · `npm run build:pages` · `scripts/deploy-gh-pages.sh`

## SHAs
- main: `2e005a4`
- gh-pages: `21fbe5b` (VITE_COD_PROXY baked)
- tests: 557
