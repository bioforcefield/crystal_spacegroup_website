# Crystal space-group site — resume notes (2026-10-26)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`  
Plan canvas: https://cursor.com/canvas/store-47b63095-92bb-4ade-8ecd-d65e434f207d/99fd7be7-25b5-4ea5-9402-ecaaffb9adf8  
Latest: feature `dab6111` · tip `dab6111` · `gh-pages` `e1dc55a`

## Teaching core — complete (+ CSD 31–42)
Hand-polished demos: **57** (was 47). CSD top 42 covered by hand where not already polished earlier.

## Done (this batch)
### Part A — R-3c tertiary glide labels
- Primary c-glide op labels plane-specific: `c-glide · x=−y`, `· y=2x`, `· x=2y`
- Three tertiary / R-related corner overlays (`primary: false`) for T1 images: `x+y=1`, `y=2x−1`, `x=2y−1` (marked approx in locus)
- `elementLocusForOp` plane-specific for ops 10–12 and R images 22/23/24 + 34/35/36
- Class legend: `c-glide ‖ c (vertical)`

### Part B — CSD ranks 31+ hand polish (10 new)
| Rank | No. | HM | File |
| --- | --- | --- | --- |
| 31 | 86 | P42/n | p42n.ts |
| 33 | 70 | Fddd | fddd.ts |
| 34 | 176 | P63/m | p63m.ts |
| 35 | 114 | P-421c | p421c.ts |
| 36 | 52 | Pnna | pnna.ts |
| 38 | 41 | Aba2 | aba2.ts |
| 39 | 161 | R3c | r3c.ts |
| 40 | 63 | Cmcm | cmcm.ts |
| 41 | 57 | Pbcm | pbcm.ts |
| 42 | 205 | Pa-3 | pa3.ts |

(Skipped already-hand ranks 32 P-3, 37 Fm-3m.)  
`CSD_TOP_FREQUENCY` extended through rank 42.

## Remaining gaps (only)
- 2D diagram still secondary to 3D on mobile

## Key paths
- Hand demos: `src/data/*.ts` (`SYMMETRY_CLASSES` + `CLASS_LEGEND_ORDER`)
- Elements legend: `src/pages/SpaceGroupPage.tsx`
- Camera: `src/components/UnitCellScene.tsx` (`DEFAULT_CAM_DIR` / `DEFAULT_CAM_POS`)
- Toolbar labels: `src/pages/SpaceGroupPage.tsx` (`.label-full` / `.label-short`)
- CSS: `src/index.css` (@media 900px + 420px)
- `npm test` · `npm run build:pages` · Pages via `dist/` → `gh-pages`

## Deploy cadence tip
Commit on `main`, build with `PAGES=1`, copy `dist/{index.html,404.html,assets}` onto `gh-pages`, force-push. Do not `git rm -rf` while `node_modules` is present.
