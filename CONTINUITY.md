# Crystal space-group site — resume notes (2026-10-28)

Live: https://crystalspacegroups.com/ (also https://bioforcefield.github.io/crystal_spacegroup_website/)  
Repo: bioforcefield/crystal_spacegroup_website · box: `/workspace/crystal-space-groups`

## Near C2 2₁ compact (2026-10-28)
- C2 screw (`classId === 'screw'`, axis at (¼,y,0)): bumped `SCREW_COMPACT_LATTICE_WEIGHT` 0.1 → 0.2 so Near keeps the raw Seitz mate (z≈−0.31) instead of wrapping +(0,0,1).
- Outside-cell + pair-distance had beaten weight 0.1; the wrap put both motifs on the +z side so the drawn 2₁ missed the BASE–IMAGE segment.
- Pure 2-fold weight inherits the same constant. Regression: `screwSense.test.ts` C2 2₁ straddle.

## Near twofold compact (2026-10-28)
- Pure 2-fold (`classId === 'twofold'`) Near now uses the same compact raw-Seitz lattice weight as screws (`TWOFOLD_COMPACT_LATTICE_WEIGHT` = screw weight).
- Fixes C2: BASE/IMAGE straddle the drawn axis at (0,y,0) instead of same-side +(1,0,1) wrap into the cell.
- Tests: `twofoldNear.test.ts` (C2 + P2). Screw matrix unchanged.

## Primer animations (2026-10-28) — InvGhost inversion
- Home `#primer`: isometric chiral L. **Animations are authoritative**; static B/I match their endpoints (not PoseGhost→markers).
- Movers: JS `InvGhost` + CSS `primer-twofold` / `primer-mirror` / `primer-glide` + JS `ScrewGhost`. No `PoseGhost`. No CSS `primer-inv`.
- **Inversion**: object-space central homothety `s: 1→0→−1` about ⊙ (`MotifGlyph.objectScale`); tips pass through center; end pose enantiomorph (det −1). Distinct from 2-fold.
- `PRIMER_ENDPOINT_TRANSFORMS` + `StaticEndpoint` for mirror/glide/twofold only; inversion B/I = `inversionJunction(±1)` + `objectScale ±1`.
- **2-fold**: top-down lens, CSS rotate 180° about (60,36), hand kept, no slide.
- **2₁**: side view, orbit + yaw 0→180 + +½ along axis, hand kept.
- Geometry: `src/data/primer/primerGeometry.ts` (`INVERSION_PRIMER`, `inversionScale`, tip rays).
- Pause off-screen; reduced-motion → static B/I.

## Visitor counter (2026-10-28)
- Footer chip `(N)` (number only) via `VisitCounter` in `SiteCopyright` (index shell) + demo `viewport-footer` (SG / CIF).
- Worker: `GET /visits` (+ `?peek=1`) on `crystal-cod-proxy` Durable Object `VisitsCounter` (`scripts/cod-cors-worker.js`, wrangler DO migration `v1-visits-counter`).
- Client: once per tab session (`sessionStorage`); `VITE_VISITS_URL` optional (else COD proxy origin + `/visits`).
- Deploy worker first (Actions or `npx wrangler deploy -c scripts/wrangler.cod-proxy.toml`), then Pages with `VITE_COD_PROXY=…`.

## Front-page spotlights
- CIF / Publications / Morphology+kinetics share `.home-spotlights` (1280px, same padding as hero/main)
- Pubs + teach sit in equal-height `.home-spotlight-row` (2-col → 1-col ≤900px)
- Hero uses same 1.4rem inset column as spotlights/main (no double outer pad)
- System cards stretch evenly in the explore grid

## Oct 2026 review sprint (E1/E2/U1 + soft)
- **E1**: Folded plane/screw seed overrides into hand `SEED` constants; `TEACHING_SEED_PREFER` (98) is construction-only for generated + makeHandDemo. Removed `getDemo` overlay. Test: hand SEED === getDemo.
- **E2**: Named Near `pairScore` screw weights; expanded screw matrix (P21/c, P21/m, C2/c, P212121 a/b/c, P41, I41). Kept compact −a for P21/c (no force-Δc≥0).
- **U1**: SG short label **Wrap** (aligned with CIF); Near toolbar hint; home How-to Near/Wrap.
- Soft: distToGlidePlane fractional note (E4); removed Pbca shims (E7); README SPA 404.html note (E3/U6); screw ghost caption (S2); Z>48 defaults BASE+IMAGE (S5); mobile Legend disclosure (U2); aria-live op+mode (U5).
- Deferred: E6 Near cache; U3 sticky jump; S3/S4/S6 doc-only.

## SG 11 · P21/m teaching AU (2026-10-28)
- Seed clearance + Near screw sense; see `p21mPlacement.test.ts`, `screwSense.test.ts`.

## Teaching AU seed clearance (2026-10-28)
- Shared module `src/data/teachingSeed.ts`; prefer map in `teachingSeedOverrides.ts`.
- Tests: `teachingSeed.test.ts`. cifUiContracts are **source contracts**, not R3F paint.

## CIF map — camera + Cell HUD
- FitCifCamera + Cell strip outside canvas; contracts in `cifUiContracts.test.ts`.

## Cloudflare COD proxy
- Worker: https://crystal-cod-proxy.crystal-sg.workers.dev/{id}.cif
- Deploy: `VITE_COD_PROXY=https://crystal-cod-proxy.crystal-sg.workers.dev bash scripts/deploy-gh-pages.sh`

## Key paths
- `npm test` · deploy script above

## SHAs
- main: `f4a8b02` · Near C2 2₁ compact weight 0.2 (axis between units); 767 tests
- gh-pages: `17b9e01` (COD/visits; CNAME; C2 screw Near)
