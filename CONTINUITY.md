# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

## Done — Deferred “out of scope” sprint (stages A–E)

### Stage A — COD CORS on Pages (`fe383e1`)
- Expanded same-origin cache: 16 COD CIFs under `public/samples/cod/` + `manifest.json` + teaching chips
- Client: cache → optional `VITE_COD_PROXY` → Vite `/cod-proxy` (dev) → direct COD
- Worker script + `wrangler.cod-proxy.toml` documented; no CF token in this repo → arbitrary non-cached ids still need user-deployed worker or paste/upload
- CSD: Access Structures link + upload/paste only (no scrape)

### Stage B — CIF v2 (`1721725`)
- Occupancy filter / altloc handling; residue coloring; Uiso balls + anisotropic ellipsoids when present
- Phone View-sheet toggles for color/thermal

### Stage C — Exotic loci (`3bf6cb2`)
- Face-diagonal 2-folds, 4 ‖ a/b, per-op body-diagonal 3-folds where math is reliable
- Remaining geometryLimited cases keep clearer notes

### Stage D — Generated polish (`86ad6b7`)
- Richer blurbs (CSD rank when in top table, overlay counts, honesty note)
- Locus-preferring focus chips; `demoSource`; Hand-tuned / Generated badges

### Stage E — Pragmatic a11y (`1201f37`)
- Structure summaries + load live region; canvas `role="img"` aria-labels (CIF + SG)
- Escape closes View sheet; `aria-pressed` on toolbar/ops; focus-visible rings
- Not full WebGL screen-reader a11y

## Key paths
- COD: `src/data/cif/codSamples.ts`, `fetchRemoteCif.ts`, `public/samples/cod/`, `scripts/cod-cors-worker.js`
- CIF UI: `src/components/cif/*`, `src/pages/CifExplorerPage.tsx`
- A11y: `src/data/a11y/structureSummary.ts`
- Loci: `src/data/groups/deriveElements.ts`
- `npm test` · `npm run build:pages` · `scripts/deploy-gh-pages.sh`

## Deferred leftovers (with reason)
- **Arbitrary COD on Pages without proxy**: needs a hosted CORS worker (`VITE_COD_PROXY`); cache covers teaching ids only
- **Full WebGL / canvas SR a11y**: WebGL has no real accessibility tree; summaries + controls only
- **Cross-op H-bond dimer clustering**: chemically ambiguous; kept per-operator intact molecules
- **Some exotic d-glide / off-origin loci**: still geometryLimited when locus math is unreliable
- **Hand-authoring remaining ~173 groups**: badges + better generated blurbs instead

## SHAs (this sprint)
- A `fe383e1` → B `1721725` → C `3bf6cb2` → D `86ad6b7` → E `1201f37`
- Prior tip before A: `9978524`
- tests: 390
- main tip: `4c74616`
- gh-pages: `8e370a5` (259 files; includes 16 COD cache CIFs)
