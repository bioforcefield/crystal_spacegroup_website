/**
 * Curated COD teaching pairs: same chemistry, different packing → different PXRD.
 * Prefer ids present in public/samples/cod/ (same-origin cache).
 */

export interface PolymorphFormRef {
  codId: string
  /** Short display name (mineral / allotrope / phase). */
  label: string
  /** Hermann–Mauguin hint for the chip. */
  hm?: string
}

export interface PolymorphPair {
  id: string
  /** Chip label. */
  short: string
  /** Shared chemistry string. */
  chemistry: string
  /** One-line teaching note. */
  note: string
  formA: PolymorphFormRef
  formB: PolymorphFormRef
}

/**
 * Stable inorganic teaching pairs (all cached under public/samples/cod/).
 * Clicking a chip sets Form B as an overlay by default; “Load pair” also
 * loads Form A into the CIF map 3D view.
 */
export const POLYMORPH_PAIRS: readonly PolymorphPair[] = [
  {
    id: 'carbon-diamond-graphite',
    short: 'Diamond ↔ graphite',
    chemistry: 'C',
    note: 'Same element, different bonding networks — classic allotrope / PXRD fingerprint contrast.',
    formA: { codId: '9008564', label: 'Diamond', hm: 'Fd-3m' },
    formB: { codId: '9011577', label: 'Graphite', hm: 'P63/mmc' },
  },
  {
    id: 'caco3-calcite-aragonite',
    short: 'Calcite ↔ aragonite',
    chemistry: 'CaCO₃',
    note: 'CaCO₃ polymorphs: trigonal calcite vs orthorhombic aragonite — peak positions diverge strongly.',
    formA: { codId: '1010962', label: 'Calcite', hm: 'R-3c' },
    formB: { codId: '2100187', label: 'Aragonite', hm: 'Pmcn' },
  },
  {
    id: 'sio2-quartz-cristobalite',
    short: 'Quartz ↔ cristobalite',
    chemistry: 'SiO₂',
    note: 'Silica polymorphs: low quartz vs high cristobalite — different cells, different powder lines.',
    formA: { codId: '9012601', label: 'Quartz', hm: 'P3₁21' },
    formB: { codId: '1010954', label: 'Cristobalite', hm: 'F4₁32' },
  },
  {
    id: 'tio2-rutile-anatase',
    short: 'Rutile ↔ anatase',
    chemistry: 'TiO₂',
    note: 'TiO₂ polymorphs used in pigments / photocatalysis — PXRD is the usual phase ID tool.',
    formA: { codId: '9009083', label: 'Rutile', hm: 'P4₂/mnm' },
    formB: { codId: '9009086', label: 'Anatase', hm: 'I4₁/amd' },
  },
  {
    id: 'zns-sphalerite-wurtzite',
    short: 'Sphalerite ↔ wurtzite',
    chemistry: 'ZnS',
    note: 'Zincblende (cubic) vs wurtzite (hexagonal) packing of the same composition.',
    formA: { codId: '1100043', label: 'Sphalerite', hm: 'F-43m' },
    formB: { codId: '1011195', label: 'Wurtzite', hm: 'P6₃mc' },
  },
  {
    id: 'batio3-tet-cubic',
    short: 'BaTiO₃ tet ↔ cubic',
    chemistry: 'BaTiO₃',
    note: 'Ferroelectric tetragonal vs high-T cubic perovskite — subtle peak splitting / shifts.',
    formA: { codId: '1507756', label: 'BaTiO₃ tet', hm: 'P4mm' },
    formB: { codId: '1507757', label: 'BaTiO₃ cubic', hm: 'Pm-3m' },
  },
] as const

export function findPolymorphPair(id: string): PolymorphPair | undefined {
  return POLYMORPH_PAIRS.find((p) => p.id === id)
}

/** All COD ids referenced by curated pairs (for cache / tests). */
export function polymorphPairCodIds(): string[] {
  const out = new Set<string>()
  for (const p of POLYMORPH_PAIRS) {
    out.add(p.formA.codId)
    out.add(p.formB.codId)
  }
  return [...out].sort()
}
