/** URL model for the CIF map: /cif, /cif/cod/<id>, /cif/pdb/<id>, /cif/sample/<name>, /cif/file/<name>. */
export type CifTarget =
  | { kind: 'none' }
  | { kind: 'cod'; id: string }
  | { kind: 'pdb'; id: string }
  | { kind: 'sample'; name: string }
  | { kind: 'file'; name: string }
  | { kind: 'invalid'; raw: string }

export const SAMPLES: Record<string, { file: string; label: string }> = {
  acetic_p21c: { file: 'acetic_p21c.cif', label: 'acetic_p21c.cif (sample)' },
}

/** 4-character PDB ID (digit + 3 alphanumerics), case-insensitive. */
export const PDB_ID_RE = /^[0-9][a-z0-9]{3}$/i

/** Parse a router pathname (basename already stripped). */
export function parseCifPath(pathname: string): CifTarget {
  const p = pathname.replace(/\/+$/, '')
  const m = /^\/cif(?:\/(.*))?$/.exec(p)
  if (!m || !m[1]) return { kind: 'none' }
  const [kind, ...rest] = m[1].split('/')
  let arg = ''
  try {
    arg = decodeURIComponent(rest.join('/'))
  } catch {
    return { kind: 'invalid', raw: m[1] }
  }
  if (kind === 'cod' && /^\d{5,10}$/.test(arg)) return { kind: 'cod', id: arg }
  if (kind === 'pdb' && PDB_ID_RE.test(arg)) return { kind: 'pdb', id: arg.toLowerCase() }
  if (kind === 'sample' && arg) return { kind: 'sample', name: arg }
  if (kind === 'file' && arg) return { kind: 'file', name: arg }
  return { kind: 'invalid', raw: m[1] }
}

/** Human explanation for an unparseable /cif/… address, plus the typed id to keep in the input. */
export function invalidTargetInfo(raw: string): { message: string; mode: 'pdb' | 'id' | null; value: string | null } {
  const [kind, ...rest] = raw.split('/')
  let arg = rest.join('/')
  try { arg = decodeURIComponent(arg) } catch { /* keep raw */ }
  if (kind === 'pdb') {
    const why = !arg ? 'is empty' : arg.length !== 4 ? `has ${arg.length} characters` : !/^[0-9]/.test(arg) ? 'must start with a digit' : 'contains characters other than letters and digits'
    return { message: `“${arg}” is not a valid PDB ID — it ${why}. PDB IDs are 4 characters starting with a digit, e.g. 4HHB.`, mode: 'pdb', value: arg.toUpperCase() || null }
  }
  if (kind === 'cod') {
    return { message: `“${arg}” is not a valid COD id — COD ids are 5–10 digits, e.g. 1100303.`, mode: 'id', value: arg.replace(/\D/g, '') || null }
  }
  return { message: `Unrecognised Lattice Lab address “/cif/${raw}”. Use /cif/pdb/<ID>, /cif/cod/<id> or /cif/sample/<name>.`, mode: null, value: null }
}

export function cifPath(t: CifTarget): string {
  switch (t.kind) {
    case 'cod':
      return `/cif/cod/${t.id}`
    case 'pdb':
      return `/cif/pdb/${t.id.toLowerCase()}`
    case 'sample':
      return `/cif/sample/${encodeURIComponent(t.name)}`
    case 'file':
      return `/cif/file/${encodeURIComponent(t.name)}`
    default:
      return '/cif'
  }
}

export function targetKey(t: CifTarget): string {
  return t.kind === 'none' || t.kind === 'invalid' ? t.kind : cifPath(t)
}

export function breadcrumbLabel(t: CifTarget): string | null {
  if (t.kind === 'cod') return `COD ${t.id}`
  if (t.kind === 'pdb') return `PDB ${t.id.toUpperCase()}`
  if (t.kind === 'sample') return `Sample ${t.name}`
  if (t.kind === 'file') return t.name
  return null
}

// ---- view state in the query string (defaults omitted) ----
export type CifViewQuery = {
  op: number
  view: 'nearest' | 'wrapped' | 'whole'
  show: 'molecules' | 'all' | 'selected' | 'asymmetric'
  color: 'operator' | 'element' | 'equivalence' | 'residue' | 'chain'
  /** PDB representation (cartoon default). */
  rep?: 'cartoon' | 'trace' | 'full'
  /** PDB ligand focus id, e.g. HEM_A_142. */
  lig?: string | null
  /** 2D ligand interaction diagram open. */
  diagram?: boolean
  /** PDB structure-analysis drawer tab (e.g. rama, chi, na, pucker, bp, step). */
  analysis?: AnalysisTab | null
  /** PDB biological assembly number (absent = asymmetric unit). */
  asm?: number | null
  /** PDB coordinate source (absent = RCSB). */
  src?: 'redo' | null
}
export const ANALYSIS_TABS = ['rama', 'chi', 'na', 'pucker', 'bp', 'step'] as const
export type AnalysisTab = (typeof ANALYSIS_TABS)[number]
export const VIEW_DEFAULTS: CifViewQuery = { op: 1, view: 'nearest', show: 'molecules', color: 'operator' }
const REPS = ['cartoon', 'trace', 'full'] as const
const VIEW_TOKENS: Record<string, CifViewQuery['view']> = { near: 'nearest', cell: 'wrapped', whole: 'whole' }
const SHOW_TOKENS: Record<string, CifViewQuery['show']> = {
  molecules: 'molecules', all: 'all', pair: 'selected', asu: 'asymmetric',
}
const COLORS: CifViewQuery['color'][] = ['operator', 'element', 'equivalence', 'residue', 'chain']
const inv = <T extends string>(o: Record<string, T>, v: T) => Object.keys(o).find((k) => o[k] === v)!

export function parseViewQuery(search: string | URLSearchParams): CifViewQuery {
  const q = typeof search === 'string' ? new URLSearchParams(search) : search
  const out = { ...VIEW_DEFAULTS }
  const op = Number(q.get('op'))
  if (Number.isInteger(op) && op >= 1 && op <= 192) out.op = op
  const v = VIEW_TOKENS[q.get('view') ?? '']
  if (v) out.view = v
  const s = SHOW_TOKENS[q.get('show') ?? '']
  if (s) out.show = s
  const c = q.get('color') as CifViewQuery['color']
  if (COLORS.includes(c)) out.color = c
  const rep = q.get('rep') as CifViewQuery['rep']
  if (rep && (REPS as readonly string[]).includes(rep) && rep !== 'cartoon') out.rep = rep
  const lig = q.get('lig')
  if (lig && /^[A-Za-z0-9]{1,5}_[A-Za-z0-9]{1,4}_-?[0-9A-Za-z]{1,6}$/.test(lig)) out.lig = lig
  if (out.lig && q.get('diagram') === '1') out.diagram = true
  const an = q.get('analysis') as AnalysisTab
  if (an && (ANALYSIS_TABS as readonly string[]).includes(an)) out.analysis = an
  const asm = Number(q.get('asm'))
  if (Number.isInteger(asm) && asm >= 1 && asm <= 99) out.asm = asm
  if (q.get('src') === 'redo') out.src = 'redo'
  return out
}

export function serializeViewQuery(v: CifViewQuery): string {
  const q = new URLSearchParams()
  if (v.op !== VIEW_DEFAULTS.op) q.set('op', String(v.op))
  if (v.view !== VIEW_DEFAULTS.view) q.set('view', inv(VIEW_TOKENS, v.view))
  if (v.show !== VIEW_DEFAULTS.show) q.set('show', inv(SHOW_TOKENS, v.show))
  if (v.color !== VIEW_DEFAULTS.color) q.set('color', v.color)
  if (v.rep && v.rep !== 'cartoon') q.set('rep', v.rep)
  if (v.lig) q.set('lig', v.lig)
  if (v.lig && v.diagram) q.set('diagram', '1')
  if (v.analysis) q.set('analysis', v.analysis)
  if (v.asm) q.set('asm', String(v.asm))
  if (v.src === 'redo') q.set('src', 'redo')
  const s = q.toString()
  return s ? `?${s}` : ''
}

// ---- uploaded / pasted files kept for refresh ----
/** Namespaced + versioned so a future format change can't read stale uploads. */
export const FILE_STORE_PREFIX = 'latticelab:v1:file:'
const LEGACY_FILE_PREFIX = 'cif-file:'
export const FILE_STORE_MAX = 2 * 1024 * 1024

export function storeFile(store: Storage | undefined, name: string, text: string): boolean {
  if (!store || text.length > FILE_STORE_MAX) return false
  try {
    // keep only the latest upload to stay well within quota
    for (let i = store.length - 1; i >= 0; i--) {
      const k = store.key(i)
      if (k?.startsWith(FILE_STORE_PREFIX) || k?.startsWith(LEGACY_FILE_PREFIX)) store.removeItem(k)
    }
    store.setItem(FILE_STORE_PREFIX + name, text)
    return true
  } catch {
    return false
  }
}

export function loadStoredFile(store: Storage | undefined, name: string): string | null {
  try {
    return store?.getItem(FILE_STORE_PREFIX + name) ?? store?.getItem(LEGACY_FILE_PREFIX + name) ?? null
  } catch {
    return null
  }
}
