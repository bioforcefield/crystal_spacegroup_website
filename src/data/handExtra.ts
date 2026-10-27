/**
 * Second wave of hand-polished teaching demos (beyond the original ~57).
 * Built with makeHandDemo + curated blurbs / legend focus.
 */

import { makeHandDemo } from './makeHandDemo'
import type { Operator, SpaceGroupDemo, SymmetryClassId } from './types'

function relabelMap(
  map: Record<number, Partial<Pick<Operator, 'label' | 'classId' | 'seitz'>>>,
) {
  return (op: Operator): Operator => {
    const patch = map[op.index]
    return patch ? { ...op, ...patch } : op
  }
}

const L = (ids: SymmetryClassId[]) => ids

/** 3 · P2 — pure 2-fold monoclinic (contrast with P21). */
export const p2Demo: SpaceGroupDemo = makeHandDemo({
  number: 3,
  shortName: 'P2',
  defaultProjection: 'b',
  classLegendOrder: L(['identity', 'twofold']),
  blurb:
    'P2 (No. 3) is the pure 2-fold monoclinic Sohncke group: identity + 2 ‖ b, no screw translation. Teaching contrast with P21 (2₁ ‖ b) — same unique axis, different motif stacking. Rare in the CSD versus P21/P21/c, but ideal for introducing monoclinic 2 vs 2₁.',
  relabel: relabelMap({
    2: { label: '2-fold ‖ b', classId: 'twofold', seitz: '{2₀₁₀ | 0}' },
  }),
})

/** 16 · P222 — orthorhombic 222 without screws. */
export const p222Demo: SpaceGroupDemo = makeHandDemo({
  number: 16,
  shortName: 'P222',
  classLegendOrder: L(['identity', 'twofold']),
  blurb:
    'P222 (No. 16) is the simplest orthorhombic Sohncke group: three mutually perpendicular pure 2-folds and no screws, glides, or inversion. Teaching baseline before P21212 / P212121 (which replace axes with 2₁ screws).',
  relabel: relabelMap({
    2: { label: '2 ‖ c', classId: 'twofold' },
    3: { label: '2 ‖ a', classId: 'twofold' },
    4: { label: '2 ‖ b', classId: 'twofold' },
  }),
})

/** 17 · P2221 */
export const p2221Demo: SpaceGroupDemo = makeHandDemo({
  number: 17,
  shortName: 'P2221',
  classLegendOrder: L(['identity', 'twofold', 'screw']),
  blurb:
    'P222₁ (No. 17) mixes two pure 2-folds with a 2₁ ‖ c — the first step from P222 toward the ubiquitous P2₁2₁2₁. All operations remain proper (Sohncke).',
})

/** 26 · Pmc21 — polar orthorhombic with c-glide + 2₁. */
export const pmc21Demo: SpaceGroupDemo = makeHandDemo({
  number: 26,
  shortName: 'Pmc21',
  classLegendOrder: L(['identity', 'screw', 'mirror', 'c-glide']),
  blurb:
    'Pmc2₁ (No. 26) is a common polar orthorhombic group: mirror ⊥ a, c-glide ⊥ b, and 2₁ ‖ c. Teaching bridge between monoclinic Pc/P21 and richer polar orthorhombic packs (Pca21, Pna21).',
})

/** 31 · Pmn21 */
export const pmn21Demo: SpaceGroupDemo = makeHandDemo({
  number: 31,
  shortName: 'Pmn21',
  classLegendOrder: L(['identity', 'screw', 'mirror', 'n-glide']),
  blurb:
    'Pmn2₁ (No. 31) pairs a mirror ⊥ a with an n-glide ⊥ b and 2₁ ‖ c. Useful for teaching how an n-glide (½,½,0-type) differs from axial a/b/c glides in polar orthorhombic settings.',
})

/** 75 · P4 — simplest tetragonal 4-fold. */
export const p4Demo: SpaceGroupDemo = makeHandDemo({
  number: 75,
  shortName: 'P4',
  classLegendOrder: L(['identity', 'fourfold', 'twofold']),
  blurb:
    'P4 (No. 75) is the simplest tetragonal Sohncke group: a pure 4-fold ‖ c (and its 2-fold power). Teaching start for tetragonal before screws (P41/P42/P43) and body-centring (I4).',
  relabel: relabelMap({
    2: { label: '4 ‖ c', classId: 'fourfold' },
    3: { label: '2 ‖ c', classId: 'twofold' },
    4: { label: '4³ ‖ c', classId: 'fourfold' },
  }),
})

/** 77 · P42 */
export const p42Demo: SpaceGroupDemo = makeHandDemo({
  number: 77,
  shortName: 'P42',
  classLegendOrder: L(['identity', 'screw', 'twofold']),
  blurb:
    'P4₂ (No. 77) replaces the pure 4 of P4 with a 4₂ screw ‖ c (translation ½c). Pair with P41/P43 for left/right 4ₙ screws and with P4₂/mnm (rutile) for the centrosymmetric extension.',
})

/** 79 · I4 */
export const i4Demo: SpaceGroupDemo = makeHandDemo({
  number: 79,
  shortName: 'I4',
  classLegendOrder: L(['identity', 'fourfold', 'twofold']),
  blurb:
    'I4 (No. 79) adds I-centring to P4 — eight general positions. Teaching bridge to I41 (4₁ + I) and I4/m (adds mirrors / −1). Overlays show the primary 4 ‖ c and its I image.',
})

/** 136 · P42/mnm — rutile */
export const p42mnmDemo: SpaceGroupDemo = makeHandDemo({
  number: 136,
  shortName: 'P42/mnm',
  classLegendOrder: L([
    'identity',
    'screw',
    'twofold',
    'inversion',
    'mirror',
    'n-glide',
  ]),
  blurb:
    'P4₂/mnm (No. 136) is the rutile aristotype: 4₂ ‖ c, mirrors, n-glides, and inversion (16 general positions). Core inorganic teaching group — contrast with P4mm (BaTiO₃-like polar) and P4₂/ncm.',
})

/** 152 · P3121 — quartz enantiomorph */
export const p3121Demo: SpaceGroupDemo = makeHandDemo({
  number: 152,
  shortName: 'P3121',
  classLegendOrder: L(['identity', 'screw', 'twofold']),
  blurb:
    'P3₁21 (No. 152) is one enantiomorph of the α-quartz pair (with P3₂21). A 3₁ screw ‖ c plus basal 2-folds — classic Sohncke teaching for handedness in trigonal crystals. Pair with No. 154.',
})

/** 154 · P3221 */
export const p3221Demo: SpaceGroupDemo = makeHandDemo({
  number: 154,
  shortName: 'P3221',
  classLegendOrder: L(['identity', 'screw', 'twofold']),
  blurb:
    'P3₂21 (No. 154) is the opposite enantiomorph of P3₁21 — 3₂ ‖ c instead of 3₁. Teaching pair for left- vs right-handed trigonal screws (quartz).',
})

/** 173 · P63 */
export const p63Demo: SpaceGroupDemo = makeHandDemo({
  number: 173,
  shortName: 'P63',
  classLegendOrder: L(['identity', 'screw', 'threefold']),
  blurb:
    'P6₃ (No. 173) is the polar hexagonal 6₃ screw group — a single 6₃ ‖ c (and its 3-fold power). Teaching start for hexagonal screws before P6₃/m and P6₃/mmc.',
})

/** 198 · P213 — chiral cubic */
export const p213Demo: SpaceGroupDemo = makeHandDemo({
  number: 198,
  shortName: 'P213',
  classLegendOrder: L(['identity', 'screw', 'threefold']),
  blurb:
    'P2₁3 (No. 198) is a chiral cubic Sohncke group: 2₁ screws and 〈111〉 3-folds, no inversion or mirrors. Teaching contrast with centrosymmetric Pa-3 / Pm-3m — handedness survives in cubic packing.',
})

/** 216 · F-43m — zincblende */
export const fbar43mDemo: SpaceGroupDemo = makeHandDemo({
  number: 216,
  shortName: 'F-43m',
  classLegendOrder: L(['identity', 'fourfold', 'threefold', 'twofold', 'mirror']),
  blurb:
    'F-43m (No. 216) is the zincblende / SiC aristotype: F-centring with −43m point symmetry (96 general positions). Teaching partner to Fd-3m (diamond) — same cubic family, different glide content and inversion.',
})

/** 25 · Pmm2 — polar orthorhombic baseline. */
export const pmm2Demo: SpaceGroupDemo = makeHandDemo({
  number: 25,
  shortName: 'Pmm2',
  classLegendOrder: L(['identity', 'twofold', 'mirror']),
  blurb:
    'Pmm2 (No. 25) is the simplest polar orthorhombic group: two mirrors meeting in a 2-fold ‖ c, no glides or screws. Teaching baseline before Pca21 / Pna21 / Pmc21 (which replace mirrors with glides and add 2₁).',
})

/** 58 · Pnnm */
export const pnnmDemo: SpaceGroupDemo = makeHandDemo({
  number: 58,
  shortName: 'Pnnm',
  classLegendOrder: L(['identity', 'twofold', 'inversion', 'mirror', 'n-glide']),
  blurb:
    'Pnnm (No. 58) is centrosymmetric orthorhombic mmm with n-glides ⊥ a and ⊥ b plus a mirror ⊥ c. Useful contrast with Pnma / Pbca (different glide combinations) and with Pmmn (mirrors vs n-glides swapped).',
})

/** 59 · Pmmn */
export const pmmnDemo: SpaceGroupDemo = makeHandDemo({
  number: 59,
  shortName: 'Pmmn',
  classLegendOrder: L(['identity', 'twofold', 'inversion', 'mirror', 'n-glide']),
  blurb:
    'Pmmn (No. 59) pairs mirrors ⊥ a and ⊥ b with an n-glide ⊥ c (origin choice 1). Teaching partner to Pnnm — same mmm point group, swapped axial vs diagonal glide content.',
})

/** 78 · P43 — enantiomorph of P41 */
export const p43Demo: SpaceGroupDemo = makeHandDemo({
  number: 78,
  shortName: 'P43',
  classLegendOrder: L(['identity', 'screw', 'twofold']),
  blurb:
    'P4₃ (No. 78) is the opposite enantiomorph of P4₁: a 4₃ screw ‖ c (translation ¾c) instead of 4₁. Teaching pair for left- vs right-handed tetragonal screws — all operations proper (Sohncke).',
})

/** 81 · P-4 */
export const pbar4Demo: SpaceGroupDemo = makeHandDemo({
  number: 81,
  shortName: 'P-4',
  classLegendOrder: L(['identity', 'fourfold', 'twofold']),
  blurb:
    'P-4 (No. 81) is the pure −4 tetragonal group: a −4 ‖ c (and its 2-fold power), no mirrors or glides. Teaching start for −4 / −42m before adding c-glides (P-421c) or mirrors.',
})

/** 87 · I4/m */
export const i4mDemo: SpaceGroupDemo = makeHandDemo({
  number: 87,
  shortName: 'I4/m',
  classLegendOrder: L(['identity', 'fourfold', 'twofold', 'inversion', 'mirror']),
  blurb:
    'I4/m (No. 87) adds mirrors and inversion to I4 (body-centred 4/m). Sixteen general positions — teaching bridge from I4 / I41/a toward I4/mmm.',
})

/** 99 · P4mm — BaTiO₃ aristotype polar */
export const p4mmDemo: SpaceGroupDemo = makeHandDemo({
  number: 99,
  shortName: 'P4mm',
  classLegendOrder: L(['identity', 'fourfold', 'twofold', 'mirror']),
  blurb:
    'P4mm (No. 99) is the polar tetragonal aristotype (BaTiO₃ ferroelectric phase): 4 ‖ c with vertical mirrors, no inversion. Teaching contrast with centrosymmetric P4/mmm and with screw-bearing P42/mnm (rutile).',
})

/** 129 · P4/nmm — PbO / FeSe family */
export const p4nmmDemo: SpaceGroupDemo = makeHandDemo({
  number: 129,
  shortName: 'P4/nmm',
  classLegendOrder: L(['identity', 'fourfold', 'twofold', 'inversion', 'mirror', 'n-glide']),
  blurb:
    'P4/nmm (No. 129) is a key inorganic tetragonal 4/mmm group (PbO, FeSe families): n-glide ⊥ c with vertical mirrors (origin choice 1). Sixteen general positions — pair with P4/mmm and I4/mmm.',
})

/** 139 · I4/mmm — very common inorganic */
export const i4mmmDemo: SpaceGroupDemo = makeHandDemo({
  number: 139,
  shortName: 'I4/mmm',
  classLegendOrder: L(['identity', 'fourfold', 'twofold', 'inversion', 'mirror']),
  blurb:
    'I4/mmm (No. 139) is among the most common inorganic tetragonal groups: I-centring with full 4/mmm (32 general positions). Teaching aristotype for layered and perovskite-related tetragonal cells — contrast with P4/mmm and I41/amd.',
})

/** 141 · I41/amd — zircon / spinel-related */
export const i41amdDemo: SpaceGroupDemo = makeHandDemo({
  number: 141,
  shortName: 'I41/amd',
  classLegendOrder: L(['identity', 'screw', 'twofold', 'inversion', 'mirror', 'a-glide', 'd-glide', 'fourfold']),
  blurb:
    'I4₁/amd (No. 141) hosts zircon and related aristotypes: 4₁ ‖ c, diamond-type d content, and mirrors (origin choice 1). Thirty-two general positions — teaching partner to I41/a and I4/mmm.',
})

/** 155 · R32 */
export const r32Demo: SpaceGroupDemo = makeHandDemo({
  number: 155,
  shortName: 'R32',
  classLegendOrder: L(['identity', 'threefold', 'twofold']),
  blurb:
    'R32 (No. 155) is the rhombohedral Sohncke group: 3 ‖ c plus basal 2-folds, with R-centring (hexagonal setting, 18 general positions). Teaching bridge between P3121/P3221 and centrosymmetric R-3m.',
})

/** 160 · R3m */
export const r3mDemo: SpaceGroupDemo = makeHandDemo({
  number: 160,
  shortName: 'R3m',
  classLegendOrder: L(['identity', 'threefold', 'mirror']),
  blurb:
    'R3m (No. 160) is polar rhombohedral 3m: 3 ‖ c with vertical mirrors and R-centring (hexagonal setting). Teaching contrast with R32 (no mirrors) and R-3m (adds inversion).',
})

/** 166 · R-3m — calcite / layered aristotype */
export const rbar3mDemo: SpaceGroupDemo = makeHandDemo({
  number: 166,
  shortName: 'R-3m',
  classLegendOrder: L(['identity', 'threefold', 'twofold', 'inversion', 'mirror']),
  blurb:
    'R-3m (No. 166) is the centrosymmetric rhombohedral −3m aristotype (calcite-related and many layered structures): 3/−3 ‖ c, mirrors, and R-centring — thirty-six general positions in the hexagonal setting. Pair with R-3c (c-glides instead of mirrors).',
})

/** 186 · P63mc — wurtzite */
export const p63mcDemo: SpaceGroupDemo = makeHandDemo({
  number: 186,
  shortName: 'P63mc',
  classLegendOrder: L(['identity', 'screw', 'threefold', 'mirror', 'c-glide']),
  blurb:
    'P6₃mc (No. 186) is the wurtzite aristotype: polar hexagonal 6₃mc with 6₃ ‖ c, vertical mirrors, and c-glides. Teaching partner to F-43m (zincblende) — same composition families, different packing and polarity.',
})

/** All second-/third-wave hand demos (beyond the original ~57). */
export const HAND_EXTRA_DEMOS: SpaceGroupDemo[] = [
  p2Demo,
  p222Demo,
  p2221Demo,
  pmc21Demo,
  pmn21Demo,
  p4Demo,
  p42Demo,
  i4Demo,
  p42mnmDemo,
  p3121Demo,
  p3221Demo,
  p63Demo,
  p213Demo,
  fbar43mDemo,
  pmm2Demo,
  pnnmDemo,
  pmmnDemo,
  p43Demo,
  pbar4Demo,
  i4mDemo,
  p4mmDemo,
  p4nmmDemo,
  i4mmmDemo,
  i41amdDemo,
  r32Demo,
  r3mDemo,
  rbar3mDemo,
  p63mcDemo,
]
