/** URL model for the CIF map: /cif, /cif/cod/<id>, /cif/sample/<name>, /cif/file/<name>. */
export type CifTarget =
  | { kind: 'none' }
  | { kind: 'cod'; id: string }
  | { kind: 'sample'; name: string }
  | { kind: 'file'; name: string }
  | { kind: 'invalid'; raw: string }

export const SAMPLES: Record<string, { file: string; label: string }> = {
  acetic_p21c: { file: 'acetic_p21c.cif', label: 'acetic_p21c.cif (sample)' },
}

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
  if (kind === 'sample' && arg) return { kind: 'sample', name: arg }
  if (kind === 'file' && arg) return { kind: 'file', name: arg }
  return { kind: 'invalid', raw: m[1] }
}

export function cifPath(t: CifTarget): string {
  switch (t.kind) {
    case 'cod':
      return `/cif/cod/${t.id}`
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
  if (t.kind === 'sample') return `Sample ${t.name}`
  if (t.kind === 'file') return t.name
  return null
}

// ---- view state in the query string (defaults omitted) ----
export type CifViewQuery = {
  op: number
  view: 'nearest' | 'wrapped'
  show: 'molecules' | 'all' | 'selected' | 'asymmetric'
  color: 'operator' | 'element' | 'equivalence' | 'residue'
}
export const VIEW_DEFAULTS: CifViewQuery = { op: 1, view: 'nearest', show: 'molecules', color: 'operator' }
const VIEW_TOKENS: Record<string, CifViewQuery['view']> = { near: 'nearest', cell: 'wrapped' }
const SHOW_TOKENS: Record<string, CifViewQuery['show']> = {
  molecules: 'molecules', all: 'all', pair: 'selected', asu: 'asymmetric',
}
const COLORS: CifViewQuery['color'][] = ['operator', 'element', 'equivalence', 'residue']
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
  return out
}

export function serializeViewQuery(v: CifViewQuery): string {
  const q = new URLSearchParams()
  if (v.op !== VIEW_DEFAULTS.op) q.set('op', String(v.op))
  if (v.view !== VIEW_DEFAULTS.view) q.set('view', inv(VIEW_TOKENS, v.view))
  if (v.show !== VIEW_DEFAULTS.show) q.set('show', inv(SHOW_TOKENS, v.show))
  if (v.color !== VIEW_DEFAULTS.color) q.set('color', v.color)
  const s = q.toString()
  return s ? `?${s}` : ''
}

// ---- uploaded / pasted files kept for refresh ----
export const FILE_STORE_PREFIX = 'cif-file:'
export const FILE_STORE_MAX = 2 * 1024 * 1024

export function storeFile(store: Storage | undefined, name: string, text: string): boolean {
  if (!store || text.length > FILE_STORE_MAX) return false
  try {
    // keep only the latest upload to stay well within quota
    for (let i = store.length - 1; i >= 0; i--) {
      const k = store.key(i)
      if (k?.startsWith(FILE_STORE_PREFIX)) store.removeItem(k)
    }
    store.setItem(FILE_STORE_PREFIX + name, text)
    return true
  } catch {
    return false
  }
}

export function loadStoredFile(store: Storage | undefined, name: string): string | null {
  try {
    return store?.getItem(FILE_STORE_PREFIX + name) ?? null
  } catch {
    return null
  }
}
