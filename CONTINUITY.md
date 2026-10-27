# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

## Done — Deferred leftovers pass (stages 1–4)

### Stage 1 — COD cache + proxy tooling (`a735854`)
- Same-origin cache expanded to **45** COD CIFs (`public/samples/cod/` + manifest)
- `scripts/build-cod-manifest.py`, improved worker + `wrangler.cod-proxy.toml`
- Workflow templates in `scripts/github-workflows/` (copy into `.github/workflows/` when the repo token has `workflow` scope): `deploy-cod-proxy.yml` (needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`), `refresh-cod-cache.yml`
- Client: cache → `VITE_COD_PROXY` → Vite `/cod-proxy` → direct COD; UI shows cache/proxy/fail notes
- **Arbitrary COD on live Pages still needs a user-deployed Cloudflare Worker** (no CF token here)
- CSD: Access Structures + upload/paste only (no scrape)

### Stage 2 — Cross-op H-bonds (`fa78f91`)
- Geometric D–H···A across molecules; prefer cross-operator contacts
- CIF View: No H-bonds / H-bonds / Partners; dashed lines (pink = cross-op)
- Cap ~180 contacts; skip very large cells

### Stage 3 — Hand polish +14 (`a54ae4f`)
- Hand demos **57 → 71**: P2, P222, P2221, Pmc21, Pmn21, P4, P42, I4, P42/mnm, P3121, P3221, P63, P213, F-43m
- `makeHandDemo` + `handExtra.ts`

### Stage 4 — Exotic loci + a11y (`fe2d5e7`)
- `deriveSixfoldC` (6/61–65 ‖ c); off-origin d-glide locus labels; diagonal offset notes
- Structure canvas summary mentions H-bond counts
- Still not full WebGL screen-reader a11y

## Key paths
- COD: `src/data/cif/codSamples.ts`, `fetchRemoteCif.ts`, `public/samples/cod/`, `scripts/cod-cors-worker.js`
- H-bonds: `src/data/cif/hbonds.ts`
- Hand extras: `src/data/handExtra.ts`, `makeHandDemo.ts`
- Loci: `src/data/groups/deriveElements.ts`
- `npm test` · `npm run build:pages` · `scripts/deploy-gh-pages.sh`

## Still limited
- Arbitrary COD fetch on Pages without Cloudflare account / `VITE_COD_PROXY`
- Full WebGL / canvas SR a11y
- Some exotic cubic/rhombohedral loci may remain geometryLimited
- Remaining ~159 generated groups not hand-authored
- Cross-op H-bonds are geometric (need H in CIF); not a full H-placement refinement

## SHAs (this pass)
- 1 `a735854` → 2 `fa78f91` → 3 `a54ae4f` → 4 `fe2d5e7`
- Prior tip: `9cc2d9f`
- tests: 465
- main tip: `d220302`
- gh-pages: `4372010` (288 files; 45 COD cache CIFs)
