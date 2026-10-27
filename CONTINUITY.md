# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

Tip: `main` **a05866d**, `gh-pages` **f5e6e8a** (COD name/SMILES search + proxy). Tests: **547**.

## COD name / SMILES search (2026-10-27)
- Worker: `GET /search?text=` + `GET /search?smile=` (maps to COD `smarts`) in `scripts/cod-cors-worker.js`
- Client: `src/data/cif/codSearch.ts`; UI tabs on `CifLoadPanel`
- Vite: `/cod-search` middleware for local
- Production: derive search from `VITE_COD_PROXY` (strip `/{id}.cif`) → `https://crystal-cod-proxy.crystal-sg.workers.dev/search`
- Quirk: COD param is **`smarts`**, not `smile` (empty if forwarded wrong). Worker uses `format=lst` then hydrates ≤20 ids (broad SMILES JSON is multi-MB).

## Home UX (2026-10-27)
- CIF spotlight card under hero (`Structures` / `New`) → `/cif`
- Animated SVG hero cell (`HeroCellMotif`) — CSS tilt + atom drift; `prefers-reduced-motion` freezes
- No R3F on `/`

## COD workflows installed (2026-10-27)

`gh auth refresh` added **`workflow`** scope. Pushed to `main` **5de67db**:
- `.github/workflows/refresh-cod-cache.yml` → **Refresh COD cache** (active)
- `.github/workflows/deploy-cod-proxy.yml` → **Deploy COD CORS proxy** (active)

Templates also remain under `scripts/github-workflows/` for reference.

### Cloudflare COD proxy — done (2026-10-27)

- Workers subdomain: `crystal-sg`
- Worker: https://crystal-cod-proxy.crystal-sg.workers.dev/{id}.cif
- Repo Actions secrets set: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- Pages rebuilt with `VITE_COD_PROXY` → `gh-pages` **bfa0478** (keep `.nojekyll`)

Optional later: **Refresh COD cache** workflow_dispatch to refresh `public/samples/cod/`.

## Done — Pass 4 (Stages 2–3 + Stage 1 assist)

### Stage 2 — Hand polish +14
- Hand demos **71 → 85**: Pmm2, Pnnm, Pmmn, P43, P-4, I4/m, P4mm, P4/nmm, I4/mmm, I41/amd, R32, R3m, R-3m, P63mc
- `handExtra.ts` + `makeHandDemo` now uses locus-preferring `pickOperatorFocusIndices`

### Stage 3 — Pragmatic a11y
- SG: `aria-pressed` on Near/Cell, All/B+I, 3D|2D; richer canvas aria (system + overlay counts); op-row aria-labels
- CIF: View sheet focus trap + restore focus on Escape/close; `role="dialog"`; H-bond mode `aria-live`
- Skip links (Home + demo/CIF shells) → `#demo-main` / `#demo-sidebar`
- Still **not** full WebGL screen-reader a11y

### Stage 1 assist — COD workflows / cache
- Templates under `scripts/github-workflows/` (+ README)
- `.github/workflows/` install **blocked** without `workflow` scope (see above)
- COD same-origin cache **55** CIFs
- Arbitrary COD on live Pages still needs Cloudflare Worker + `VITE_COD_PROXY`

## Key paths
- Hand extras: `src/data/handExtra.ts`, `makeHandDemo.ts`
- A11y: `src/data/a11y/structureSummary.ts`, `CifViewport.tsx`, `App.tsx` skip-links
- COD: `scripts/github-workflows/`, `public/samples/cod/`, `scripts/fetch-cod-samples.sh`, `scripts/cod-cors-worker.js`, `scripts/wrangler.cod-proxy.toml`
- `npm test` · `npm run build:pages` · `scripts/deploy-gh-pages.sh`

## Still limited
- Workflow YAML not yet on remote `.github/workflows/`
- No Cloudflare secrets here → no live arbitrary-COD proxy
- Remaining ~145 generated groups not hand-authored
- Full WebGL / canvas SR a11y

## SHAs
- main tip: `aefab8d` (feat `fd12253`) — CONTINUITY update may advance tip
- gh-pages: `2a865ec` (299 files; 55 COD cache CIFs)
- tests: 535 · hand demos: 85
- Prior tip: `d1a2a79` / `20a7bc4`
