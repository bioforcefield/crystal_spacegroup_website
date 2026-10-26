# `src/data/groups/`

Generator and validation helpers for space-group demos.

- `parseTriplet.ts` — ITA triplet → `{ R, t }`
- `composeOps.ts` — Seitz multiply, t mod 1, equality
- `closure.ts` — identity + closure mod lattice
- `deriveElements.ts` — basic inversion / unique-b axes / glides ⊥ b
- `buildOperators.ts` — triplets → `Operator[]` with heuristic labels

Bulk demos: `../generatedDemo.ts` + `../itaSpaceGroups.json` (from gemmi via `scripts/`). Hand overrides stay at `src/data/pbar1.ts`, `p21c.ts`, `c2c.ts`, `pbca.ts`. See [`../CONTRACT.md`](../CONTRACT.md).
