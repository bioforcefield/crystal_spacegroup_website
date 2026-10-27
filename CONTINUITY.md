# Crystal space-group site — resume notes (2026-10-26)

Live: https://bioforcefield.github.io/crystal_spacegroup_website/  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`  
Plan canvas: https://cursor.com/canvas/store-47b63095-92bb-4ade-8ecd-d65e434f207d/99fd7be7-25b5-4ea5-9402-ecaaffb9adf8  
Latest: feature `0cdea9b` · tip `74c1f84` · `gh-pages` `6a01644`

## Done (this batch) — UCL links + ITA Vol. A diagrams
- **UCL / Birkbeck external links** on every SpaceGroupPage (OperatorPanel header): `uclSpaceGroupDiagramUrl(n)` → `http://img.chem.ucl.ac.uk/sgp/large/NNNaz1.htm` (no hotlinked GIFs; credit in title/tooltip).
- **ITA Vol. A diagram plates** for **all 230** space groups extracted from Hahn 2005 PDF (primary left-page CCITT plate via `pdfimages`); served from `public/ita-diagrams/NNN.png` (~3.6 MB total), lazy-loaded in the panel with © IUCr · Vol. A caption.
- Helpers: `src/data/uclDiagram.ts`, `src/data/itaDiagram.ts` + `itaDiagrams.json` manifest; page map `scripts/ita_diagram_pages.tsv`; repro script `scripts/extract_ita_diagrams.py`.
- IUCr note: short extracts / single-group diagrams may be reproduced with acknowledgment (not the whole book).

## Teaching core
Hand-polished demos: **57** (CSD top 42 + textbook core).

## Remaining gaps (only)
- 2D diagram still secondary to 3D on mobile
- Optional: IndexPage card UCL chip (skipped to avoid clutter)

## Key paths
- Hand demos: `src/data/*.ts`
- Panel refs: `src/components/OperatorPanel.tsx` (UCL link + ITA figure)
- Diagrams: `public/ita-diagrams/*.png`
- `npm test` · `npm run build:pages` · Pages via `dist/` → `gh-pages`
