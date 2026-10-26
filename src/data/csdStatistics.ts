/**
 * Cambridge Structural Database (CSD) space-group frequency summary.
 *
 * Source: CCDC “CSD Space Group Statistics – Space Group Frequency Ordering”
 * as of 1 January 2026. We cite the official PDF; we do not republish the
 * full 230-row table. This site is not affiliated with the CCDC.
 */

export interface CsdFrequencyRow {
  rank: number
  number: number
  /** Hermann–Mauguin as published in the CSD stats PDF (ASCII) */
  hm: string
  count: number
  /** Published % of CSD (structures with fully defined space group) */
  percent: number
  /** Display label when the PDF prints “<0.3” instead of a precise value */
  percentLabel?: string
}

export interface CsdStatisticsSummary {
  asOf: string
  totalWithSpaceGroup: number
  centrosymmetric: { count: number; percent: number }
  nonCentrosymmetric: { count: number; percent: number }
  sohncke: { count: number; percent: number }
  sourceTitle: string
  pdfUrl: string
  interactiveChartsUrl: string
  statisticsLandingUrl: string
}

/** Headline figures from the 1 Jan 2026 frequency-ordering PDF. */
export const CSD_SUMMARY: CsdStatisticsSummary = {
  asOf: '1 January 2026',
  totalWithSpaceGroup: 1_427_576,
  centrosymmetric: { count: 1_115_651, percent: 78 },
  nonCentrosymmetric: { count: 311_925, percent: 22 },
  sohncke: { count: 235_301, percent: 16 },
  sourceTitle:
    'CSD Space Group Statistics – Space Group Frequency Ordering (Cambridge Structural Database, 1 January 2026)',
  pdfUrl:
    'https://www.ccdc.cam.ac.uk/media/CSD-Space-Group-Statistics-Space-Group-Frequency-Ordering-2026.pdf',
  interactiveChartsUrl:
    'https://www.ccdc.cam.ac.uk/solutions/about-the-csd/csd-interactive-charts/',
  statisticsLandingUrl:
    'https://www.ccdc.cam.ac.uk/solutions/about-the-csd/csd-statistics/',
}

/**
 * Top 30 by frequency in the CSD (1 Jan 2026).
 * Counts and % match the official PDF; ranks 23–30 publish “<0.3”.
 */
export const CSD_TOP_FREQUENCY: CsdFrequencyRow[] = [
  { rank: 1, number: 14, hm: 'P21/c', count: 482_555, percent: 33.8 },
  { rank: 2, number: 2, hm: 'P-1', count: 360_320, percent: 25.2 },
  { rank: 3, number: 15, hm: 'C2/c', count: 117_036, percent: 8.2 },
  { rank: 4, number: 19, hm: 'P212121', count: 99_582, percent: 7.0 },
  { rank: 5, number: 4, hm: 'P21', count: 74_867, percent: 5.2 },
  { rank: 6, number: 61, hm: 'Pbca', count: 45_265, percent: 3.2 },
  { rank: 7, number: 33, hm: 'Pna21', count: 19_399, percent: 1.4 },
  { rank: 8, number: 9, hm: 'Cc', count: 14_822, percent: 1.0 },
  { rank: 9, number: 1, hm: 'P1', count: 14_628, percent: 1.0 },
  { rank: 10, number: 62, hm: 'Pnma', count: 14_087, percent: 1.0 },
  { rank: 11, number: 5, hm: 'C2', count: 12_503, percent: 0.9 },
  { rank: 12, number: 60, hm: 'Pbcn', count: 11_596, percent: 0.8 },
  { rank: 13, number: 148, hm: 'R-3', count: 11_441, percent: 0.8 },
  { rank: 14, number: 29, hm: 'Pca21', count: 10_866, percent: 0.8 },
  { rank: 15, number: 13, hm: 'P2/c', count: 9_312, percent: 0.7 },
  { rank: 16, number: 12, hm: 'C2/m', count: 7_338, percent: 0.5 },
  { rank: 17, number: 7, hm: 'Pc', count: 6_656, percent: 0.5 },
  { rank: 18, number: 11, hm: 'P21/m', count: 6_432, percent: 0.5 },
  { rank: 19, number: 18, hm: 'P21212', count: 5_841, percent: 0.4 },
  { rank: 20, number: 88, hm: 'I41/a', count: 5_088, percent: 0.4 },
  { rank: 21, number: 56, hm: 'Pccn', count: 4_931, percent: 0.3 },
  { rank: 22, number: 43, hm: 'Fdd2', count: 4_700, percent: 0.3 },
  {
    rank: 23,
    number: 92,
    hm: 'P41212',
    count: 2_686,
    percent: 0.188,
    percentLabel: '<0.3',
  },
  {
    rank: 24,
    number: 167,
    hm: 'R-3c',
    count: 2_645,
    percent: 0.185,
    percentLabel: '<0.3',
  },
  {
    rank: 25,
    number: 20,
    hm: 'C2221',
    count: 2_497,
    percent: 0.175,
    percentLabel: '<0.3',
  },
  {
    rank: 26,
    number: 96,
    hm: 'P43212',
    count: 2_424,
    percent: 0.170,
    percentLabel: '<0.3',
  },
  {
    rank: 27,
    number: 146,
    hm: 'R3',
    count: 2_111,
    percent: 0.148,
    percentLabel: '<0.3',
  },
  {
    rank: 28,
    number: 36,
    hm: 'Cmc21',
    count: 1_950,
    percent: 0.137,
    percentLabel: '<0.3',
  },
  {
    rank: 29,
    number: 82,
    hm: 'I-4',
    count: 1_909,
    percent: 0.134,
    percentLabel: '<0.3',
  },
  {
    rank: 30,
    number: 64,
    hm: 'Cmca',
    count: 1_839,
    percent: 0.129,
    percentLabel: '<0.3',
  },
]

/** Rows used for the horizontal ranking chart (top 10; bars use √ scale in UI). */
export const CSD_CHART_ROWS = CSD_TOP_FREQUENCY.slice(0, 10)

/** Rows used for the compact table (top 20). */
export const CSD_TABLE_ROWS = CSD_TOP_FREQUENCY.slice(0, 20)

export function formatCount(n: number): string {
  return n.toLocaleString('en-US')
}

export function formatPercent(row: CsdFrequencyRow): string {
  if (row.percentLabel) return row.percentLabel
  return `${row.percent.toFixed(row.percent >= 10 ? 1 : 1)}%`
}
