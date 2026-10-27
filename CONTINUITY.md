# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`
Tip: `main` **b9c9a26** (feat fd12253), `gh-pages` **2a865ec**. Tests: **535**.
Pages note: orphan deploy must include `.nojekyll` or GH Pages Jekyll fails on large sample trees.

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
- Templates improved under `scripts/github-workflows/` (+ README)
- Attempted `.github/workflows/` copy — push may need **`workflow` scope** (parent/user)
- COD same-origin cache **45 → 55** CIFs; teaching chips +2 (NaCl, ZnS/P63mc)
- Arbitrary COD on live Pages still needs Cloudflare Worker + `VITE_COD_PROXY`

## Key paths
- Hand extras: `src/data/handExtra.ts`, `makeHandDemo.ts`
- A11y: `src/data/a11y/structureSummary.ts`, `CifViewport.tsx`, `App.tsx` skip-links
- COD: `scripts/github-workflows/`, `public/samples/cod/`, `scripts/fetch-cod-samples.sh`
- `npm test` · `npm run build:pages` · `scripts/deploy-gh-pages.sh`

## Still limited
- Workflow YAML in `.github/workflows/` may be blocked without `workflow` scope
- No Cloudflare secrets here → no live arbitrary-COD proxy
- Remaining ~145 generated groups not hand-authored
- Full WebGL / canvas SR a11y

## SHAs (this pass)
- main tip: `b9c9a26` (feat `fd12253`)
- gh-pages: `2a865ec` (299 files; 55 COD cache CIFs)
- tests: 535
- hand demos: 85
- Prior tip: `d1a2a79` / `20a7bc4`
