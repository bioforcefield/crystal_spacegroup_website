# `src/data/groups/`

Generator and validation helpers for space-group demos.

- `parseTriplet.ts` — ITA triplet → `{ R, t }`
- `composeOps.ts` — Seitz multiply, t mod 1, equality
- `closure.ts` — identity + closure mod lattice
- `deriveElements.ts` — basic inversion / unique-b axes / glides ⊥ b
- `buildOperators.ts` — triplets → `Operator[]` with heuristic labels

See [`../CONTRACT.md`](../CONTRACT.md) for the `SpaceGroupDemo` contract and how to add a group. Golden demos (`p21c.ts`, `c2c.ts`, `pbca.ts`) stay at `src/data/` for now.
