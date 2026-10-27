# Crystal space-group site — resume notes (2026-10-26)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`  
Plan canvas: https://cursor.com/canvas/store-47b63095-92bb-4ade-8ecd-d65e434f207d/99fd7be7-25b5-4ea5-9402-ecaaffb9adf8  
Latest: feature `2bc5341` · tip `b9cb5c5` · `gh-pages` `0dc1f80`

## Teaching core — complete
Major crystal-system exemplars are hand-polished (**47** demos) across triclinic → cubic. No further large hand-demo wave unless demand.

## Done (this batch — legend cleanup)
- Axis-aware / teaching-aligned **class legend labels** on older hand demos (Pbca, P212121, C2221, Cmca, Pbcn, Pnma, Fdd2, P41, I41, P21212, Pccn, Cmc21, P21/m, C2/m, P41212, P43212, P63/mmc, P6/mmm, P42/ncm).
- Missing **c-glide** added to `classLegendOrder` for Fm-3m, Ia-3d, Fd-3m, Cmca.
- Adaptive **elements-legend** strip on SpaceGroupPage (hides unused inversion / axis / glide chips — e.g. P1).

### Before → after examples
- Pbca: `a-glide` → `a-glide ⊥ c`; `2₁ screw` → `2₁ screw ‖ a,b,c`
- P212121: `2₁ screw` → `2₁ screw ‖ a,b,c`
- C2221: `2-fold` / `2₁ screw` → `2-fold ‖ a,b` / `2₁ screw ‖ a,b,c`
- Cmca: bare `n-glide` → `n-glide ⊥ b` (+ c-glide in legend)

## Remaining gaps (only)
- R-3c tertiary glide labels (approximate)
- 2D diagram still secondary to 3D on mobile
- Optional CSD ranks 31+ if demand

## Key paths
- Hand demos: `src/data/*.ts` (`SYMMETRY_CLASSES` + `CLASS_LEGEND_ORDER`)
- Elements legend: `src/pages/SpaceGroupPage.tsx`
- Camera: `src/components/UnitCellScene.tsx` (`DEFAULT_CAM_DIR` / `DEFAULT_CAM_POS`)
- Toolbar labels: `src/pages/SpaceGroupPage.tsx` (`.label-full` / `.label-short`)
- CSS: `src/index.css` (@media 900px + 420px)
- `npm test` · `npm run build` · Pages via `dist/` → `gh-pages`

## Deploy cadence tip
Commit on `main`, build, copy `dist/{index.html,404.html,assets}` onto `gh-pages`, force-push. Do not `git rm -rf` while `node_modules` is present.
