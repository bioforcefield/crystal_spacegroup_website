# Crystal space-group site — resume notes (2026-10-27)

Live: https://crystalspacegroups.com/ (also https://bioforcefield.github.io/crystal_spacegroup_website/)  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

## Front-page spotlights
- CIF / Publications / Morphology+kinetics share `.home-spotlights` (1280px, same padding as hero/main)
- Pubs + teach sit in equal-height `.home-spotlight-row` (2-col → 1-col ≤900px)
- Hero uses same 1.4rem inset column as spotlights/main (no double outer pad)
- System cards stretch evenly in the explore grid

## SG 11 · P21/m teaching AU (2026-10-28)
- User report: overlaps on /sg/11. Operators already matched ITA unique-axis b (`x,y,z`; `−x,y+½,−z`; `−x,−y,−z`; `x,−y+½,z`) — mirror at y=¼, not wrong generators.
- Root cause: teaching seed reused P21/c’s `[0.18, 0.22, 0.31]` so Δy to the mirror ≈ 0.03; identity↔mirror (and 2₁↔inversion) sat ~0.07 apart with no c-glide to separate them.
- Fix: seed → `[0.18, 0.08, 0.31]` (general position; min pairwise ≈ 0.39). Tests: `p21mPlacement.test.ts`.

## Teaching AU seed clearance (2026-10-28)
- Audit of all 230 demos: many shared default seeds (`[0.17,0.23,0.31]` / monoclinic `[0.18,0.22,0.31]` / ortho `[0.22,0.15,0.3]`) sat near mirrors or diagonal planes — same class of bug as SG 11.
- Shared module `src/data/teachingSeed.ts`: `minMotifSeparation`, `pickTeachingSeed`, scaled clearance floors.
- `generatedDemo` + `makeHandDemo` auto-pick seeds; 41 hand files retuned. No ITA operator bugs found.
- Tests: `teachingSeed.test.ts` (+ link from `p21mPlacement.test.ts`). Suite 687 green.

## CIF map — camera + Cell HUD (2026-10-27 night)
- Root cause of “invisible 3D until Cell click”: FitCifCamera ran once on a 0/pathological canvas size (or lagged R3F `size`); expanding the Cell chip reflowed the flex canvas and only then re-fit.
- Fix: `aspectForFit` / `isUsableCanvasSize` / clamped aspect; retry + ResizeObserver + live `clientWidth/Height`; `updateProjectionMatrix`; pure `computeCifViewBounds`.
- Cell HUD blur: `.cif-canvas-frame > div { height:100% }` also matched the lattice badge → full-canvas `backdrop-filter` over the molecule. Fix: R3F root class `.cif-r3f-root` only; lattice strip **outside** canvas (above 3D); no badge backdrop-filter; opaque strip.
- Cell HUD: always-on a/b/c + angles + origin via strip (no expand gate). In-cell short label → **Wrap**.
- Tests: `fitCamera.test.ts`, `cellBadgeModel.test.ts`, `cifUiContracts.test.ts` (covering-HUD contracts).

## CIF map layout (earlier evening)
- Desktop toolbar wraps in-bounds; canvas frame absolutely fills `.canvas-wrap`
- Display menu / legend / chips / Teaching view unchanged

## Cloudflare COD proxy
- Worker: https://crystal-cod-proxy.crystal-sg.workers.dev/{id}.cif
- Deploy: `VITE_COD_PROXY=https://crystal-cod-proxy.crystal-sg.workers.dev bash scripts/deploy-gh-pages.sh`

## Key paths
- `npm test` · deploy script above

## SHAs
- main: `cf5e394`
- gh-pages: `919a993` (VITE_COD_PROXY baked; CNAME crystalspacegroups.com)
