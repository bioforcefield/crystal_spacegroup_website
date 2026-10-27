# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

## Done — Review #2 “sensible next sprint” (5 stages)

### Stage 1 — Non-axis loci / teaching honesty (`3c988d5`)
- `deriveBodyDiagonalThreefolds` + `deriveDiagonalGlides`
- classify: pure 6 → `sixfold`; −6 → `sixfold` (not threefold/screw)
- Per-system `geometryLimited` notes

### Stage 2 — Split CIF UI (`a9c11be`)
- `CifLoadPanel` / `CifStructurePanel` / `CifViewport`; page ~290 lines
- Lazy `CifStructureScene`; vite `r3f` manualChunk

### Stage 3 — Z′ + special positions (`4aef6c9`)
- Prefer CIF Z′ tags; `Z′ = Z/N_ops` note; warnings for non-integer / incomplete ops

### Stage 4 — Shared Near/Cell (`f07d994`)
- `latticeNeighbors.ts` shared by SG + CIF placement + molecules

### Stage 5 — Phone View sheet (this tip)
- ≤900px View drawer; Molecules + Near/Cell one-tap; lattice strip not over canvas

## Key paths
- CIF UI: `src/components/cif/*`, `src/pages/CifExplorerPage.tsx`
- Loci: `src/data/groups/deriveElements.ts`, `buildOperators.ts`
- Placement: `src/data/latticeNeighbors.ts`, `nearestImages.ts`, `cif/placement.ts`
- `npm test` · `npm run build:pages` · `scripts/deploy-gh-pages.sh`

## Deferred
- Full 3D screen-reader a11y
- CIF residue clustering / ellipsoids / occupancy filter
- Production COD CORS needs `VITE_COD_PROXY`
- Hand vs generated demo polish gap (~57 hand / 173 generated)
- Some exotic d-glide / off-origin loci may still be geometryLimited

## SHAs
- main tip: `78e310e` (feature tip `2498d99` + CONTINUITY)
- Stage commits: 3c988d5 → a9c11be → 4aef6c9 → f07d994 → 29d0440 (+ 2498d99 metadata fix)
- gh-pages: `7094d40` (243 files)
- tests: 376
