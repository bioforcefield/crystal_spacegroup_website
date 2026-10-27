# Crystal space-group site — resume notes (2026-10-27)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`  
Plan canvas: https://cursor.com/canvas/store-47b63095-92bb-4ade-8ecd-d65e434f207d/99fd7be7-25b5-4ea5-9402-ecaaffb9adf8  
Latest: feature `1425cc9` · tip `9961f3d` · `gh-pages` `b05904b`

## Done (this batch) — code review + CIF symmetry map v1
- **Review** documented in agent report (High/Medium/Low). Small cleanups shipped: removed dead `PbcaPage` / `DemoById`; Index guide legend imports `symmetryPalette` instead of `pbca`; `CONTRACT.md` cell limitations updated (α/β/γ now modeled).
- **CIF explorer** at `/cif` (nav “CIF map” + home CTA):
  - Client-side CIF 1.1 parse (`src/data/cif/parseCif.ts`) — cell, SG number/HM, symop loop, fractional atom sites.
  - Expand AU by ITA operators via `getDemo(n)` when number known, else CIF symops (`expandStructure.ts`).
  - 3D view: each symmetry copy tinted by operator; bonds within copy; All / BASE+IMAGE / AU toggles; deep-link to `/sg/{n}`.
  - Sample: `public/samples/acetic_p21c.cif` (synthetic P21/c).
  - Tests: `src/data/cif/__tests__/parseCif.test.ts` (329 total green).

## Teaching core
Hand-polished demos: **57** (CSD top 42 + textbook core).

## Remaining gaps
- CIF v1: no residue/molecule clustering beyond AU×ops; no disorder/`_atom_site_occupancy` filter; no anisotropic ellipsoids; Cartesian coords unsupported; large CIFs (proteins) will be slow / crowded.
- Generated demos: element overlays still best-effort outside unique-b monoclinic + inversion.
- 2D diagram still secondary to 3D on mobile.
- Bundle ~1.7 MB JS — consider route-level code-split for R3F / CIF later.

## Key paths
- Hand demos: `src/data/*.ts`
- CIF: `src/data/cif/*`, `src/pages/CifExplorerPage.tsx`, `src/components/CifStructureScene.tsx`
- Panel refs: `src/components/OperatorPanel.tsx`
- Diagrams: `public/ita-diagrams/*.png`
- `npm test` · `npm run build:pages` · Pages via `dist/` → `gh-pages`
