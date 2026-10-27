# GitHub Actions templates (COD)

These YAML files are **templates**. Copy them into `.github/workflows/` when your
push credential has the `workflow` scope (GitHub App / PAT). A token with only
`repo` cannot create or update workflow files.

## Enable COD cache refresh

```bash
mkdir -p .github/workflows
cp scripts/github-workflows/refresh-cod-cache.yml .github/workflows/
git add .github/workflows/refresh-cod-cache.yml
git commit -m "ci: add COD cache refresh workflow"
git push
```

Then run **Actions → Refresh COD cache → Run workflow**, or wait for the monthly schedule.

## Enable COD CORS proxy (arbitrary COD ids on GitHub Pages)

1. Create a Cloudflare account and API token with Workers deploy rights.
2. Add repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
3. Copy and push `deploy-cod-proxy.yml` (same `workflow` scope requirement).
4. After deploy, rebuild the site with  
   `VITE_COD_PROXY="https://YOUR_WORKER.workers.dev/{id}.cif"`  
   then orphan-deploy Pages (`npm run build:pages` + `scripts/deploy-gh-pages.sh`).
5. Manual alternative (no Actions):  
   `npx wrangler deploy -c scripts/wrangler.cod-proxy.toml`

Without the proxy, live Pages still serves the **bundled same-origin cache**
(`public/samples/cod/` + teaching chips). Arbitrary non-cached COD ids need
upload/paste or the worker.
