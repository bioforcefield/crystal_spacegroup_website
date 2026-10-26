# Crystal space-group site — resume notes (2026-10-26)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`  
Plan canvas: https://cursor.com/canvas/store-47b63095-92bb-4ade-8ecd-d65e434f207d/99fd7be7-25b5-4ea5-9402-ecaaffb9adf8  
Latest: `main` _(pending)_ · `gh-pages` _(pending)_

## Done
- All 230 `/sg/N` interactive (gemmi ITA JSON → `generatedDemo.ts`; catalog all `ready`)
- Hand overrides (**13**): **1** P1, **2** P-1, **4** P21, **5** C2, **9** Cc, **14** P21/c, **15** C2/c, **19** P212121, **29** Pca21, **33** Pna21, **60** Pbcn, **61** Pbca, **62** Pnma
- Foundation: CONTRACT.md, parseTriplet/buildOperators/closure/deriveElements, vitest
- Pages: `PAGES=1` build + force-push `gh-pages` (no Actions token)
- **Mobile UX:** pinch-zoom + operator chip strip; pure-mirror planes skip zero-glide arrows
- **Hand polish (2026-10-26):** Pna21, P21, Cc, then P1, Pnma, C2, Pbcn, Pca21

## Gaps / next
- Teaching cells: unique-b β only — no triclinic α/γ, no hex/trigonal γ=120°
- `deriveElements` sparse for many ortho/tetra/cubic; class labels heuristic
- Reset view orbits **cell center** — optional: origin-front reset
- Next polish queue: **R-3 (148)** (needs hex γ=120 teaching cell — deferred), then lower-CSD Wave B (e.g. P21/m, C2/m, Pbcm, …) or infrastructure
- Mobile remaining: toolbar wraps on ~390px; 2D still below 3D on phone
- Domain idea: `spacegroups.app`

## Key paths
- `src/data/itaSpaceGroups.json`, `generatedDemo.ts`, `registry.ts` (`HAND_DEMOS`)
- Hand modules: `p1.ts`, `pbar1.ts`, `p21.ts`, `c2.ts`, `cc.ts`, `p21c.ts`, `c2c.ts`, `p212121.ts`, `pca21.ts`, `pna21.ts`, `pbcn.ts`, `pbca.ts`, `pnma.ts`
- `npm run gen:ita` · `npm test` · `npm run build:pages`
