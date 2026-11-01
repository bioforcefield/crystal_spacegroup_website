/**
 * LigPlot / PoseView-style 2D ligand–interaction diagram.
 * Ligand: PCA projection of the 3D pose + bond-length relaxation (bond orders from the
 * RCSB Chemical Component Dictionary when available, matched by atom name).
 * Residues: placed in the direction of their 3D contact projected into the same frame,
 * then relaxed so no two residue boxes overlap. Output is a standalone SVG string with
 * data-res / data-int hooks for hover/click.
 */
import type { Vec3 } from '../types'
import { findRings, INTERACTION_TYPES, type Interaction, type InteractionType, type LigandSite } from './interactions'
import { METALS, isAmino, isNucleic } from './macro'

export interface CcdBond { order: 1 | 2 | 3; aromatic: boolean }
export type CcdBonds = Map<string, CcdBond>
const bkey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

/** Tokenize a CIF line respecting '…' / "…" quotes. */
function cifTokens(line: string): string[] {
  const out: string[] = []
  const re = /'((?:[^']|'(?=\S))*)'(?=\s|$)|"((?:[^"]|"(?=\S))*)"(?=\s|$)|(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) out.push(m[1] ?? m[2] ?? m[3]!)
  return out
}

/** Parse the _chem_comp_bond loop of a CCD mmCIF file. */
export function parseCcdBonds(text: string): CcdBonds {
  const lines = text.split(/\r?\n/)
  const out: CcdBonds = new Map()
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.trim() !== 'loop_' || !lines[i + 1]?.trim().startsWith('_chem_comp_bond.')) continue
    const cols: string[] = []
    let j = i + 1
    while (lines[j]?.trim().startsWith('_chem_comp_bond.')) cols.push(lines[j++]!.trim().slice(16))
    const a1 = cols.indexOf('atom_id_1'), a2 = cols.indexOf('atom_id_2')
    const vo = cols.indexOf('value_order'), ar = cols.indexOf('pdbx_aromatic_flag')
    let buf: string[] = []
    for (; j < lines.length; j++) {
      const t = lines[j]!.trim()
      if (!t || t.startsWith('#') || t.startsWith('_') || t === 'loop_') break
      buf = buf.concat(cifTokens(t))
      if (buf.length >= cols.length) {
        const o = (buf[vo] ?? 'SING').toUpperCase()
        const order = o.startsWith('DOUB') ? 2 : o.startsWith('TRIP') ? 3 : 1
        out.set(bkey(buf[a1]!, buf[a2]!), { order, aromatic: o.startsWith('AROM') || (buf[ar] ?? 'N').toUpperCase() === 'Y' })
        buf = []
      }
    }
    break
  }
  return out
}

const ccdCache = new Map<string, Promise<CcdBonds | null>>()
export function fetchCcdBonds(comp: string, f: typeof fetch = fetch): Promise<CcdBonds | null> {
  const id = comp.toUpperCase()
  if (!/^[A-Z0-9]{1,5}$/.test(id)) return Promise.resolve(null)
  let p = ccdCache.get(id)
  if (!p) {
    p = f(`https://files.rcsb.org/ligands/download/${id}.cif`)
      .then((r) => (r.ok ? r.text() : null))
      .then((t) => (t ? parseCcdBonds(t) : null))
      .catch(() => null)
    ccdCache.set(id, p)
  }
  return p
}

// ---------------- layout ----------------
export interface LAtom { x: number; y: number; element: string; name: string }
export interface LBond { i: number; j: number; order: 1 | 2 | 3; aromatic: boolean }
export interface RNode {
  key: string; x: number; y: number; w: number; h: number
  label: string; sub: string; kind: 'hydrophobic' | 'polar' | 'acidic' | 'basic' | 'nucleic' | 'other'
  symCode: string
}
export interface DEdge { k: number; type: InteractionType; resKey: string; x1: number; y1: number; dist: number; label: string }
export interface Diagram {
  atoms: LAtom[]; bonds: LBond[]; rings: { x: number; y: number; r: number }[]
  residues: RNode[]; edges: DEdge[]
  box: { x: number; y: number; w: number; h: number }
  title: string
}

const PX = 22 // px per Å for the ligand
const BOND = 1.45 * PX
const KIND: Record<string, RNode['kind']> = {}
for (const r of ['ALA', 'VAL', 'LEU', 'ILE', 'MET', 'PHE', 'TRP', 'PRO', 'GLY']) KIND[r] = 'hydrophobic'
for (const r of ['SER', 'THR', 'ASN', 'GLN', 'TYR', 'CYS']) KIND[r] = 'polar'
for (const r of ['ASP', 'GLU']) KIND[r] = 'acidic'
for (const r of ['LYS', 'ARG', 'HIS']) KIND[r] = 'basic'
export const KIND_COLORS: Record<RNode['kind'], { fill: string; stroke: string }> = {
  hydrophobic: { fill: '#dcfce7', stroke: '#16a34a' },
  polar: { fill: '#ccfbf1', stroke: '#0d9488' },
  acidic: { fill: '#fee2e2', stroke: '#dc2626' },
  basic: { fill: '#dbeafe', stroke: '#2563eb' },
  nucleic: { fill: '#ffedd5', stroke: '#ea580c' },
  other: { fill: '#f1f5f9', stroke: '#64748b' },
}
const ELEM: Record<string, string> = { N: '#2563eb', O: '#dc2626', S: '#ca8a04', P: '#ea580c', F: '#16a34a', CL: '#16a34a', BR: '#a16207', I: '#7c3aed' }
const elemColor = (e: string) => ELEM[e.toUpperCase()] ?? (METALS.has(e) ? '#7c3aed' : '#334155')
const sub3 = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot3 = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/** Top-2 principal axes (power iteration with deflation). */
function pcaFrame(ps: Vec3[], c: Vec3): [Vec3, Vec3] {
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
  for (const p of ps) { const d = sub3(p, c); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i]![j]! += d[i]! * d[j]! }
  const mul = (v: Vec3): Vec3 => [dot3(C[0] as Vec3, v), dot3(C[1] as Vec3, v), dot3(C[2] as Vec3, v)]
  const nz = (v: Vec3): Vec3 => { const l = Math.hypot(...v); return l < 1e-9 ? [1, 0, 0] : [v[0] / l, v[1] / l, v[2] / l] }
  let u: Vec3 = nz([1, 0.31, 0.17])
  for (let k = 0; k < 60; k++) u = nz(mul(u))
  let v: Vec3 = nz([-u[1], u[0], 0.23])
  for (let k = 0; k < 60; k++) { v = mul(v); const d = dot3(v, u); v = nz([v[0] - d * u[0], v[1] - d * u[1], v[2] - d * u[2]]) }
  if (Math.abs(dot3(u, v)) > 0.99) v = nz([-u[1], u[0], 0])
  return [u, v]
}

export function residueKind(comp: string): RNode['kind'] {
  if (KIND[comp]) return KIND[comp]
  if (isNucleic(comp)) return 'nucleic'
  if (isAmino(comp)) return 'polar'
  return 'other'
}

const overlap = (a: RNode, b: RNode, pad = 4) =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 + pad && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + pad

export function layoutDiagram(site: LigandSite, ccd: CcdBonds | null, types?: Set<InteractionType>): Diagram {
  const n = site.atoms.length
  const pts = site.atoms.map((a) => a.cart)
  const c = site.centroid
  const [U, V] = n > 2 ? pcaFrame(pts, c) : [[1, 0, 0] as Vec3, [0, 1, 0] as Vec3]
  const proj = (p: Vec3) => { const d = sub3(p, c); return [dot3(d, U) * PX, -dot3(d, V) * PX] as [number, number] }
  const atoms: LAtom[] = site.atoms.map((a) => { const [x, y] = proj(a.cart); return { x, y, element: a.element, name: a.name } })

  // bonds (+ CCD orders; add CCD bonds the distance search missed if atoms are close)
  const idxByName = new Map(site.atoms.map((a, i) => [a.name, i]))
  const seen = new Set<string>()
  const bonds: LBond[] = site.bonds.map(([i, j]) => {
    seen.add(bkey(site.atoms[i]!.name, site.atoms[j]!.name))
    const o = ccd?.get(bkey(site.atoms[i]!.name, site.atoms[j]!.name))
    return { i, j, order: o?.order ?? 1, aromatic: o?.aromatic ?? false }
  })
  ccd?.forEach((o, k) => {
    if (seen.has(k)) return
    const [a, b] = k.split('|'); const i = idxByName.get(a!), j = idxByName.get(b!)
    if (i == null || j == null) return
    const d = Math.hypot(...sub3(pts[i]!, pts[j]!))
    if (d < 3.0) bonds.push({ i, j, order: o.order, aromatic: o.aromatic })
  })

  // relax ligand: bonded pairs → BOND length, non-bonded pairs ≥ 0.9·BOND (keeps PCA shape otherwise)
  if (n > 1) {
    const bonded = new Set(bonds.map((b) => `${Math.min(b.i, b.j)},${Math.max(b.i, b.j)}`))
    for (let it = 0; it < 300; it++) {
      for (const b of bonds) {
        const A = atoms[b.i]!, B = atoms[b.j]!
        const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 0.01
        const f = ((d - BOND) / d) * 0.25
        A.x += dx * f; A.y += dy * f; B.x -= dx * f; B.y -= dy * f
      }
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        if (bonded.has(`${i},${j}`)) continue
        const A = atoms[i]!, B = atoms[j]!
        let dx = B.x - A.x, dy = B.y - A.y
        let d = Math.hypot(dx, dy)
        const min = 0.95 * BOND
        if (d >= min) continue
        if (d < 0.01) { dx = Math.cos(i + j); dy = Math.sin(i + j); d = 1 }
        const f = ((min - d) / d) * 0.25
        A.x -= dx * f; A.y -= dy * f; B.x += dx * f; B.y += dy * f
      }
    }
  }
  const ringIdx = findRings(n, bonds.map((b) => [b.i, b.j] as [number, number]))
  const rings = ringIdx
    .filter((r) => r.every((a, k) => bonds.find((b) => (b.i === a && b.j === r[(k + 1) % r.length]) || (b.j === a && b.i === r[(k + 1) % r.length]))?.aromatic))
    .map((r) => {
      const x = r.reduce((s, k) => s + atoms[k]!.x, 0) / r.length, y = r.reduce((s, k) => s + atoms[k]!.y, 0) / r.length
      return { x, y, r: Math.min(...r.map((k) => Math.hypot(atoms[k]!.x - x, atoms[k]!.y - y))) * 0.62 }
    })

  // interactions (respect toggles) → residue nodes
  const shown = site.interactions.map((it, k) => ({ it, k })).filter(({ it }) => !types || types.has(it.type))
  const lig2 = (it: Interaction) => {
    const ix = it.ligIdx?.length ? it.ligIdx : [0]
    return [ix.reduce((s, k) => s + atoms[k]!.x, 0) / ix.length, ix.reduce((s, k) => s + atoms[k]!.y, 0) / ix.length] as [number, number]
  }
  const lcx = atoms.reduce((s, a) => s + a.x, 0) / Math.max(1, n), lcy = atoms.reduce((s, a) => s + a.y, 0) / Math.max(1, n)
  const ligR = Math.max(10, ...atoms.map((a) => Math.hypot(a.x - lcx, a.y - lcy)))
  const resByKey = new Map(site.pocket.map((p) => [p.key, p]))
  const want = new Map<string, { sx: number; sy: number; m: number }>()
  for (const { it } of shown) {
    const key = it.resKey ?? it.resLabel
    const [lx, ly] = lig2(it)
    const d3 = sub3(it.b, it.a)
    let dx = dot3(d3, U), dy = -dot3(d3, V)
    let l = Math.hypot(dx, dy)
    if (l < 0.3 * Math.hypot(...d3) || l < 1e-6) { dx = lx - lcx; dy = ly - lcy; l = Math.hypot(dx, dy) }
    if (l < 1e-6) { dx = 1; dy = 0; l = 1 }
    const L = it.type === 'hydrophobic' ? 95 : 80
    const tx = lx + (dx / l) * L, ty = ly + (dy / l) * L
    const w = want.get(key) ?? { sx: 0, sy: 0, m: 0 }
    w.sx += tx; w.sy += ty; w.m++
    want.set(key, w)
  }
  const residues: RNode[] = []
  want.forEach((w, key) => {
    const p = resByKey.get(key)
    const label = p ? `${p.comp} ${p.seq}` : key
    const sub = p ? `${p.chain}${p.symCode ? ` · ${p.symCode}` : ''}` : ''
    const wd = Math.max(label.length, sub.length * 0.8) * 7 + 16
    residues.push({ key, x: w.sx / w.m, y: w.sy / w.m, w: wd, h: sub ? 32 : 22, label, sub, kind: p ? residueKind(p.comp) : 'other', symCode: p?.symCode ?? '' })
  })
  const targets = residues.map((r) => [r.x, r.y] as const)
  // keep residues outside the ligand footprint + springs to targets + mutual repulsion
  for (let it = 0; it < 400; it++) {
    residues.forEach((r, i) => {
      r.x += (targets[i]![0] - r.x) * 0.05; r.y += (targets[i]![1] - r.y) * 0.05
      for (const a of atoms) {
        const dx = r.x - a.x, dy = r.y - a.y
        const need = Math.hypot(r.w / 2, r.h / 2) + 14
        const d = Math.hypot(dx, dy) || 0.01
        if (d < need) { r.x += (dx / d) * (need - d) * 0.5; r.y += (dy / d) * (need - d) * 0.5 }
      }
    })
    for (let i = 0; i < residues.length; i++) for (let j = i + 1; j < residues.length; j++) {
      const A = residues[i]!, B = residues[j]!
      if (!overlap(A, B, 8)) continue
      let dx = B.x - A.x, dy = B.y - A.y
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) { dx = Math.cos(i * 2.4 + j); dy = Math.sin(i * 2.4 + j) }
      const ox = (A.w + B.w) / 2 + 8 - Math.abs(dx), oy = (A.h + B.h) / 2 + 8 - Math.abs(dy)
      // push along the axis of least overlap
      if (ox < oy) { const s = Math.sign(dx) || 1; A.x -= (s * ox) / 2; B.x += (s * ox) / 2 }
      else { const s = Math.sign(dy) || 1; A.y -= (s * oy) / 2; B.y += (s * oy) / 2 }
    }
  }
  // final hard pass without springs: guarantee no box overlap
  for (let it = 0; it < 2000; it++) {
    let moved = false
    for (let i = 0; i < residues.length; i++) for (let j = i + 1; j < residues.length; j++) {
      const A = residues[i]!, B = residues[j]!
      if (!overlap(A, B, 4)) continue
      moved = true
      let dx = B.x - A.x, dy = B.y - A.y
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) { dx = 1; dy = 0.5 }
      const ox = (A.w + B.w) / 2 + 5 - Math.abs(dx), oy = (A.h + B.h) / 2 + 5 - Math.abs(dy)
      if (ox < oy) { const s = Math.sign(dx) || 1; A.x -= (s * ox) / 2; B.x += (s * ox) / 2 }
      else { const s = Math.sign(dy) || 1; A.y -= (s * oy) / 2; B.y += (s * oy) / 2 }
    }
    // keep boxes off ligand atoms: step radially outward from the ligand centre
    for (const r of residues) {
      if (!atoms.some((a) => Math.abs(r.x - a.x) < r.w / 2 + 9 && Math.abs(r.y - a.y) < r.h / 2 + 9)) continue
      moved = true
      let dx = r.x - lcx, dy = r.y - lcy
      const l = Math.hypot(dx, dy)
      if (l < 1e-6) { dx = 1; dy = 0 } else { dx /= l; dy /= l }
      r.x += dx * 4; r.y += dy * 4
    }
    if (!moved) break
  }
  void ligR

  const edges: DEdge[] = shown.map(({ it, k }) => {
    const [x1, y1] = lig2(it)
    return { k, type: it.type, resKey: it.resKey ?? it.resLabel, x1, y1, dist: it.dist, label: `${it.ligAtom} – ${it.resLabel} ${it.resAtom} ${it.dist.toFixed(2)} Å` }
  })

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  const ext = (x: number, y: number, w = 0, h = 0) => { x0 = Math.min(x0, x - w); y0 = Math.min(y0, y - h); x1 = Math.max(x1, x + w); y1 = Math.max(y1, y + h) }
  atoms.forEach((a) => ext(a.x, a.y, 14, 14))
  residues.forEach((r) => ext(r.x, r.y, r.w / 2, r.h / 2))
  const pad = 24
  return {
    atoms, bonds, rings, residues, edges,
    box: { x: x0 - pad, y: y0 - pad - 22, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad + 40 },
    title: site.ligand.label,
  }
}

// ---------------- SVG ----------------
const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!)
const f1 = (v: number) => (Math.round(v * 10) / 10).toString()
const TYPE_COLOR = new Map(INTERACTION_TYPES.map((t) => [t.v, t.color]))
/** Darker strokes for print legibility on white (same hue family as the 3D legend). */
const PRINT: Record<InteractionType, string> = { hbond: '#0284c7', salt: '#db2777', metal: '#7c3aed', pi: '#ca8a04', hydrophobic: '#64748b' }

/** Point where the segment from (x,y) toward box centre meets the box border. */
function boxHit(r: RNode, x: number, y: number): [number, number] {
  const dx = x - r.x, dy = y - r.y
  if (!dx && !dy) return [r.x, r.y]
  const s = Math.min(Math.abs(dx) > 1e-9 ? r.w / 2 / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-9 ? r.h / 2 / Math.abs(dy) : Infinity)
  return [r.x + dx * Math.min(1, s), r.y + dy * Math.min(1, s)]
}

export function diagramToSvg(d: Diagram, opts: { highlight?: string | null } = {}): string {
  const o: string[] = []
  const { x, y, w, h } = d.box
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f1(x)} ${f1(y)} ${f1(w)} ${f1(h)}" width="${Math.round(w)}" height="${Math.round(h)}" font-family="Helvetica, Arial, sans-serif" data-testid="lig2d-svg">`)
  o.push(`<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="#ffffff"/>`)
  o.push(`<text x="${f1(x + 10)}" y="${f1(y + 18)}" font-size="13" font-weight="bold" fill="#0f172a">${esc(d.title)}</text>`)
  const rmap = new Map(d.residues.map((r) => [r.key, r]))
  // interactions
  for (const e of d.edges) {
    const r = rmap.get(e.resKey)
    if (!r) continue
    const [x2, y2] = boxHit(r, e.x1, e.y1)
    const col = PRINT[e.type] ?? TYPE_COLOR.get(e.type) ?? '#000'
    const hi = opts.highlight === e.resKey
    o.push(`<g class="lig2d-int" data-int="${e.k}" data-res="${esc(e.resKey)}" data-type="${e.type}"><title>${esc(e.label)}</title>`)
    o.push(`<line x1="${f1(e.x1)}" y1="${f1(e.y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="transparent" stroke-width="10"/>`)
    if (e.type === 'hydrophobic') {
      // LigPlot "eyelash": dotted line + spoked arc at the residue end
      o.push(`<line x1="${f1(e.x1)}" y1="${f1(e.y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${col}" stroke-width="${hi ? 2.5 : 1.2}" stroke-dasharray="2 3"/>`)
      const ang = Math.atan2(e.y1 - y2, e.x1 - x2)
      for (let s = -2; s <= 2; s++) {
        const a = ang + s * 0.35
        o.push(`<line x1="${f1(x2 + Math.cos(a) * 4)}" y1="${f1(y2 + Math.sin(a) * 4)}" x2="${f1(x2 + Math.cos(a) * 10)}" y2="${f1(y2 + Math.sin(a) * 10)}" stroke="#b91c1c" stroke-width="1.2"/>`)
      }
    } else {
      o.push(`<line x1="${f1(e.x1)}" y1="${f1(e.y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${col}" stroke-width="${hi ? 3 : 1.8}" stroke-dasharray="${e.type === 'pi' ? '6 3' : '4 3'}"/>`)
      const mx = (e.x1 + x2) / 2, my = (e.y1 + y2) / 2
      o.push(`<text x="${f1(mx)}" y="${f1(my - 3)}" font-size="9.5" text-anchor="middle" fill="${col}" stroke="#fff" stroke-width="3" paint-order="stroke">${e.dist.toFixed(2)}</text>`)
    }
    if (e.type === 'pi') o.push(`<circle cx="${f1(e.x1)}" cy="${f1(e.y1)}" r="3" fill="${col}"/>`)
    o.push(`</g>`)
  }
  // ligand bonds
  o.push(`<g class="lig2d-ligand">`)
  for (const b of d.bonds) {
    const A = d.atoms[b.i]!, B = d.atoms[b.j]!
    o.push(`<line x1="${f1(A.x)}" y1="${f1(A.y)}" x2="${f1(B.x)}" y2="${f1(B.y)}" stroke="#1e293b" stroke-width="1.8"/>`)
    if (!b.aromatic && b.order > 1) {
      const dx = B.x - A.x, dy = B.y - A.y, l = Math.hypot(dx, dy) || 1
      const nx = (-dy / l) * 3.6, ny = (dx / l) * 3.6
      for (let k = 1; k < b.order; k++) {
        const s = b.order === 3 ? (k === 1 ? 1 : -1) : 1
        o.push(`<line x1="${f1(A.x + nx * s + dx * 0.12)}" y1="${f1(A.y + ny * s + dy * 0.12)}" x2="${f1(B.x + nx * s - dx * 0.12)}" y2="${f1(B.y + ny * s - dy * 0.12)}" stroke="#1e293b" stroke-width="1.4"/>`)
      }
    }
  }
  for (const r of d.rings) o.push(`<circle cx="${f1(r.x)}" cy="${f1(r.y)}" r="${f1(r.r)}" fill="none" stroke="#1e293b" stroke-width="1.2"/>`)
  d.atoms.forEach((a, i) => {
    const single = d.atoms.length === 1
    if (a.element === 'C' && !single) {
      o.push(`<circle cx="${f1(a.x)}" cy="${f1(a.y)}" r="2" fill="#1e293b"><title>${esc(a.name)}</title></circle>`)
      return
    }
    const sym = a.element.length > 1 ? a.element[0] + a.element.slice(1).toLowerCase() : a.element
    const metal = METALS.has(a.element)
    o.push(`<g data-atom="${i}"><title>${esc(a.name)}</title><circle cx="${f1(a.x)}" cy="${f1(a.y)}" r="${metal || single ? 11 : 7.5}" fill="${metal ? '#ede9fe' : '#ffffff'}" stroke="${metal ? '#7c3aed' : 'none'}"/>`)
    o.push(`<text x="${f1(a.x)}" y="${f1(a.y + 4)}" font-size="${metal || single ? 12 : 11}" font-weight="bold" text-anchor="middle" fill="${elemColor(a.element)}">${esc(sym)}</text></g>`)
  })
  o.push(`</g>`)
  // residues
  for (const r of d.residues) {
    const c = KIND_COLORS[r.kind]
    const hi = opts.highlight === r.key
    o.push(`<g class="lig2d-res" data-res="${esc(r.key)}" style="cursor:pointer"><title>${esc(r.label + (r.sub ? ` ${r.sub}` : ''))}</title>`)
    o.push(`<rect x="${f1(r.x - r.w / 2)}" y="${f1(r.y - r.h / 2)}" width="${f1(r.w)}" height="${f1(r.h)}" rx="8" fill="${hi ? '#fef08a' : c.fill}" stroke="${c.stroke}" stroke-width="${hi ? 2.5 : 1.4}"${r.symCode ? ' stroke-dasharray="4 2"' : ''}/>`)
    o.push(`<text x="${f1(r.x)}" y="${f1(r.y + (r.sub ? -2 : 4))}" font-size="11" font-weight="bold" text-anchor="middle" fill="#0f172a">${esc(r.label)}</text>`)
    if (r.sub) o.push(`<text x="${f1(r.x)}" y="${f1(r.y + 11)}" font-size="9" text-anchor="middle" fill="#475569">${esc(r.sub)}</text>`)
    o.push(`</g>`)
  }
  // legend
  const types = [...new Set(d.edges.map((e) => e.type))]
  let lx = x + 10
  const ly = y + h - 10
  for (const t of types) {
    const info = INTERACTION_TYPES.find((q) => q.v === t)!
    o.push(`<line x1="${f1(lx)}" y1="${f1(ly - 4)}" x2="${f1(lx + 18)}" y2="${f1(ly - 4)}" stroke="${PRINT[t]}" stroke-width="2" stroke-dasharray="${t === 'hydrophobic' ? '2 3' : '4 3'}"/>`)
    o.push(`<text x="${f1(lx + 22)}" y="${f1(ly)}" font-size="10" fill="#334155">${esc(info.label)}</text>`)
    lx += 30 + info.label.length * 6
  }
  o.push(`</svg>`)
  return o.join('')
}
