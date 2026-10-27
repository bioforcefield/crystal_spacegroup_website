# Crystal Space Groups

Interactive teaching site for all **230 crystallographic space groups**: linked 3D unit-cell demos, 2D projections, ITA Vol. A diagram plates, and a client-side **CIF symmetry map**.

Live: https://bioforcefield.github.io/crystal_spacegroup_website/

## Features

- **230 demos** (`/sg/{1–230}`) built from gemmi ITA general positions
- **71 hand-polished** teaching demos (CSD top groups + textbook core) with curated loci and blurbs
- Color-coded operators (identity, screws, inversions, mirrors, a/b/c/n/d-glides, n-folds)
- BASE → IMAGE highlight with nearest-image or in-cell placement
- Geometric element overlays where axis-aligned loci can be derived; honest “operators / limited geometry” note otherwise
- ITA Vol. A primary diagrams + Birkbeck/UCL reference links per group
- **CIF symmetry map** (`/cif`): load by **COD code** (e.g. `1100303`), paste/upload a CIF (CSD via Access Structures), intact molecules + operator colors + lattice a/b/c on the cell

## Run locally

```bash
npm install
npm run dev          # Vite dev server (usually http://localhost:5173/)
npm test             # vitest
npm run build        # production → dist/
npm run build:pages  # same with Pages base path
npm run preview
```

Optional: regenerate ITA JSON from gemmi

```bash
.venv/bin/python scripts/export_ita_groups.py
npm run gen:ita
```

## Deploy to GitHub Pages (**important**)

Publish **only** the Vite `dist/` output as an **orphan** `gh-pages` branch. Never force-push from the dirty working tree or repo root (that would publish `node_modules`).

```bash
npm run build:pages
TMP=$(mktemp -d)
cp -a dist/. "$TMP/"
# expect ~230+ files under ita-diagrams/, assets/, index.html — not node_modules
( cd "$TMP" && git init && git checkout -b gh-pages \
    && git add -A && git commit -m "Pages deploy" \
    && git remote add origin git@github.com:bioforcefield/crystal_spacegroup_website.git \
    && git push -f origin gh-pages )
rm -rf "$TMP"
```

Or equivalent: clone/`worktree` of `gh-pages`, replace contents with `dist/`, commit, force-push.

## Layout

| Path | Role |
|------|------|
| `src/data/*Demo.ts` / hand `src/data/*.ts` | Per-group teaching data |
| `src/data/generatedDemo.ts` | Fallback demos for non-hand groups |
| `src/data/groups/` | Triplet parse, det/trace classify, element derivation |
| `src/data/cif/` | CIF parse + AU×ops expand |
| `src/pages/SpaceGroupPage.tsx` | Demo chrome |
| `src/pages/CifExplorerPage.tsx` | CIF map |
| `src/pages/IndexPage.tsx` | Catalog / primer / guide |
| `public/ita-diagrams/` | ITA Vol. A plates |
| `CONTINUITY.md` | Agent resume notes |

## CIF map (`/cif`)

- **Intact molecules**: min-image bonding + unwrap so copies are not chopped by the cell
- **Symmetry operators**: ITA xyz list, color-matched to 3D copies; Molecules / All / BASE+IMAGE / AU
- **Lattice**: a/b/c labels (Å) on the box + α/β/γ badge
- **COD load**: enter a numeric id → tries bundled same-origin cache (`public/samples/cod/` + teaching chips; **55** curated CIFs), optional `VITE_COD_PROXY`, Vite `/cod-proxy` (dev/preview), then direct `crystallography.net`. Direct COD lacks CORS on GitHub Pages for arbitrary ids — use a chip, paste/upload, or deploy the CORS worker (below).
- **COD proxy (optional, for arbitrary ids on Pages)**:
  1. Copy Actions templates when your push token has **`workflow` scope**: see `scripts/github-workflows/README.md` (files may already live under `.github/workflows/` once enabled).
  2. Manual worker: `npx wrangler deploy -c scripts/wrangler.cod-proxy.toml` (needs Cloudflare account). Repo secrets for Actions: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
  3. Rebuild Pages: `VITE_COD_PROXY="https://YOUR_WORKER.workers.dev/{id}.cif" npm run build:pages` then `scripts/deploy-gh-pages.sh` (must keep `.nojekyll`).
  4. Refresh teaching cache: `bash scripts/fetch-cod-samples.sh` (or Actions → **Refresh COD cache**).
- **CSD**: no free anonymous CIF API; UI links to [CCDC Access Structures](https://www.ccdc.cam.ac.uk/structures/) for download, then upload/paste. We do not scrape CSD.

## Stack

Vite + React + TypeScript + Three.js (`@react-three/fiber`, `@react-three/drei`) + react-router
