/**
 * Citations and verified facts for the “How to read ITA diagrams” guide.
 * Conventions are taken from IUCr International Tables Vol. A explanations
 * and Dauter & Jaskolski (2010). This file is the single source for regression
 * checks — do not invent symbols here.
 */

export type ItaGuideCitation = {
  id: string
  label: string
  url: string
  note: string
}

/** Authoritative sources consulted for the guide (open / publisher pages). */
export const ITA_GUIDE_CITATIONS: readonly ItaGuideCitation[] = [
  {
    id: 'dauter-2010',
    label: 'Dauter & Jaskolski (2010), J. Appl. Cryst. 43, 1150–1171',
    url: 'https://journals.iucr.org/j/issues/2010/05/02/kk5061/',
    note: 'IUCr teaching article: how to read ITA space-group pages, including graphical symbols and ± / height conventions on general-position diagrams.',
  },
  {
    id: 'dauter-2010-pdf',
    label: 'Dauter & Jaskolski (2010) PDF',
    url: 'https://journals.iucr.org/j/issues/2010/05/02/kk5061/kk5061.pdf',
    note: 'Same article as PDF (doi:10.1107/S0021889810026956).',
  },
  {
    id: 'ita-explanation',
    label: 'ITA online — Explanation of the space-group data',
    url: 'https://it.iucr.org/Ac/explanationAc.pdf',
    note: 'Official ITA accompaniment: diagrams show symmetry-element projections plus one general-position illustration; graphical symbols listed in Tables 2.1.2.2–2.1.2.7; axes described in §2.1.3.6.',
  },
  {
    id: 'ita-graphical-symbols',
    label: 'ITA — Graphical symbols for symmetry elements (§1.4 / Ch. 1.4)',
    url: 'https://it.iucr.org/Ab/contents/',
    note: 'Contents listing for printed/online graphical-symbol tables (planes normal/parallel to the projection; axes normal/parallel to the projection).',
  },
  {
    id: 'ita-home',
    label: 'International Tables for Crystallography (online)',
    url: 'https://it.iucr.org/',
    note: 'Publisher site for Volume A space-group symmetry.',
  },
] as const

/** Plane-perpendicular line styles as summarized by Dauter & Jaskolski (2010). */
export const ITA_PLANE_LINE_STYLES = [
  {
    id: 'mirror',
    label: 'Mirror m',
    style: 'solid line',
    meaning: 'Reflection plane perpendicular to the page (no glide component).',
  },
  {
    id: 'glide-inplane',
    label: 'Glide (translation in the page)',
    style: 'dashed line',
    meaning: 'Glide plane ⊥ page whose glide component lies in the plane of the diagram.',
  },
  {
    id: 'glide-perp',
    label: 'Glide (translation ⊥ page)',
    style: 'dotted line',
    meaning: 'Glide plane ⊥ page whose glide component is perpendicular to the diagram.',
  },
  {
    id: 'glide-n',
    label: 'n-glide',
    style: 'dash–dot line',
    meaning: 'Diagonal glide roughly 45° out of the page (n).',
  },
  {
    id: 'glide-e',
    label: 'e-glide',
    style: 'dash–double-dot line',
    meaning: 'Centered “double” glide with translations both in and out of the page (e).',
  },
  {
    id: 'glide-d',
    label: 'd-glide',
    style: 'dash–dot with arrows',
    meaning: 'Diamond glide (¼ diagonal); arrows mark the 45° sense.',
  },
] as const

export const ITA_GUIDE_CAVEATS = [
  'The same physical glide can look dashed in one projection and dotted in another, because the line style encodes the glide component relative to that projection — never memorize a single line pattern as “always c-glide”.',
  'Axis and plane marks change with orientation: a 2₁ ‖ b is a lens/propeller when you look along b, but a half-arrow when b lies in the page.',
  'Low-symmetry systems (triclinic, monoclinic, orthorhombic) show several symmetry-element projections; higher systems often use one principal view. Always read the axis labels printed on the plate.',
  'Site SVGs below are schematic teaching marks, not reproductions of IUCr artwork. For the exhaustive official set see ITA Tables 2.1.2.2–2.1.2.7.',
] as const

/**
 * Worked example for the plate shipped as public/ita-diagrams/014.png
 * (unique axis b, cell choice 1). Triplets match this site’s P21/c operators
 * and the standard ITA general position for No. 14.
 */
export const P21C_ITA_WALKTHROUGH = {
  number: 14,
  hm: 'P21/c',
  setting: 'Monoclinic, unique axis b, cell choice 1',
  plateLayout:
    'The site plate is a 2×2 crop: three symmetry-element projections (along b, c, and a) plus one general-position diagram.',
  panels: [
    {
      id: 'along-b',
      title: 'Symmetry elements · projection along b (onto ac)',
      whatToSee:
        '2₁ axes appear as filled lens/propeller marks (axes ⊥ page) near z = ¼ and related cells; open circles mark inversion centres; a ¼ height mark belongs to elements whose height is along the projection axis b.',
    },
    {
      id: 'along-c',
      title: 'Symmetry elements · projection along c',
      whatToSee:
        'c-glide planes appear as dashed traces when the glide component lies in the page; 2₁ ‖ b shows as half-arrows in the plane of the diagram; inversion centres remain small open circles.',
    },
    {
      id: 'along-a',
      title: 'Symmetry elements · projection along a',
      whatToSee:
        'The same c-glide can appear with a dotted style when its translation is perpendicular to this page; 2₁ ‖ b is a vertical half-arrow, often labeled ¼ for height along a.',
    },
    {
      id: 'general',
      title: 'General-position diagram',
      whatToSee:
        'Circles mark equivalent points. A comma inside the circle marks the opposite hand (improper image). +, −, ½+ and ½− are heights along the projection axis of that panel (here related to y for the unique-b setting), not arbitrary decoration.',
    },
  ],
  operators: [
    { index: 1, triplet: 'x, y, z', label: 'Identity' },
    { index: 2, triplet: '−x, y+½, −z+½', label: '2₁ screw ‖ b' },
    { index: 3, triplet: '−x, −y, −z', label: 'Inversion (−1)' },
    { index: 4, triplet: 'x, −y+½, z+½', label: 'c-glide ⊥ b' },
  ],
  note:
    'In the Hermann–Mauguin symbol P21/c both “21” and “c” refer to the unique b direction: the screw is parallel to b, the c-glide is perpendicular to b (Dauter & Jaskolski, 2010).',
} as const

export const ITA_GUIDE_TITLE = 'How to read ITA diagrams'
export const ITA_GUIDE_BLURB =
  'A short guide to International Tables Vol. A space-group plates: the two diagram types, projection axes, common graphical marks, height labels, and a worked walk-through of P21/c (No. 14) as printed on this site.'
