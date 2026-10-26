# Crystal Space Groups

Interactive educational website for crystallographic space groups.

## Session 1 demo

Space group **61 · Pbca** with:

- 3D orthorhombic unit cell (React Three Fiber)
- Chiral L-shaped markers (enantiomorph for improper ops)
- Clickable operators color-coded by class (identity, 2₁ screw, inversion, a/b/c-glide)
- BASE ↔ IMAGE highlight with connector

## Run locally

```bash
cd crystal_spacegroup_website   # or this folder
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173/).

```bash
npm run build    # production build → dist/
npm run preview  # serve the build
```

## Stack

Vite + React + TypeScript + Three.js (`@react-three/fiber`, `@react-three/drei`)

## Layout

- `src/data/pbca.ts` — Pbca operators and symmetry classes
- `src/components/UnitCellScene.tsx` — 3D cell + markers
- `src/components/OperatorPanel.tsx` — operator list
- `src/components/ChiralMotif.tsx` — asymmetric motif mesh
