# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

## CIF map — ASU · 2D diagram (2026-10-27)
- Structure panel shows **ASU · 2D** sketch: PCA projection of BASE (op 1) display coords + covalent bonds
- Extended/ionic/too-large → formula text + honest fallback (no fake molecule ball)
- Parses rare CIF SMILES tags (`_chemical_formula_smiles` / descriptor loops) and shows under the sketch
- Helpers: `src/data/cif/asuDiagram.ts` · UI: `src/components/cif/AsuDiagram.tsx`

## Cloudflare COD proxy
- Worker: https://crystal-cod-proxy.crystal-sg.workers.dev/{id}.cif (+ `/search`, `/crossref`)
- Pages bake `VITE_COD_PROXY` via deploy-gh-pages.sh env

## Key paths
- Pubs: `src/data/pubs/`, `src/pages/PublicationsPage.tsx`
- COD: `scripts/cod-cors-worker.js`
- `npm test` · `VITE_COD_PROXY=… bash scripts/deploy-gh-pages.sh`

## SHAs
- (fill after commit/deploy)
