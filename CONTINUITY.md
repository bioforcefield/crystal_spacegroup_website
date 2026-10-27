# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`
Tip: `main` **aefab8d** (feat **fd12253**), `gh-pages` **2a865ec**. Tests: **535**.
Pages note: orphan deploy must include `.nojekyll` or GH Pages Jekyll fails on large sample trees.

## COD workflows install attempt (Cursor GitHub connected)

**Blocked for `.github/workflows/` on remote.** Cursor GitHub MCP is connected and can list Actions, but content pushes still use the local `gh` OAuth token scopes: `gist`, `read:org`, `repo` — **no `workflow`**. Exact reject:

```
refusing to allow an OAuth App to create or update workflow
`.github/workflows/deploy-cod-proxy.yml` without `workflow` scope
```

Contents API create also failed (404 / no write of workflow paths). Inline cursor-github has **no** create/update-file API; CloudAgent tool not available in this executor session.

**On remote today:** only GitHub’s dynamic `pages-build-deployment` workflow. Templates remain at:
- `scripts/github-workflows/refresh-cod-cache.yml` → name **Refresh COD cache**
- `scripts/github-workflows/deploy-cod-proxy.yml` → name **Deploy COD CORS proxy**
- `scripts/github-workflows/README.md`

Local untracked copies may exist under `.github/workflows/` on the box (ready once scope is granted).

### Unblock (pick one)

1. **Web UI (no new token):** GitHub → repo → Add file → create  
   `.github/workflows/refresh-cod-cache.yml` and  
   `.github/workflows/deploy-cod-proxy.yml`  
   by pasting the matching files from `scripts/github-workflows/`.
2. **OAuth `workflow` scope:** on a machine with browser,  
   `gh auth refresh -h github.com -s repo,workflow,read:org,gist`  
   then from the box: copy templates → commit → `git push origin main`.
3. **Classic PAT** with `repo` + `workflow`, configure as git HTTPS credential, push.

After files land, confirm: Actions tab should list **Refresh COD cache** and **Deploy COD CORS proxy**.

### Remaining user steps — Cloudflare + `VITE_COD_PROXY`

(Cannot invent CF credentials.)

1. Cloudflare account → API token with Workers deploy rights; note Account ID.
2. Repo **Settings → Secrets and variables → Actions**:  
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
3. With workflows installed: **Actions → Deploy COD CORS proxy → Run workflow**  
   **or** locally: `npx wrangler deploy -c scripts/wrangler.cod-proxy.toml`
4. Note worker URL, e.g. `https://crystal-cod-proxy.<subdomain>.workers.dev/{id}.cif`
5. Rebuild & orphan-deploy Pages with proxy baked in:  
   `VITE_COD_PROXY="https://crystal-cod-proxy.<subdomain>.workers.dev/{id}.cif" npm run build:pages`  
   then `scripts/deploy-gh-pages.sh` (keep `.nojekyll`).
6. Optional: **Refresh COD cache** monthly / workflow_dispatch to refresh `public/samples/cod/`.

Without the proxy, live site still serves the **55** same-origin teaching COD samples.

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
