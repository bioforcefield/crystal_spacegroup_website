# Crystal space-group site — resume notes (2026-10-26)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`  
Plan canvas: https://cursor.com/canvas/store-47b63095-92bb-4ade-8ecd-d65e434f207d/99fd7be7-25b5-4ea5-9402-ecaaffb9adf8  
Latest: `main` _(pending)_ · `gh-pages` _(pending)_

## Done
- All 230 `/sg/N` interactive (gemmi ITA JSON → `generatedDemo.ts`; catalog all `ready`)
- Hand overrides: **2** P-1, **4** P21, **9** Cc, **14** P21/c, **15** C2/c, **19** P212121, **33** Pna21, **61** Pbca
- Foundation: CONTRACT.md, parseTriplet/buildOperators/closure/deriveElements, vitest
- Pages: `PAGES=1` build + force-push `gh-pages` (no Actions token)
- **Mobile UX (2026-10-26):** pinch-zoom via `userZoomRef`; horizontal operator chip strip on ≤900px
- **Hand polish (2026-10-26):** Pna21 (33), P21 (4), Cc (9) — polar/non-centro teaching set

## Gaps / next
- Teaching cells: unique-b β only — no triclinic α/γ, no hex/trigonal γ=120°
- `deriveElements` sparse for many ortho/tetra/cubic; class labels heuristic
- Reset view orbits **cell center** — optional: origin-front reset
- Next high-CSD polish queue: **P1 (1)**, **Pnma (62)**, **C2 (5)**, **Pbcn (60)**, **R-3 (148)** / **Pca21 (29)**
- Mobile remaining: toolbar wraps on ~390px; 2D still below 3D on phone
- Domain idea: `spacegroups.app`

## Key paths
- `src/data/itaSpaceGroups.json`, `generatedDemo.ts`, `registry.ts` (`HAND_DEMOS`)
- Hand modules: `pbar1.ts`, `p21.ts`, `p21c.ts`, `cc.ts`, `c2c.ts`, `p212121.ts`, `pna21.ts`, `pbca.ts`
- `npm run gen:ita` · `npm test` · `npm run build:pages`
