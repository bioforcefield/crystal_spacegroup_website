# Crystal Space Groups — Session 1 (Pbca demo)

Interactive educational demo for **space group 61 · Pbca**: a rotatable 3D unit cell with the eight general-position images and a clickable operator list.

## Stack

- Vite + React + TypeScript
- three / @react-three/fiber / @react-three/drei
- Client-only SPA (no backend)

## Run locally

```bash
cd /workspace/crystal-space-groups
npm install
npm run dev
```

Open **http://localhost:5173/**

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server on port 5173 |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Serve the production build |

## What’s in Session 1

- Hard-coded Pbca (No. 61) operators and general positions
- Orthorhombic teaching cell `a=1, b=1.2, c=1.5`
- Seed point `(0.25, 0.15, 0.30)` → 8 images (mod 1)
- Click operator row or point → highlight + short ghost animation from identity
- Reset view button
- Teaching blurb on a-/b-/c-glides

## Not yet (later sessions)

- All 230 space groups
- CIF upload / atom overlay
- Cloud hosting

## Key files

- `src/data/pbca.ts` — operators, meta, fractional math
- `src/components/UnitCellScene.tsx` — R3F scene
- `src/components/OperatorPanel.tsx` — operator list + matrix
- `src/App.tsx` — layout shell
