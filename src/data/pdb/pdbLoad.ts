/** PDB loading helpers: ID/URL parsing, RCSB search, progress fetch with abort, error mapping, recents. */
export const PDB_ID_LOOSE = /^[0-9][a-z0-9]{3}$/i

export type PdbSource = 'rcsb' | 'redo'
export interface PdbInputOk { ok: true; id: string; assembly?: number }
export interface PdbInputErr { ok: false; error: string }

/** Accepts 1CRN, pdb_00001crn, RCSB / PDBe / PDBj / PDB-REDO URLs (incl. -assemblyN files). */
export function parsePdbInput(raw: string): PdbInputOk | PdbInputErr {
  const s = raw.trim()
  if (!s) return { ok: false, error: 'Enter a 4-character PDB ID (e.g. 1CRN) or paste an RCSB link.' }
  if (PDB_ID_LOOSE.test(s)) return { ok: true, id: s.toLowerCase() }
  const ext = /^pdb_0000([0-9][a-z0-9]{3})$/i.exec(s)
  if (ext) return { ok: true, id: ext[1]!.toLowerCase() }
  if (/^(https?:\/\/|www\.|[a-z0-9.-]+\.(org|eu|jp|ac\.uk)\/)/i.test(s)) {
    let path = s
    try { path = new URL(/^https?:/i.test(s) ? s : `https://${s}`).pathname } catch { /* keep raw */ }
    const asm = /([0-9][a-z0-9]{3})-assembly(\d+)/i.exec(path)
    if (asm) return { ok: true, id: asm[1]!.toLowerCase(), assembly: parseInt(asm[2]!, 10) }
    const m = /(?:^|[/_.=])(?:pdb_0000)?([0-9][a-z0-9]{3})(?=$|[/._?#-])/i.exec(path.replace(/\/(structure|entry|pdb|db|download|3d-view|sequence|annotations|ligands)\b/gi, '/'))
    if (m) return { ok: true, id: m[1]!.toLowerCase() }
    return { ok: false, error: 'No PDB ID found in that link.' }
  }
  if (s.length === 4) return { ok: false, error: `“${s}” is not a PDB ID — IDs start with a digit, e.g. 1CRN.` }
  return { ok: false, error: `“${s}” is not a PDB ID — use 4 characters (e.g. 1CRN), or search by name below.` }
}

export function mmcifUrl(id: string, opts: { assembly?: number | null; source?: PdbSource } = {}): string {
  const l = id.toLowerCase(), U = id.toUpperCase()
  if (opts.source === 'redo' && !opts.assembly) return `https://pdb-redo.eu/db/${l}/${l}_final.cif`
  if (opts.assembly) return `https://files.rcsb.org/download/${U}-assembly${opts.assembly}.cif`
  return `https://files.rcsb.org/download/${U}.cif`
}
export const rcsbThumb = (id: string) => `https://cdn.rcsb.org/images/structures/${id.toLowerCase().slice(1, 3)}/${id.toLowerCase()}/${id.toLowerCase()}_assembly-1.jpeg`

// ---------- search ----------
export type SearchKind = 'text' | 'uniprot' | 'ligand'
export const SEARCH_URL = 'https://search.rcsb.org/rcsbsearch/v2/query'
export const GRAPHQL_URL = 'https://data.rcsb.org/graphql'

/** Guess the kind of a free-text search term. */
export function guessSearchKind(q: string): SearchKind {
  const t = q.trim()
  if (/^([OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2})$/.test(t)) return 'uniprot'
  if (/^[A-Z0-9]{1,3}$/.test(t) && /[A-Z]/.test(t)) return 'ligand'
  return 'text'
}

export function buildSearchQuery(q: string, kind: SearchKind = guessSearchKind(q), rows = 12, start = 0) {
  const value = q.trim()
  const node =
    kind === 'uniprot'
      ? { type: 'terminal', service: 'text', parameters: { attribute: 'rcsb_polymer_entity_container_identifiers.reference_sequence_identifiers.database_accession', operator: 'exact_match', value: value.toUpperCase() } }
      : kind === 'ligand'
        ? { type: 'terminal', service: 'text', parameters: { attribute: 'rcsb_nonpolymer_entity_container_identifiers.nonpolymer_comp_id', operator: 'exact_match', value: value.toUpperCase() } }
        : { type: 'terminal', service: 'full_text', parameters: { value } }
  return { query: node, return_type: 'entry', request_options: { paginate: { start, rows }, results_content_type: ['experimental'] } }
}

export interface SearchHit {
  id: string; title: string | null; method: string | null; resolution: number | null
  organism: string | null; atoms: number | null; assemblies: number | null; thumb: string
}
export const summaryQuery = (ids: string[]) =>
  `{entries(entry_ids:${JSON.stringify(ids)}){rcsb_id struct{title} exptl{method} rcsb_entry_info{resolution_combined deposited_atom_count assembly_count} polymer_entities{rcsb_entity_source_organism{scientific_name}}}}`

interface GqlEntry {
  rcsb_id: string; struct?: { title?: string } | null; exptl?: { method?: string }[] | null
  rcsb_entry_info?: { resolution_combined?: number[] | null; deposited_atom_count?: number | null; assembly_count?: number | null } | null
  polymer_entities?: { rcsb_entity_source_organism?: { scientific_name?: string }[] | null }[] | null
}
export function hitFromGql(e: GqlEntry): SearchHit {
  const orgs = new Set<string>()
  for (const p of e.polymer_entities ?? []) for (const o of p.rcsb_entity_source_organism ?? []) if (o.scientific_name) orgs.add(o.scientific_name)
  return {
    id: e.rcsb_id.toLowerCase(), title: e.struct?.title ?? null, method: e.exptl?.map((x) => x.method).filter(Boolean).join('; ') || null,
    resolution: e.rcsb_entry_info?.resolution_combined?.[0] ?? null, organism: [...orgs].slice(0, 2).join(', ') || null,
    atoms: e.rcsb_entry_info?.deposited_atom_count ?? null, assemblies: e.rcsb_entry_info?.assembly_count ?? null, thumb: rcsbThumb(e.rcsb_id),
  }
}

export async function searchRcsb(q: string, opts: { kind?: SearchKind; rows?: number; start?: number; signal?: AbortSignal; fetchImpl?: typeof fetch } = {}): Promise<{ total: number; hits: SearchHit[] }> {
  const f = opts.fetchImpl ?? fetch
  const res = await f(SEARCH_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(buildSearchQuery(q, opts.kind, opts.rows, opts.start)), signal: opts.signal })
  if (res.status === 204) return { total: 0, hits: [] }
  if (!res.ok) throw new Error(`RCSB search failed (HTTP ${res.status}).`)
  const j = (await res.json()) as { total_count: number; result_set: { identifier: string }[] }
  const ids = j.result_set.map((r) => r.identifier)
  if (!ids.length) return { total: 0, hits: [] }
  const s = await f(GRAPHQL_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: summaryQuery(ids) }), signal: opts.signal })
  const g = s.ok ? ((await s.json()) as { data?: { entries?: GqlEntry[] } }) : {}
  const byId = new Map((g.data?.entries ?? []).map((e) => [e.rcsb_id.toUpperCase(), e]))
  return { total: j.total_count, hits: ids.map((id) => hitFromGql(byId.get(id.toUpperCase()) ?? { rcsb_id: id })) }
}

export async function entrySummary(id: string, fetchImpl: typeof fetch = fetch): Promise<SearchHit | null> {
  try {
    const s = await fetchImpl(GRAPHQL_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: summaryQuery([id.toUpperCase()]) }) })
    const g = (await s.json()) as { data?: { entries?: GqlEntry[] } }
    const e = g.data?.entries?.[0]
    return e ? hitFromGql(e) : null
  } catch { return null }
}

// ---------- fetch with progress / errors ----------
export class PdbLoadError extends Error {
  readonly kind: 'invalid' | 'obsolete' | 'notfound' | 'network' | 'http' | 'aborted' | 'redo'
  readonly replacedBy: string[]
  constructor(message: string, kind: PdbLoadError['kind'], replacedBy: string[] = []) { super(message); this.kind = kind; this.replacedBy = replacedBy }
}

/** Map an HTTP failure (+ optional removed-entry record) to a user-facing error. */
export function mapPdbError(id: string, status: number, removed?: { id_codes_replaced_by?: string[] | null; remove_date?: string | null } | null, assembly?: number | null): PdbLoadError {
  const U = id.toUpperCase()
  if (status === 404 || status === 403 || status === 410) {
    if (removed) {
      const rep = (removed.id_codes_replaced_by ?? []).map((x) => x.toLowerCase())
      const when = removed.remove_date ? ` on ${removed.remove_date.slice(0, 10)}` : ''
      return new PdbLoadError(rep.length ? `PDB ${U} is obsolete (removed${when}) and was superseded by ${rep.map((r) => r.toUpperCase()).join(', ')}.` : `PDB ${U} is obsolete (removed${when}); no replacement entry.`, 'obsolete', rep)
    }
    if (assembly) return new PdbLoadError(`PDB ${U} has no biological assembly ${assembly}.`, 'notfound')
    return new PdbLoadError(`PDB ${U} was not found at RCSB (unreleased, withdrawn, or mistyped).`, 'notfound')
  }
  return new PdbLoadError(`RCSB returned HTTP ${status} for PDB ${U}. Try again in a moment.`, 'http')
}

export interface Progress { loaded: number; total: number | null }
export async function fetchTextWithProgress(url: string, opts: { signal?: AbortSignal; onProgress?: (p: Progress) => void; fetchImpl?: typeof fetch } = {}): Promise<Response & { textBody?: string }> {
  const res = await (opts.fetchImpl ?? fetch)(url, { signal: opts.signal })
  if (!res.ok || !res.body || !opts.onProgress) return res
  const total = Number(res.headers.get('content-length')) || null
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value); loaded += value.length
    opts.onProgress({ loaded, total })
  }
  const buf = new Uint8Array(loaded); let o = 0
  for (const c of chunks) { buf.set(c, o); o += c.length }
  const text = new TextDecoder().decode(buf)
  return Object.assign(new Response(text, { status: res.status, headers: res.headers }), { textBody: text })
}

/** Fetch an mmCIF (ASU, assembly N, or PDB-REDO with RCSB fallback). */
export async function loadPdbMmcif(id: string, opts: { assembly?: number | null; source?: PdbSource; signal?: AbortSignal; onProgress?: (p: Progress) => void; fetchImpl?: typeof fetch } = {}): Promise<{ text: string; url: string; note?: string; replacedBy?: string[] }> {
  if (!PDB_ID_LOOSE.test(id)) throw new PdbLoadError(`“${id}” is not a PDB ID (4 characters, e.g. 1CRN).`, 'invalid')
  const f = opts.fetchImpl ?? fetch
  const get = async (url: string) => {
    try { return await fetchTextWithProgress(url, { ...opts, fetchImpl: f }) } catch (e) {
      if ((e as Error)?.name === 'AbortError') throw new PdbLoadError('Download cancelled.', 'aborted')
      throw new PdbLoadError(`Couldn't reach ${new URL(url).host} — check your connection and retry.`, 'network')
    }
  }
  let note: string | undefined
  if (opts.source === 'redo' && !opts.assembly) {
    const url = mmcifUrl(id, { source: 'redo' })
    try {
      const r = await get(url)
      if (r.ok) return { text: r.textBody ?? (await r.text()), url, note: 'PDB-REDO re-refined model (pdb-redo.eu).' }
      note = `PDB-REDO has no entry for ${id.toUpperCase()} (HTTP ${r.status}); loaded the RCSB deposited model instead.`
    } catch (e) {
      if (e instanceof PdbLoadError && e.kind === 'aborted') throw e
      note = `PDB-REDO unreachable; loaded the RCSB deposited model instead.`
    }
  }
  const url = mmcifUrl(id, { assembly: opts.assembly })
  const r = await get(url)
  if (!r.ok) {
    let removed = null
    if (r.status === 404 || r.status === 403) {
      try {
        const h = await f(`https://data.rcsb.org/rest/v1/holdings/removed/${id.toUpperCase()}`, { signal: opts.signal })
        if (h.ok) removed = ((await h.json()) as { rcsb_repository_holdings_removed?: { id_codes_replaced_by?: string[]; remove_date?: string } }).rcsb_repository_holdings_removed ?? null
      } catch { /* ignore */ }
    }
    throw mapPdbError(id, r.status, removed, opts.assembly)
  }
  const text = r.textBody ?? (await r.text())
  if (!/_atom_site\./.test(text)) throw new PdbLoadError(`PDB ${id.toUpperCase()} has no coordinates at RCSB (unreleased, withdrawn, or mistyped ID).`, 'notfound')
  const obs = obsoleteInfo(text, id)
  if (obs) {
    const msg = `PDB ${id.toUpperCase()} is obsolete${obs.date ? ` (since ${obs.date})` : ''}${obs.replacedBy.length ? `; superseded by ${obs.replacedBy.map((x) => x.toUpperCase()).join(', ')}` : ''}.`
    return { text, url, note: note ? `${note} ${msg}` : msg, replacedBy: obs.replacedBy }
  }
  return { text, url, note }
}

/** Obsolete-entry record in an mmCIF (_pdbx_database_PDB_obs_spr with OBSLTE replacing this ID). */
export function obsoleteInfo(text: string, id: string): { replacedBy: string[]; date: string | null } | null {
  const get = (k: string) => new RegExp(`^_pdbx_database_PDB_obs_spr\\.${k}\\s+(.+)$`, 'm').exec(text)?.[1]?.trim().replace(/^'(.*)'$/, '$1') ?? null
  if (get('id') !== 'OBSLTE' || (get('replace_pdb_id') ?? '').toUpperCase() !== id.toUpperCase()) return null
  const rep = (get('pdb_id') ?? '').split(/\s+/).filter((x) => PDB_ID_LOOSE.test(x)).map((x) => x.toLowerCase())
  return { replacedBy: rep, date: get('date') }
}

/** Warnings shown before/after loading based on the entry summary. */
export function entryWarnings(h: Pick<SearchHit, 'method' | 'atoms'> | null): string[] {
  const out: string[] = []
  if (!h) return out
  if (h.method && /ELECTRON MICROSCOPY|NMR/i.test(h.method)) out.push(`${/NMR/i.test(h.method) ? 'NMR' : 'Cryo-EM'} entry: no crystal lattice — only the model is shown.`)
  if (h.atoms != null && h.atoms > 100_000) out.push(`Large entry (${h.atoms.toLocaleString()} atoms): loading and rendering may be slow; Full atoms may be disabled.`)
  return out
}

export const fmtBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} kB` : `${(n / 1048576).toFixed(1)} MB`)

// ---------- recents ----------
export const RECENT_KEY = 'lattice-lab:recent-pdb'
export function readRecent(store: Storage | undefined): string[] {
  try { const v = JSON.parse(store?.getItem(RECENT_KEY) ?? '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string' && PDB_ID_LOOSE.test(x)).slice(0, 8) : [] } catch { return [] }
}
export function pushRecent(store: Storage | undefined, id: string): string[] {
  const next = [id.toLowerCase(), ...readRecent(store).filter((x) => x !== id.toLowerCase())].slice(0, 8)
  try { store?.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* quota */ }
  return next
}
