/** Compact ITA space-group catalog for the teaching index (numbers + HM symbols). */

export type CrystalSystemId =
  | 'triclinic'
  | 'monoclinic'
  | 'orthorhombic'
  | 'tetragonal'
  | 'trigonal'
  | 'hexagonal'
  | 'cubic'

export type GroupStatus = 'ready' | 'planned'

export interface CrystalSystemInfo {
  id: CrystalSystemId
  name: string
  /** Inclusive ITA number range */
  range: [number, number]
  blurb: string
  /** Accent used on system cards */
  accent: string
}

export interface SpaceGroupEntry {
  number: number
  /** Hermann–Mauguin symbol (ASCII: bar as -) */
  hm: string
  system: CrystalSystemId
  status: GroupStatus
  /** URL slug from HM (lowercase alnum; crystallographic bar → 'bar', e.g. P-1 → pbar1) */
  slug: string
}

export const CRYSTAL_SYSTEMS: CrystalSystemInfo[] = [
  {
    id: 'triclinic',
    name: 'Triclinic',
    range: [
      1,
      2
    ],
    blurb: 'Lowest symmetry. Home of P-1 (2) — identity + inversion. Axes unequal, angles oblique.',
    accent: '#94a3b8'
  },
  {
    id: 'monoclinic',
    name: 'Monoclinic',
    range: [
      3,
      15
    ],
    blurb: 'One unique axis (usually b). Home of P21/c (14) — the most common molecular group — and C2/c (15).',
    accent: '#38bdf8'
  },
  {
    id: 'orthorhombic',
    name: 'Orthorhombic',
    range: [
      16,
      74
    ],
    blurb: 'Three mutually perpendicular axes of different lengths. Home of Pbca (61).',
    accent: '#a78bfa'
  },
  {
    id: 'tetragonal',
    name: 'Tetragonal',
    range: [
      75,
      142
    ],
    blurb: 'Square basal plane (a = b ≠ c) with a 4-fold axis along c.',
    accent: '#34d399'
  },
  {
    id: 'trigonal',
    name: 'Trigonal',
    range: [
      143,
      167
    ],
    blurb: '3-fold axis. Primitive hexagonal or rhombohedral (R) settings.',
    accent: '#fbbf24'
  },
  {
    id: 'hexagonal',
    name: 'Hexagonal',
    range: [
      168,
      194
    ],
    blurb: '6-fold axis along c; a = b, γ = 120°.',
    accent: '#fb923c'
  },
  {
    id: 'cubic',
    name: 'Cubic',
    range: [
      195,
      230
    ],
    blurb: 'Highest crystal symmetry. a = b = c, all angles 90°. Many minerals & metals.',
    accent: '#f472b6'
  }
]

/** All 230 space groups — interactive demos: P-1 (2), P21/c (14), C2/c (15), Pbca (61). */
export const SPACE_GROUPS: SpaceGroupEntry[] = [
  {
    number: 1,
    hm: 'P1',
    system: 'triclinic',
    status: 'ready',
    slug: 'p1'
  },
  {
    number: 2,
    hm: 'P-1',
    system: 'triclinic',
    status: 'ready',
    slug: 'pbar1'
  },
  {
    number: 3,
    hm: 'P2',
    system: 'monoclinic',
    status: 'ready',
    slug: 'p2'
  },
  {
    number: 4,
    hm: 'P21',
    system: 'monoclinic',
    status: 'ready',
    slug: 'p21'
  },
  {
    number: 5,
    hm: 'C2',
    system: 'monoclinic',
    status: 'ready',
    slug: 'c2'
  },
  {
    number: 6,
    hm: 'Pm',
    system: 'monoclinic',
    status: 'ready',
    slug: 'pm'
  },
  {
    number: 7,
    hm: 'Pc',
    system: 'monoclinic',
    status: 'ready',
    slug: 'pc'
  },
  {
    number: 8,
    hm: 'Cm',
    system: 'monoclinic',
    status: 'ready',
    slug: 'cm'
  },
  {
    number: 9,
    hm: 'Cc',
    system: 'monoclinic',
    status: 'ready',
    slug: 'cc'
  },
  {
    number: 10,
    hm: 'P2/m',
    system: 'monoclinic',
    status: 'ready',
    slug: 'p2m'
  },
  {
    number: 11,
    hm: 'P21/m',
    system: 'monoclinic',
    status: 'ready',
    slug: 'p21m'
  },
  {
    number: 12,
    hm: 'C2/m',
    system: 'monoclinic',
    status: 'ready',
    slug: 'c2m'
  },
  {
    number: 13,
    hm: 'P2/c',
    system: 'monoclinic',
    status: 'ready',
    slug: 'p2c'
  },
  {
    number: 14,
    hm: 'P21/c',
    system: 'monoclinic',
    status: 'ready',
    slug: 'p21c'
  },
  {
    number: 15,
    hm: 'C2/c',
    system: 'monoclinic',
    status: 'ready',
    slug: 'c2c'
  },
  {
    number: 16,
    hm: 'P222',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'p222'
  },
  {
    number: 17,
    hm: 'P2221',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'p2221'
  },
  {
    number: 18,
    hm: 'P21212',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'p21212'
  },
  {
    number: 19,
    hm: 'P212121',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'p212121'
  },
  {
    number: 20,
    hm: 'C2221',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'c2221'
  },
  {
    number: 21,
    hm: 'C222',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'c222'
  },
  {
    number: 22,
    hm: 'F222',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'f222'
  },
  {
    number: 23,
    hm: 'I222',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'i222'
  },
  {
    number: 24,
    hm: 'I212121',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'i212121'
  },
  {
    number: 25,
    hm: 'Pmm2',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pmm2'
  },
  {
    number: 26,
    hm: 'Pmc21',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pmc21'
  },
  {
    number: 27,
    hm: 'Pcc2',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pcc2'
  },
  {
    number: 28,
    hm: 'Pma2',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pma2'
  },
  {
    number: 29,
    hm: 'Pca21',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pca21'
  },
  {
    number: 30,
    hm: 'Pnc2',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pnc2'
  },
  {
    number: 31,
    hm: 'Pmn21',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pmn21'
  },
  {
    number: 32,
    hm: 'Pba2',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pba2'
  },
  {
    number: 33,
    hm: 'Pna21',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pna21'
  },
  {
    number: 34,
    hm: 'Pnn2',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pnn2'
  },
  {
    number: 35,
    hm: 'Cmm2',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'cmm2'
  },
  {
    number: 36,
    hm: 'Cmc21',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'cmc21'
  },
  {
    number: 37,
    hm: 'Ccc2',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'ccc2'
  },
  {
    number: 38,
    hm: 'Amm2',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'amm2'
  },
  {
    number: 39,
    hm: 'Aem2',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'aem2'
  },
  {
    number: 40,
    hm: 'Ama2',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'ama2'
  },
  {
    number: 41,
    hm: 'Aea2',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'aea2'
  },
  {
    number: 42,
    hm: 'Fmm2',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'fmm2'
  },
  {
    number: 43,
    hm: 'Fdd2',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'fdd2'
  },
  {
    number: 44,
    hm: 'Imm2',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'imm2'
  },
  {
    number: 45,
    hm: 'Iba2',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'iba2'
  },
  {
    number: 46,
    hm: 'Ima2',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'ima2'
  },
  {
    number: 47,
    hm: 'Pmmm',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pmmm'
  },
  {
    number: 48,
    hm: 'Pnnn',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pnnn'
  },
  {
    number: 49,
    hm: 'Pccm',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pccm'
  },
  {
    number: 50,
    hm: 'Pban',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pban'
  },
  {
    number: 51,
    hm: 'Pmma',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pmma'
  },
  {
    number: 52,
    hm: 'Pnna',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pnna'
  },
  {
    number: 53,
    hm: 'Pmna',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pmna'
  },
  {
    number: 54,
    hm: 'Pcca',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pcca'
  },
  {
    number: 55,
    hm: 'Pbam',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pbam'
  },
  {
    number: 56,
    hm: 'Pccn',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pccn'
  },
  {
    number: 57,
    hm: 'Pbcm',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pbcm'
  },
  {
    number: 58,
    hm: 'Pnnm',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pnnm'
  },
  {
    number: 59,
    hm: 'Pmmn',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pmmn'
  },
  {
    number: 60,
    hm: 'Pbcn',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pbcn'
  },
  {
    number: 61,
    hm: 'Pbca',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pbca'
  },
  {
    number: 62,
    hm: 'Pnma',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'pnma'
  },
  {
    number: 63,
    hm: 'Cmcm',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'cmcm'
  },
  {
    number: 64,
    hm: 'Cmce',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'cmce'
  },
  {
    number: 65,
    hm: 'Cmmm',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'cmmm'
  },
  {
    number: 66,
    hm: 'Cccm',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'cccm'
  },
  {
    number: 67,
    hm: 'Cmme',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'cmme'
  },
  {
    number: 68,
    hm: 'Ccce',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'ccce'
  },
  {
    number: 69,
    hm: 'Fmmm',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'fmmm'
  },
  {
    number: 70,
    hm: 'Fddd',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'fddd'
  },
  {
    number: 71,
    hm: 'Immm',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'immm'
  },
  {
    number: 72,
    hm: 'Ibam',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'ibam'
  },
  {
    number: 73,
    hm: 'Ibca',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'ibca'
  },
  {
    number: 74,
    hm: 'Imma',
    system: 'orthorhombic',
    status: 'ready',
    slug: 'imma'
  },
  {
    number: 75,
    hm: 'P4',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4'
  },
  {
    number: 76,
    hm: 'P41',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p41'
  },
  {
    number: 77,
    hm: 'P42',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p42'
  },
  {
    number: 78,
    hm: 'P43',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p43'
  },
  {
    number: 79,
    hm: 'I4',
    system: 'tetragonal',
    status: 'ready',
    slug: 'i4'
  },
  {
    number: 80,
    hm: 'I41',
    system: 'tetragonal',
    status: 'ready',
    slug: 'i41'
  },
  {
    number: 81,
    hm: 'P-4',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4'
  },
  {
    number: 82,
    hm: 'I-4',
    system: 'tetragonal',
    status: 'ready',
    slug: 'i4'
  },
  {
    number: 83,
    hm: 'P4/m',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4m'
  },
  {
    number: 84,
    hm: 'P42/m',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p42m'
  },
  {
    number: 85,
    hm: 'P4/n',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4n'
  },
  {
    number: 86,
    hm: 'P42/n',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p42n'
  },
  {
    number: 87,
    hm: 'I4/m',
    system: 'tetragonal',
    status: 'ready',
    slug: 'i4m'
  },
  {
    number: 88,
    hm: 'I41/a',
    system: 'tetragonal',
    status: 'ready',
    slug: 'i41a'
  },
  {
    number: 89,
    hm: 'P422',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p422'
  },
  {
    number: 90,
    hm: 'P4212',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4212'
  },
  {
    number: 91,
    hm: 'P4122',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4122'
  },
  {
    number: 92,
    hm: 'P41212',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p41212'
  },
  {
    number: 93,
    hm: 'P4222',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4222'
  },
  {
    number: 94,
    hm: 'P42212',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p42212'
  },
  {
    number: 95,
    hm: 'P4322',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4322'
  },
  {
    number: 96,
    hm: 'P43212',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p43212'
  },
  {
    number: 97,
    hm: 'I422',
    system: 'tetragonal',
    status: 'ready',
    slug: 'i422'
  },
  {
    number: 98,
    hm: 'I4122',
    system: 'tetragonal',
    status: 'ready',
    slug: 'i4122'
  },
  {
    number: 99,
    hm: 'P4mm',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4mm'
  },
  {
    number: 100,
    hm: 'P4bm',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4bm'
  },
  {
    number: 101,
    hm: 'P42cm',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p42cm'
  },
  {
    number: 102,
    hm: 'P42nm',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p42nm'
  },
  {
    number: 103,
    hm: 'P4cc',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4cc'
  },
  {
    number: 104,
    hm: 'P4nc',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4nc'
  },
  {
    number: 105,
    hm: 'P42mc',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p42mc'
  },
  {
    number: 106,
    hm: 'P42bc',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p42bc'
  },
  {
    number: 107,
    hm: 'I4mm',
    system: 'tetragonal',
    status: 'ready',
    slug: 'i4mm'
  },
  {
    number: 108,
    hm: 'I4cm',
    system: 'tetragonal',
    status: 'ready',
    slug: 'i4cm'
  },
  {
    number: 109,
    hm: 'I41md',
    system: 'tetragonal',
    status: 'ready',
    slug: 'i41md'
  },
  {
    number: 110,
    hm: 'I41cd',
    system: 'tetragonal',
    status: 'ready',
    slug: 'i41cd'
  },
  {
    number: 111,
    hm: 'P-42m',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p42m'
  },
  {
    number: 112,
    hm: 'P-42c',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p42c'
  },
  {
    number: 113,
    hm: 'P-421m',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p421m'
  },
  {
    number: 114,
    hm: 'P-421c',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p421c'
  },
  {
    number: 115,
    hm: 'P-4m2',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4m2'
  },
  {
    number: 116,
    hm: 'P-4c2',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4c2'
  },
  {
    number: 117,
    hm: 'P-4b2',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4b2'
  },
  {
    number: 118,
    hm: 'P-4n2',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4n2'
  },
  {
    number: 119,
    hm: 'I-4m2',
    system: 'tetragonal',
    status: 'ready',
    slug: 'i4m2'
  },
  {
    number: 120,
    hm: 'I-4c2',
    system: 'tetragonal',
    status: 'ready',
    slug: 'i4c2'
  },
  {
    number: 121,
    hm: 'I-42m',
    system: 'tetragonal',
    status: 'ready',
    slug: 'i42m'
  },
  {
    number: 122,
    hm: 'I-42d',
    system: 'tetragonal',
    status: 'ready',
    slug: 'i42d'
  },
  {
    number: 123,
    hm: 'P4/mmm',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4mmm'
  },
  {
    number: 124,
    hm: 'P4/mcc',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4mcc'
  },
  {
    number: 125,
    hm: 'P4/nbm',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4nbm'
  },
  {
    number: 126,
    hm: 'P4/nnc',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4nnc'
  },
  {
    number: 127,
    hm: 'P4/mbm',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4mbm'
  },
  {
    number: 128,
    hm: 'P4/mnc',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4mnc'
  },
  {
    number: 129,
    hm: 'P4/nmm',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4nmm'
  },
  {
    number: 130,
    hm: 'P4/ncc',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p4ncc'
  },
  {
    number: 131,
    hm: 'P42/mmc',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p42mmc'
  },
  {
    number: 132,
    hm: 'P42/mcm',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p42mcm'
  },
  {
    number: 133,
    hm: 'P42/nbc',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p42nbc'
  },
  {
    number: 134,
    hm: 'P42/nnm',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p42nnm'
  },
  {
    number: 135,
    hm: 'P42/mbc',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p42mbc'
  },
  {
    number: 136,
    hm: 'P42/mnm',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p42mnm'
  },
  {
    number: 137,
    hm: 'P42/nmc',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p42nmc'
  },
  {
    number: 138,
    hm: 'P42/ncm',
    system: 'tetragonal',
    status: 'ready',
    slug: 'p42ncm'
  },
  {
    number: 139,
    hm: 'I4/mmm',
    system: 'tetragonal',
    status: 'ready',
    slug: 'i4mmm'
  },
  {
    number: 140,
    hm: 'I4/mcm',
    system: 'tetragonal',
    status: 'ready',
    slug: 'i4mcm'
  },
  {
    number: 141,
    hm: 'I41/amd',
    system: 'tetragonal',
    status: 'ready',
    slug: 'i41amd'
  },
  {
    number: 142,
    hm: 'I41/acd',
    system: 'tetragonal',
    status: 'ready',
    slug: 'i41acd'
  },
  {
    number: 143,
    hm: 'P3',
    system: 'trigonal',
    status: 'ready',
    slug: 'p3'
  },
  {
    number: 144,
    hm: 'P31',
    system: 'trigonal',
    status: 'ready',
    slug: 'p31'
  },
  {
    number: 145,
    hm: 'P32',
    system: 'trigonal',
    status: 'ready',
    slug: 'p32'
  },
  {
    number: 146,
    hm: 'R3',
    system: 'trigonal',
    status: 'ready',
    slug: 'r3'
  },
  {
    number: 147,
    hm: 'P-3',
    system: 'trigonal',
    status: 'ready',
    slug: 'p3'
  },
  {
    number: 148,
    hm: 'R-3',
    system: 'trigonal',
    status: 'ready',
    slug: 'r3'
  },
  {
    number: 149,
    hm: 'P312',
    system: 'trigonal',
    status: 'ready',
    slug: 'p312'
  },
  {
    number: 150,
    hm: 'P321',
    system: 'trigonal',
    status: 'ready',
    slug: 'p321'
  },
  {
    number: 151,
    hm: 'P3112',
    system: 'trigonal',
    status: 'ready',
    slug: 'p3112'
  },
  {
    number: 152,
    hm: 'P3121',
    system: 'trigonal',
    status: 'ready',
    slug: 'p3121'
  },
  {
    number: 153,
    hm: 'P3212',
    system: 'trigonal',
    status: 'ready',
    slug: 'p3212'
  },
  {
    number: 154,
    hm: 'P3221',
    system: 'trigonal',
    status: 'ready',
    slug: 'p3221'
  },
  {
    number: 155,
    hm: 'R32',
    system: 'trigonal',
    status: 'ready',
    slug: 'r32'
  },
  {
    number: 156,
    hm: 'P3m1',
    system: 'trigonal',
    status: 'ready',
    slug: 'p3m1'
  },
  {
    number: 157,
    hm: 'P31m',
    system: 'trigonal',
    status: 'ready',
    slug: 'p31m'
  },
  {
    number: 158,
    hm: 'P3c1',
    system: 'trigonal',
    status: 'ready',
    slug: 'p3c1'
  },
  {
    number: 159,
    hm: 'P31c',
    system: 'trigonal',
    status: 'ready',
    slug: 'p31c'
  },
  {
    number: 160,
    hm: 'R3m',
    system: 'trigonal',
    status: 'ready',
    slug: 'r3m'
  },
  {
    number: 161,
    hm: 'R3c',
    system: 'trigonal',
    status: 'ready',
    slug: 'r3c'
  },
  {
    number: 162,
    hm: 'P-31m',
    system: 'trigonal',
    status: 'ready',
    slug: 'p31m'
  },
  {
    number: 163,
    hm: 'P-31c',
    system: 'trigonal',
    status: 'ready',
    slug: 'p31c'
  },
  {
    number: 164,
    hm: 'P-3m1',
    system: 'trigonal',
    status: 'ready',
    slug: 'p3m1'
  },
  {
    number: 165,
    hm: 'P-3c1',
    system: 'trigonal',
    status: 'ready',
    slug: 'p3c1'
  },
  {
    number: 166,
    hm: 'R-3m',
    system: 'trigonal',
    status: 'ready',
    slug: 'r3m'
  },
  {
    number: 167,
    hm: 'R-3c',
    system: 'trigonal',
    status: 'ready',
    slug: 'r3c'
  },
  {
    number: 168,
    hm: 'P6',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p6'
  },
  {
    number: 169,
    hm: 'P61',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p61'
  },
  {
    number: 170,
    hm: 'P65',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p65'
  },
  {
    number: 171,
    hm: 'P62',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p62'
  },
  {
    number: 172,
    hm: 'P64',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p64'
  },
  {
    number: 173,
    hm: 'P63',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p63'
  },
  {
    number: 174,
    hm: 'P-6',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p6'
  },
  {
    number: 175,
    hm: 'P6/m',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p6m'
  },
  {
    number: 176,
    hm: 'P63/m',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p63m'
  },
  {
    number: 177,
    hm: 'P622',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p622'
  },
  {
    number: 178,
    hm: 'P6122',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p6122'
  },
  {
    number: 179,
    hm: 'P6522',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p6522'
  },
  {
    number: 180,
    hm: 'P6222',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p6222'
  },
  {
    number: 181,
    hm: 'P6422',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p6422'
  },
  {
    number: 182,
    hm: 'P6322',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p6322'
  },
  {
    number: 183,
    hm: 'P6mm',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p6mm'
  },
  {
    number: 184,
    hm: 'P6cc',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p6cc'
  },
  {
    number: 185,
    hm: 'P63cm',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p63cm'
  },
  {
    number: 186,
    hm: 'P63mc',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p63mc'
  },
  {
    number: 187,
    hm: 'P-6m2',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p6m2'
  },
  {
    number: 188,
    hm: 'P-6c2',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p6c2'
  },
  {
    number: 189,
    hm: 'P-62m',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p62m'
  },
  {
    number: 190,
    hm: 'P-62c',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p62c'
  },
  {
    number: 191,
    hm: 'P6/mmm',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p6mmm'
  },
  {
    number: 192,
    hm: 'P6/mcc',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p6mcc'
  },
  {
    number: 193,
    hm: 'P63/mcm',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p63mcm'
  },
  {
    number: 194,
    hm: 'P63/mmc',
    system: 'hexagonal',
    status: 'ready',
    slug: 'p63mmc'
  },
  {
    number: 195,
    hm: 'P23',
    system: 'cubic',
    status: 'ready',
    slug: 'p23'
  },
  {
    number: 196,
    hm: 'F23',
    system: 'cubic',
    status: 'ready',
    slug: 'f23'
  },
  {
    number: 197,
    hm: 'I23',
    system: 'cubic',
    status: 'ready',
    slug: 'i23'
  },
  {
    number: 198,
    hm: 'P213',
    system: 'cubic',
    status: 'ready',
    slug: 'p213'
  },
  {
    number: 199,
    hm: 'I213',
    system: 'cubic',
    status: 'ready',
    slug: 'i213'
  },
  {
    number: 200,
    hm: 'Pm-3',
    system: 'cubic',
    status: 'ready',
    slug: 'pm3'
  },
  {
    number: 201,
    hm: 'Pn-3',
    system: 'cubic',
    status: 'ready',
    slug: 'pn3'
  },
  {
    number: 202,
    hm: 'Fm-3',
    system: 'cubic',
    status: 'ready',
    slug: 'fm3'
  },
  {
    number: 203,
    hm: 'Fd-3',
    system: 'cubic',
    status: 'ready',
    slug: 'fd3'
  },
  {
    number: 204,
    hm: 'Im-3',
    system: 'cubic',
    status: 'ready',
    slug: 'im3'
  },
  {
    number: 205,
    hm: 'Pa-3',
    system: 'cubic',
    status: 'ready',
    slug: 'pa3'
  },
  {
    number: 206,
    hm: 'Ia-3',
    system: 'cubic',
    status: 'ready',
    slug: 'ia3'
  },
  {
    number: 207,
    hm: 'P432',
    system: 'cubic',
    status: 'ready',
    slug: 'p432'
  },
  {
    number: 208,
    hm: 'P4232',
    system: 'cubic',
    status: 'ready',
    slug: 'p4232'
  },
  {
    number: 209,
    hm: 'F432',
    system: 'cubic',
    status: 'ready',
    slug: 'f432'
  },
  {
    number: 210,
    hm: 'F4132',
    system: 'cubic',
    status: 'ready',
    slug: 'f4132'
  },
  {
    number: 211,
    hm: 'I432',
    system: 'cubic',
    status: 'ready',
    slug: 'i432'
  },
  {
    number: 212,
    hm: 'P4332',
    system: 'cubic',
    status: 'ready',
    slug: 'p4332'
  },
  {
    number: 213,
    hm: 'P4132',
    system: 'cubic',
    status: 'ready',
    slug: 'p4132'
  },
  {
    number: 214,
    hm: 'I4132',
    system: 'cubic',
    status: 'ready',
    slug: 'i4132'
  },
  {
    number: 215,
    hm: 'P-43m',
    system: 'cubic',
    status: 'ready',
    slug: 'p43m'
  },
  {
    number: 216,
    hm: 'F-43m',
    system: 'cubic',
    status: 'ready',
    slug: 'f43m'
  },
  {
    number: 217,
    hm: 'I-43m',
    system: 'cubic',
    status: 'ready',
    slug: 'i43m'
  },
  {
    number: 218,
    hm: 'P-43n',
    system: 'cubic',
    status: 'ready',
    slug: 'p43n'
  },
  {
    number: 219,
    hm: 'F-43c',
    system: 'cubic',
    status: 'ready',
    slug: 'f43c'
  },
  {
    number: 220,
    hm: 'I-43d',
    system: 'cubic',
    status: 'ready',
    slug: 'i43d'
  },
  {
    number: 221,
    hm: 'Pm-3m',
    system: 'cubic',
    status: 'ready',
    slug: 'pm3m'
  },
  {
    number: 222,
    hm: 'Pn-3n',
    system: 'cubic',
    status: 'ready',
    slug: 'pn3n'
  },
  {
    number: 223,
    hm: 'Pm-3n',
    system: 'cubic',
    status: 'ready',
    slug: 'pm3n'
  },
  {
    number: 224,
    hm: 'Pn-3m',
    system: 'cubic',
    status: 'ready',
    slug: 'pn3m'
  },
  {
    number: 225,
    hm: 'Fm-3m',
    system: 'cubic',
    status: 'ready',
    slug: 'fm3m'
  },
  {
    number: 226,
    hm: 'Fm-3c',
    system: 'cubic',
    status: 'ready',
    slug: 'fm3c'
  },
  {
    number: 227,
    hm: 'Fd-3m',
    system: 'cubic',
    status: 'ready',
    slug: 'fd3m'
  },
  {
    number: 228,
    hm: 'Fd-3c',
    system: 'cubic',
    status: 'ready',
    slug: 'fd3c'
  },
  {
    number: 229,
    hm: 'Im-3m',
    system: 'cubic',
    status: 'ready',
    slug: 'im3m'
  },
  {
    number: 230,
    hm: 'Ia-3d',
    system: 'cubic',
    status: 'ready',
    slug: 'ia3d'
  }
]

export function systemInfo(id: CrystalSystemId): CrystalSystemInfo {
  return CRYSTAL_SYSTEMS.find((s) => s.id === id)!
}

export function groupsInSystem(id: CrystalSystemId): SpaceGroupEntry[] {
  return SPACE_GROUPS.filter((g) => g.system === id)
}

export function findGroup(query: string | number): SpaceGroupEntry | undefined {
  if (typeof query === 'number') return SPACE_GROUPS.find((g) => g.number === query)
  const q = query.trim().toLowerCase()
  if (!q) return undefined
  const asNum = Number(q)
  if (!Number.isNaN(asNum) && asNum >= 1 && asNum <= 230) {
    return SPACE_GROUPS.find((g) => g.number === asNum)
  }
  const slugQ = q.replace(/-/g, 'bar').replace(/[^a-z0-9]/g, '')
  return SPACE_GROUPS.find(
    (g) =>
      g.hm.toLowerCase() === q ||
      g.slug === slugQ ||
      g.hm.toLowerCase().replace(/-/g, 'bar').replace(/[^a-z0-9]/g, '') === slugQ,
  )
}

export function filterGroups(query: string, system?: CrystalSystemId | 'all'): SpaceGroupEntry[] {
  const q = query.trim().toLowerCase()
  return SPACE_GROUPS.filter((g) => {
    if (system && system !== 'all' && g.system !== system) return false
    if (!q) return true
    if (String(g.number).includes(q)) return true
    if (g.hm.toLowerCase().includes(q)) return true
    if (g.slug.includes(q.replace(/-/g, 'bar').replace(/[^a-z0-9]/g, ''))) return true
    return false
  })
}

export const READY_COUNT = SPACE_GROUPS.filter((g) => g.status === 'ready').length
export const TOTAL_GROUPS = SPACE_GROUPS.length
