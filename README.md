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
- **Publications** (`/pubs`): **Recent titles** (live Crossref metadata for ACS / IUCr / RSC / Wiley crystallography journals) + curated COD by **year** + tags → DOI (+ CIF map for COD)
- **CIF symmetry map** (`/cif`): load by **COD code** (e.g. `1100303`), paste/upload a CIF (CSD via Access Structures), intact molecules + operator colors + lattice a/b/c on the cell
- **Morphology** (`/morphology`): 2D Wulff / relative-velocity outline from face growth-rate sliders + habit labels
- **Kinetics** (`/kinetics`): schematic nucleation rate / induction time vs σ, growth-mechanism overlays, size vs time

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


## Deep links on GitHub Pages

Vite copies `index.html` → `dist/404.html` so client-side routes like `/sg/14` still boot the SPA after a hard refresh. GitHub Pages returns **HTTP 404** with that SPA body — browsers load the app; crawlers and some chat unfurlers see a 404 status. Prefer sharing from in-app navigation, or open the link in a browser. (Cloudflare/Pages rewrites that return 200 are optional and not required for local use.)

CIF UI contract tests (`cifUiContracts.test.ts`) are **source-string contracts**, not R3F paint tests — they lock toolbar labels and CSS selectors against regressions.

## Layout

| Path | Role |
|------|------|
| `src/data/*Demo.ts` / hand `src/data/*.ts` | Per-group teaching data |
| `src/data/generatedDemo.ts` | Fallback demos for non-hand groups |
| `src/data/groups/` | Triplet parse, det/trace classify, element derivation |
| `src/data/cif/` | CIF parse + AU×ops expand |
| `src/pages/SpaceGroupPage.tsx` | Demo chrome |
| `src/pages/CifExplorerPage.tsx` | CIF map |
| `src/pages/PublicationsPage.tsx` | Pubs browser (Crossref + curated COD) |
| `src/data/pubs/` | Curated COD cards, Crossref client, tag filters |
| `src/pages/MorphologyPage.tsx` | Crystal morphology teaching + 2D Wulff |
| `src/data/morphology/` | Wulff polygon + habit helpers |
| `src/pages/KineticsPage.tsx` | Nucleation / growth kinetics teaching plots |
| `src/data/kinetics/` | Schematic rate models |
| `src/pages/IndexPage.tsx` | Catalog / primer / guide |
| `public/ita-diagrams/` | ITA Vol. A plates |
| `CONTINUITY.md` | Agent resume notes |

## CIF map (`/cif`)

- **Intact molecules**: min-image bonding + unwrap so copies are not chopped by the cell
- **Symmetry operators**: ITA xyz list, color-matched to 3D copies; Molecules / All / BASE+IMAGE / AU
- **Lattice**: a/b/c labels (Å) on the box + α/β/γ badge
- **COD load**: enter a numeric id → tries bundled same-origin cache (`public/samples/cod/` + teaching chips; **55** curated CIFs), optional `VITE_COD_PROXY`, Vite `/cod-proxy` (dev/preview), then direct `crystallography.net`. Direct COD lacks CORS on GitHub Pages for arbitrary ids — use a chip, paste/upload, or deploy the CORS worker (below).
- **COD name / SMILES search**: load panel tabs **Name** and **SMILES** call the same worker at `GET /search?text=…` or `GET /search?smile=…` (SMILES forwarded upstream as COD `smarts`). Hits (id, space group, formula, volume, name) → existing CIF fetch path. Local vite/preview: `/cod-search`. Optional override: `VITE_COD_SEARCH`. No SMARTS editor; we do not scrape CSD.
- **COD proxy (optional, for arbitrary ids + search on Pages)**:
  1. Copy Actions templates when your push token has **`workflow` scope**: see `scripts/github-workflows/README.md` (files may already live under `.github/workflows/` once enabled).
  2. Manual worker: `npx wrangler deploy -c scripts/wrangler.cod-proxy.toml` (needs Cloudflare account). Repo secrets for Actions: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
  3. Rebuild Pages: `VITE_COD_PROXY="https://YOUR_WORKER.workers.dev/{id}.cif" npm run build:pages` then `scripts/deploy-gh-pages.sh` (must keep `.nojekyll`). Search base is derived by stripping `/{id}.cif`.
  4. Refresh teaching cache: `bash scripts/fetch-cod-samples.sh` (or Actions → **Refresh COD cache**).
- **Visitor counter** (footer chip `Visits: N`): privacy-light hit counter on the same worker at `GET /visits` (Durable Object). Increments **once per browser tab session** (`sessionStorage` gate); `?peek=1` reads without bumping. Optional `VITE_VISITS_URL` (default = COD proxy origin + `/visits`). Shows `—` if the endpoint is unreachable. No Google Analytics or trackers.
- **CSD**: no free anonymous CIF API; UI links to [CCDC Access Structures](https://www.ccdc.cam.ac.uk/structures/) for download, then upload/paste. We do not scrape CSD.

## Publications (`/pubs`)

- **Recent titles** tab: live Crossref REST metadata (title, journal, year, authors, publisher, DOI) filtered by ISSN presets — ACS (Crystal Growth & Design, Inorganic Chemistry), IUCr (Acta A/B/C/E, IUCrJ, J. Appl. Cryst.), RSC (CrystEngComm), Wiley (Crystal Research and Technology), or the union. Default window = last 3 years; Load more via Crossref cursor. Keyword chips on cards are title hints only.
- **Curated COD** tab: teaching subset (includes a 2020–2024 refresh) with year, journal, DOI, formula, space group, and tags; cards link to DOI and `/cif?cod=`
- Crossref is proxied by the Cloudflare worker `GET /crossref?…` (polite User-Agent) so GitHub Pages can call it; Vite also exposes `/crossref` in dev/preview. Direct Crossref has CORS `*` but browsers cannot set the mailto User-Agent.
- No PDF hosting, no publisher HTML scrape, no CSD scrape. Optional worker `GET /search?year=YYYY` for live COD year lists (capped)

## Stack

Vite + React + TypeScript + Three.js (`@react-three/fiber`, `@react-three/drei`) + react-router

## License

This project is released under the [MIT License](LICENSE).
