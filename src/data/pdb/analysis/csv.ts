/** CSV builders for the structure-analysis report. */
import type { ProteinRow } from './protein'
import type { BasePair, NucleicRow, Step } from './nucleic'

export interface CsvMeta { pdbId: string | null; filter: string; date?: string; notes?: string[] }

export function csvCell(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : ''
  const s = String(v)
  return /[",\n#]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
export function csvHeader(section: string, m: CsvMeta): string {
  const lines = [
    `# crystalspacegroups.com structure analysis — ${section}`,
    `# PDB: ${m.pdbId ? m.pdbId.toUpperCase() : '(local file)'}`,
    `# Selection: ${m.filter}`,
    `# Date: ${m.date ?? new Date().toISOString().slice(0, 10)}`,
    ...(m.notes ?? []).map((n) => `# ${n}`),
  ]
  return lines.join('\n') + '\n'
}
export function toCsv(cols: string[], rows: unknown[][]): string {
  return [cols.join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n') + '\n'
}

export const NOTES = {
  backbone: 'Angles in degrees (IUPAC). phi C(i-1)-N-CA-C; psi N-CA-C-N(i+1); omega CA-C-N(i+1)-CA(i+1); cis if |omega|<30. Ramachandran class from the MolProbity Top8000 contours (Williams 2018; 2° grid lookup) — not a full validation report.',
  chi: 'chi per IUPAC-IUB 1970; symmetric groups (Asp chi2, Glu chi3, Phe/Tyr chi2) folded to [-90,90]. Rotamer letters p/t/m = +60/180/-60 within ±30° (Lovell 2000); planar terminal chi given as rounded value.',
  na: "Backbone alpha..zeta and chi (O4'-C1'-N9-C4 purines, O4'-C1'-N1-C2 pyrimidines); syn if |chi|<90. Pucker: Altona & Sundaralingam 1972 phase P and amplitude tau_m.",
  bp: 'Base frames from standard bases (Olson et al. 2001); parameters by the 3DNA algorithm (Lu & Olson 2003). Pairs = Watson-Crick H-bond geometry (2.5-3.5 Å).',
}

export const BACKBONE_COLS = ['chain', 'resnum', 'resname', 'phi', 'psi', 'omega', 'cis', 'rama_category', 'rama_class']
export const backboneRows = (rs: ProteinRow[]) => rs.map((r) => [r.res.chain, r.res.seq, r.res.comp, r.phi, r.psi, r.omega, r.cis ? 'cis' : r.omega != null ? 'trans' : '', r.category, r.rama ?? ''])
export const CHI_COLS = ['chain', 'resnum', 'resname', 'chi1', 'chi2', 'chi3', 'chi4', 'rotamer']
export const chiRows = (rs: ProteinRow[]) => rs.filter((r) => r.chi[0] != null).map((r) => [r.res.chain, r.res.seq, r.res.comp, ...r.chi, r.rotamer ?? ''])
export const NA_COLS = ['chain', 'resnum', 'resname', 'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'chi', 'glycosidic', 'pucker_P', 'tau_m', 'pucker']
export const naRows = (rs: NucleicRow[]) => rs.map((r) => [r.res.chain, r.res.seq, r.res.comp, r.alpha, r.beta, r.gamma, r.delta, r.epsilon, r.zeta, r.chi, r.glyco ?? '', r.P, r.tm, r.pucker ?? ''])
export const BP_COLS = ['pair', 'shear', 'stretch', 'stagger', 'buckle', 'propeller', 'opening']
export const bpRows = (ps: BasePair[]) => ps.map((p) => [p.label, p.shear, p.stretch, p.stagger, p.buckle, p.propeller, p.opening])
export const STEP_COLS = ['step', 'shift', 'slide', 'rise', 'tilt', 'roll', 'twist']
export const stepRows = (ss: Step[]) => ss.map((s) => [s.label, s.shift, s.slide, s.rise, s.tilt, s.roll, s.twist])

export interface ReportInput { protein: ProteinRow[]; nucleic: NucleicRow[]; pairs: BasePair[]; steps: Step[]; form: string | null }
export function sectionCsv(section: 'backbone' | 'chi' | 'na' | 'bp' | 'step', a: ReportInput, m: CsvMeta): string {
  const n = (k: keyof typeof NOTES) => ({ ...m, notes: [...(m.notes ?? []), NOTES[k]] })
  switch (section) {
    case 'backbone': return csvHeader('Protein backbone', n('backbone')) + toCsv(BACKBONE_COLS, backboneRows(a.protein))
    case 'chi': return csvHeader('Side-chain chi', n('chi')) + toCsv(CHI_COLS, chiRows(a.protein))
    case 'na': return csvHeader('Nucleic-acid torsions and pucker', n('na')) + toCsv(NA_COLS, naRows(a.nucleic))
    case 'bp': return csvHeader('Base-pair parameters (Å, °)', n('bp')) + toCsv(BP_COLS, bpRows(a.pairs))
    case 'step': return csvHeader('Base-pair step parameters (Å, °)', { ...n('bp'), notes: [...(n('bp').notes ?? []), ...(a.form ? [`Helical form hint: ${a.form}`] : [])] }) + toCsv(STEP_COLS, stepRows(a.steps))
  }
}
export function fullReportCsv(a: ReportInput, m: CsvMeta): string {
  const parts: string[] = [csvHeader('Full report', m)]
  const secs: ['backbone' | 'chi' | 'na' | 'bp' | 'step', boolean][] = [
    ['backbone', a.protein.length > 0], ['chi', a.protein.length > 0], ['na', a.nucleic.length > 0], ['bp', a.pairs.length > 0], ['step', a.steps.length > 0],
  ]
  for (const [s, on] of secs) if (on) parts.push('\n' + sectionCsv(s, a, { ...m, notes: [] }).split('\n').filter((l, i) => i === 0 || !/^# (PDB|Date|Selection):/.test(l)).join('\n'))
  return parts.join('')
}

/** Multi-structure (overlay) CSV: same sections with a leading `structure` column. */
export type CsvSection = 'backbone' | 'chi' | 'na' | 'bp' | 'step'
const SECTION_DEF: Record<CsvSection, { title: string; note: keyof typeof NOTES; cols: string[]; rows: (a: ReportInput) => unknown[][]; has: (a: ReportInput) => boolean }> = {
  backbone: { title: 'Protein backbone', note: 'backbone', cols: BACKBONE_COLS, rows: (a) => backboneRows(a.protein), has: (a) => a.protein.length > 0 },
  chi: { title: 'Side-chain chi', note: 'chi', cols: CHI_COLS, rows: (a) => chiRows(a.protein), has: (a) => a.protein.length > 0 },
  na: { title: 'Nucleic-acid torsions and pucker', note: 'na', cols: NA_COLS, rows: (a) => naRows(a.nucleic), has: (a) => a.nucleic.length > 0 },
  bp: { title: 'Base-pair parameters (Å, °)', note: 'bp', cols: BP_COLS, rows: (a) => bpRows(a.pairs), has: (a) => a.pairs.length > 0 },
  step: { title: 'Base-pair step parameters (Å, °)', note: 'bp', cols: STEP_COLS, rows: (a) => stepRows(a.steps), has: (a) => a.steps.length > 0 },
}
export function overlaySectionCsv(section: CsvSection, list: { label: string; a: ReportInput }[], m: CsvMeta): string {
  const d = SECTION_DEF[section]
  const rows = list.flatMap(({ label, a }) => d.rows(a).map((r) => [label, ...r]))
  return csvHeader(`${d.title} — overlay of ${list.length} structures`, { ...m, notes: [...(m.notes ?? []), NOTES[d.note]] }) + toCsv(['structure', ...d.cols], rows)
}
export function overlayFullReportCsv(list: { label: string; a: ReportInput }[], m: CsvMeta): string {
  const parts: string[] = [csvHeader(`Full report — overlay of ${list.length} structures`, m)]
  for (const s of Object.keys(SECTION_DEF) as CsvSection[]) {
    if (!list.some((x) => SECTION_DEF[s].has(x.a))) continue
    parts.push('\n' + overlaySectionCsv(s, list, { ...m, notes: [] }).split('\n').filter((l, i) => i === 0 || !/^# (PDB|Date|Selection):/.test(l)).join('\n'))
  }
  return parts.join('')
}
