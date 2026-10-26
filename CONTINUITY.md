# Crystal space-group site — resume notes (2026-10-26)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`  
Plan canvas: https://cursor.com/canvas/store-47b63095-92bb-4ade-8ecd-d65e434f207d/99fd7be7-25b5-4ea5-9402-ecaaffb9adf8  
Latest: feature `FEATURE_SHA` · tip `TIP_SHA` · `gh-pages` `GHPAGES_SHA`

## Teaching core — complete
Major crystal-system exemplars are hand-polished (47 demos):
- **Triclinic:** P1, P-1 (full α/β/γ)
- **Monoclinic:** P2/m, P21/m, C2/m, P21/c, C2/c, …
- **Orthorhombic:** Pmmm, Cmmm, Fmmm, Pbca, Pnma, …
- **Tetragonal:** P4/mmm, P4₂/ncm, P41, I41, …
- **Trigonal/hex:** R-3, R-3c, P-3, P6/mmm, P6₃/mmc
- **Cubic:** Pm-3m, Fm-3, Fm-3m, Fd-3m, Im-3m, Ia-3d

Infrastructure: dedicated `mirror` class · 4₁/4₂/4₃/6/6₃/¯4 overlays · diagonal glides · cubic focus chips · hex γ=120 · tetra a=b · triclinic α/β/γ · mobile chips.

## Done (this batch)
- Hand: **191** P6/mmm, **47** Pmmm, **65** Cmmm, **69** Fmmm, **138** P4₂/ncm, **202** Fm-3
- Screw kinds **6** and **42** (+ 3D/2D overlays)
- Hand count **47**; vitest **269**

## Remaining high-value gaps (only)
- Niche teaching polish (e.g. more 4₂ family, R3c tertiary glide labels)
- UX: reset-view origin-front; mobile toolbar wrap ~390px; 2D still below 3D
- Optional CSD ranks 31+ long-tail if demand appears
- Pure-mirror / glide legend tweaks in older demos still listing both where only one applies

## Key paths
- New: `p6mmm` · `pmmm` · `cmmm` · `fmmm` · `p42ncm` · `fm3`
- `npm test` · `npm run build:pages`

## Deploy cadence tip
Commit on `main`, then `npm run build:pages` and force-push `dist/` to `gh-pages`.
