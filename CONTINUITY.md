# Crystal space-group site — resume notes (2026-10-26)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`  
Plan canvas: https://cursor.com/canvas/store-47b63095-92bb-4ade-8ecd-d65e434f207d/99fd7be7-25b5-4ea5-9402-ecaaffb9adf8  
Latest: feature `d71a83b` · tip `e5bb025` · `gh-pages` `68448f6`

## Teaching core — complete
Major crystal-system exemplars are hand-polished (**47** demos) across triclinic → cubic. No further large hand-demo wave unless demand.

## Done (this batch — UX)
- **Reset view / origin-front:** `DEFAULT_CAM_DIR` flipped to (−2.4, +1.55, −2.6) so the crystallographic origin (scene group at −center) sits toward the front of the default framing. FitCamera distance/zoom, pinch/wheel, and cell-center orbit damping unchanged.
- **Mobile ~390px:** short toolbar labels (Near / Cell / All / B+I / Reset); nowrap + horizontal scroll toolbar; tighter 900px + 420px chip/seg padding. Operator chip strip + pinch zoom preserved.

## Remaining gaps (only)
- R-3c tertiary glide labels (approximate)
- 2D diagram still secondary to 3D on mobile
- Optional CSD ranks 31+ if demand
- Minor older-demo legend wording (skipped — not quick)

## Key paths
- Camera: `src/components/UnitCellScene.tsx` (`DEFAULT_CAM_DIR` / `DEFAULT_CAM_POS`)
- Toolbar labels: `src/pages/SpaceGroupPage.tsx` (`.label-full` / `.label-short`)
- CSS: `src/index.css` (@media 900px + 420px)
- `npm test` · `npm run build` · Pages via `dist/` → `gh-pages`

## Deploy cadence tip
Commit on `main`, build, copy `dist/{index.html,404.html,assets}` onto `gh-pages`, force-push. Do not `git rm -rf` while `node_modules` is present.
