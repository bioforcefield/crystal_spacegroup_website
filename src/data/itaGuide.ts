/**
 * Citations and verified facts for the “How to read ITA diagrams” guide.
 *
 * Conventions checked against:
 * - Dauter & Jaskolski, J. Appl. Cryst. (2010) 43, 1150–1171 (HTML + PDF)
 * - ITA online explanationAc.pdf (diagram types; points to Tables 2.1.2.2–2.1.2.7)
 * - ITA Chapter 1.4 graphical symbols (Ab edition contents / Hahn tables),
 *   especially §1.4.1–1.4.2 plane symbols and the parallel-plane height footnote
 * - The actual plate public/ita-diagrams/014.png (2×2 quadrants inspected)
 *
 * P21C_PLATE_VIEWS is an independently derived reading of that PNG; the
 * walk-through text must stay consistent with it (tests enforce that).
 */

export type ItaGuideCitation = {
  id: string
  label: string
  url: string
  note: string
}

export const ITA_GUIDE_CITATIONS: readonly ItaGuideCitation[] = [
  {
    id: 'dauter-2010',
    label: 'Dauter & Jaskolski (2010), J. Appl. Cryst. 43, 1150–1171',
    url: 'https://journals.iucr.org/j/issues/2010/05/02/kk5061/',
    note: 'IUCr teaching article on reading ITA pages: element vs general-position diagrams; lens/arrow/circle marks; plane line styles; ± and height labels on general-position diagrams.',
  },
  {
    id: 'dauter-2010-pdf',
    label: 'Dauter & Jaskolski (2010) PDF (doi:10.1107/S0021889810026956)',
    url: 'https://journals.iucr.org/j/issues/2010/05/02/kk5061/kk5061.pdf',
    note: 'Same article as PDF.',
  },
  {
    id: 'ita-explanation-ac',
    label: 'ITA (Ac) — Explanation of the space-group data',
    url: 'https://it.iucr.org/Ac/explanationAc.pdf',
    note: 'Ac accompaniment: each entry has symmetry-element projection(s) plus one general-position illustration; refers to graphical-symbol Tables 2.1.2.2–2.1.2.7 and diagram axes in §2.1.3.6.',
  },
  {
    id: 'ita-ch1o4-ab',
    label: 'ITA (Ab) Chapter 1.4 — Graphical symbols for symmetry elements',
    url: 'https://it.iucr.org/Ab/ch1o4v0001/contents/',
    note: 'Ab HTML edition chapter index for §1.4.1 planes ⊥ projection, §1.4.2 planes ∥ projection (angular corners; fraction h means planes at h and h+½), §1.4.5–1.4.6 axes.',
  },
  {
    id: 'ita-home',
    label: 'International Tables for Crystallography (online)',
    url: 'https://it.iucr.org/',
    note: 'Publisher hub. Note: Ab §1.4 and Ac Tables 2.1.2.x are the same symbol set under different edition section numbers.',
  },
] as const

/** Planes perpendicular to the page (ITA §1.4.1 / Dauter Fig. 12 summary). */
export const ITA_PLANE_NORMAL_STYLES = [
  {
    id: 'mirror',
    label: 'Mirror m',
    style: 'solid line',
    meaning: 'Reflection plane normal to the projection (no glide component).',
  },
  {
    id: 'glide-inplane',
    label: 'Axial glide (component in the page)',
    style: 'dashed line',
    meaning:
      'Glide plane normal to the page whose glide vector lies in the plane of the diagram (½ of a lattice translation in that line).',
  },
  {
    id: 'glide-perp',
    label: 'Axial glide (component ⊥ page)',
    style: 'dotted line',
    meaning:
      'Glide plane normal to the page whose glide vector is perpendicular to the diagram.',
  },
  {
    id: 'glide-n',
    label: 'n-glide',
    style: 'dash–dot line',
    meaning:
      'Diagonal glide: one vector with two equal components — ½ along the line in the page and ½ normal to the page (ITA §1.4.1). Dauter’s “45° out of plane” is a shorthand for that geometry, not a separate rule.',
  },
  {
    id: 'glide-e',
    label: 'e-glide (double glide)',
    style: 'dash–double-dot line',
    meaning:
      'Centered double glide: two glide vectors, one parallel to the projection line and one normal to the page (ITA §1.4.1; e symbol).',
  },
  {
    id: 'glide-d',
    label: 'd-glide (diamond)',
    style: 'dash–dot line with arrow(s)',
    meaning:
      'Diamond glide with ¼-type components; the arrow(s) show the in-page component of the glide (ITA §1.4.1).',
  },
] as const

/** Planes parallel to the page (ITA §1.4.2). */
export const ITA_PLANE_PARALLEL_STYLES = [
  {
    id: 'mirror-parallel',
    label: 'Mirror ∥ page',
    style: 'angular corner',
    meaning: 'Reflection plane parallel to the projection plane.',
  },
  {
    id: 'glide-parallel',
    label: 'Axial glide ∥ page',
    style: 'angular corner + arrow',
    meaning:
      'Glide plane parallel to the page; the arrow gives the glide direction in the page (½ lattice vector along the arrow).',
  },
] as const

export const ITA_GUIDE_CAVEATS = [
  'The same physical glide can look dashed in one projection and dotted in another, because the line style encodes the glide component relative to that projection — never memorize a single line pattern as “always c-glide” (ITA §1.4.4 note on projection-independent graphics vs printed a/b/c/n labels).',
  'Axis and plane marks change with orientation: a 2₁ ‖ b is a filled lens with screw tails when you look along b, but a single-barb half-arrow when b lies in the page.',
  'Low-symmetry systems (triclinic, monoclinic, orthorhombic) show several symmetry-element projections; higher systems often use one principal view. Always read the axis letters printed on the plate.',
  'For planes drawn parallel to the page, ITA §1.4.2 states that a fraction h on the symbol denotes planes at heights h and h+½ (no fraction ⇒ 0 and ½). That paired-height rule is for those parallel-plane marks — do not assume every fractional label on every symbol implies a mate half a cell away without checking the element type.',
  'Site SVGs here are schematic teaching marks, not reproductions of IUCr artwork. Exhaustive official sets: ITA Ab §1.4 / Ac Tables 2.1.2.2–2.1.2.7.',
] as const

/**
 * Independently derived reading of public/ita-diagrams/014.png (2×2).
 * Quadrant order: top-left, top-right, bottom-left, bottom-right.
 */
export const P21C_PLATE_VIEWS = [
  {
    quadrant: 'top-left',
    id: 'along-b',
    projectionAlong: 'b',
    axes: { right: 'a', down: 'c' },
    marks: [
      'filled 2₁ lenses with curved screw tails (axes ⊥ page)',
      'open circles = inversion centres',
      'upper-left angular corner + arrow labelled 1/4 = c-glide plane parallel to the page at y = 1/4 (arrow along c), not a screw-axis height',
    ],
  },
  {
    quadrant: 'top-right',
    id: 'along-a',
    projectionAlong: 'a',
    axes: { left: 'b', down: 'c_p' },
    marks: [
      'vertical dashed lines = c-glide (glide translation along c, in the page)',
      'horizontal single-barb half-arrows = 2₁ ‖ b in the page',
      'open circles = inversion centres',
    ],
  },
  {
    quadrant: 'bottom-left',
    id: 'along-c',
    projectionAlong: 'c',
    axes: { up: 'b', right: 'a_p' },
    marks: [
      'horizontal dotted lines = c-glide (glide translation along c, out of the page)',
      'vertical single-barb half-arrows = 2₁ ‖ b, labelled 1/4 for height along c (z = 1/4), not along a',
      'open circles = inversion centres',
    ],
  },
  {
    quadrant: 'bottom-right',
    id: 'general',
    projectionAlong: 'b',
    axes: { right: 'a', down: 'c' },
    marks: [
      'open circle = one hand; comma inside circle = opposite hand',
      '+ / − written beside circles stand for +y / −y (variable height), not a fixed numeric elevation',
      '½+ and ½− mean ½+y and ½−y',
    ],
  },
] as const

/**
 * Narrative walk-through kept in lockstep with P21C_PLATE_VIEWS (same ids/order).
 */
export const P21C_ITA_WALKTHROUGH = {
  number: 14,
  hm: 'P21/c',
  setting: 'Monoclinic, unique axis b, cell choice 1',
  plateLayout:
    'The site plate (014.png) is a 2×2 crop: top-left along b (a →, c ↓); top-right along a (b ←, c_p ↓); bottom-left along c (b ↑, a_p →); bottom-right general positions in the along-b projection.',
  panels: [
    {
      id: 'along-b',
      title: 'Top-left · symmetry elements · along b (a right, c down)',
      whatToSee:
        'Filled lens marks with curved screw tails are 2₁ axes perpendicular to the page. Open circles are inversion centres. The bent angular corner with an arrow and the fraction 1/4 at upper left marks a c-glide plane parallel to the page at height y = 1/4 (arrow along c) — that 1/4 is the plane height, not the screw-axis label.',
    },
    {
      id: 'along-a',
      title: 'Top-right · symmetry elements · along a (b left, c_p down)',
      whatToSee:
        'Vertical dashed lines are c-glide traces whose glide translation (along c) lies in the page. Horizontal single-barb half-arrows are 2₁ axes parallel to b. Open circles remain inversion centres.',
    },
    {
      id: 'along-c',
      title: 'Bottom-left · symmetry elements · along c (b up, a_p right)',
      whatToSee:
        'Horizontal dotted lines are the same c-glide family with the glide translation out of the page. Vertical single-barb half-arrows are 2₁ ‖ b; the printed 1/4 is the height of those axes along c (z = 1/4), not a height along a.',
    },
    {
      id: 'general',
      title: 'Bottom-right · general positions · along b',
      whatToSee:
        'Circles mark equivalent points. A comma inside a circle marks the opposite hand. Labels +, −, ½+ and ½− sit beside the circles and mean +y, −y, ½+y and ½−y — they encode the variable height coordinate, not a fixed numeric z of the site.',
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

/** Back-compat alias used by older tests / imports. */
export const ITA_PLANE_LINE_STYLES = ITA_PLANE_NORMAL_STYLES
