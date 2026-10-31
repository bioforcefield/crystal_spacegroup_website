import { cartToFrac, fracToCart } from '../math'
import type { CellParams, Vec3 } from '../types'
import type { ExpandedStructure } from './types'

export interface MolAtom {
  el: string
  xyz: Vec3
  label?: string
}
export interface MolRecord {
  name: string
  atoms: MolAtom[]
  /** 0-based atom index pairs. */
  bonds: [number, number][]
  props?: Record<string, string>
}

const f = (v: number, w: number, d: number) => v.toFixed(d).padStart(w)
const i3 = (n: number) => String(n).padStart(3)

/** MDL molfile; V2000 when ≤ 999 atoms and bonds, otherwise V3000. */
export function molBlock(rec: MolRecord): string {
  const v3000 = rec.atoms.length > 999 || rec.bonds.length > 999
  const lines = [rec.name.slice(0, 80), '  CrystalSG          3D', '']
  if (!v3000) {
    lines.push(`${i3(rec.atoms.length)}${i3(rec.bonds.length)}  0  0  0  0  0  0  0  0999 V2000`)
    for (const a of rec.atoms) {
      lines.push(
        `${f(a.xyz[0], 10, 4)}${f(a.xyz[1], 10, 4)}${f(a.xyz[2], 10, 4)} ${a.el.padEnd(3)} 0  0  0  0  0  0  0  0  0  0  0  0`,
      )
    }
    for (const [x, y] of rec.bonds) lines.push(`${i3(x + 1)}${i3(y + 1)}  1  0  0  0  0`)
  } else {
    lines.push('  0  0  0     0  0            999 V3000')
    lines.push('M  V30 BEGIN CTAB')
    lines.push(`M  V30 COUNTS ${rec.atoms.length} ${rec.bonds.length} 0 0 0`)
    lines.push('M  V30 BEGIN ATOM')
    rec.atoms.forEach((a, k) =>
      lines.push(`M  V30 ${k + 1} ${a.el} ${a.xyz[0].toFixed(4)} ${a.xyz[1].toFixed(4)} ${a.xyz[2].toFixed(4)} 0`),
    )
    lines.push('M  V30 END ATOM')
    if (rec.bonds.length) {
      lines.push('M  V30 BEGIN BOND')
      rec.bonds.forEach(([x, y], k) => lines.push(`M  V30 ${k + 1} 1 ${x + 1} ${y + 1}`))
      lines.push('M  V30 END BOND')
    }
    lines.push('M  V30 END CTAB')
  }
  lines.push('M  END')
  return lines.join('\n')
}

export function sdf(records: MolRecord[]): string {
  return records
    .map((r) => {
      const props = Object.entries(r.props ?? {})
        .map(([k, v]) => `> <${k}>\n${v}\n`)
        .join('\n')
      return `${molBlock(r)}\n${props}${props ? '\n' : ''}$$$$\n`
    })
    .join('')
}

export type SdfScope = 'asymmetric' | 'cell' | 'view'

export function structureProps(s: ExpandedStructure, extra: Record<string, string> = {}): Record<string, string> {
  const c = s.cell
  return {
    SPACE_GROUP: `${s.spaceGroupName ?? '?'}${s.spaceGroupNumber ? ` (#${s.spaceGroupNumber})` : ''}`,
    CELL: `a=${c.a} b=${c.b} c=${c.c} alpha=${c.alphaDeg ?? 90} beta=${c.betaDeg ?? 90} gamma=${c.gammaDeg ?? 90}`,
    ...extra,
  }
}

/**
 * One SDF record per (molecule, lattice translation). `positions` are the Cartesian
 * coordinates to write for each atom of the unit cell; `include` filters atom indices.
 */
export function moleculeRecords(
  s: ExpandedStructure,
  positions: Vec3[],
  include: (ai: number) => boolean,
  translations: Vec3[] = [[0, 0, 0]],
  baseName = 'structure',
): MolRecord[] {
  const byMol = new Map<number, number[]>()
  s.atoms.forEach((a, ai) => {
    if (!include(ai)) return
    const arr = byMol.get(a.moleculeId) ?? []
    arr.push(ai)
    byMol.set(a.moleculeId, arr)
  })
  const bondsByMol = new Map<number, [number, number][]>()
  for (const b of s.bonds) {
    const ma = s.atoms[b.a]?.moleculeId
    if (ma == null || ma !== s.atoms[b.b]?.moleculeId) continue
    if (!include(b.a) || !include(b.b)) continue
    const arr = bondsByMol.get(ma) ?? []
    arr.push([b.a, b.b])
    bondsByMol.set(ma, arr)
  }
  const out: MolRecord[] = []
  for (const t of translations) {
    const d = fracToCart(t, s.cell)
    for (const [mid, idxs] of [...byMol.entries()].sort((x, y) => x[0] - y[0])) {
      const local = new Map(idxs.map((ai, k) => [ai, k]))
      const op = s.atoms[idxs[0]!]!.opIndex
      const tt = t[0] || t[1] || t[2] ? ` +(${t.join(',')})` : ''
      out.push({
        name: `${baseName} mol ${mid + 1} op ${op}${tt}`,
        atoms: idxs.map((ai) => {
          const p = positions[ai]!
          return { el: s.atoms[ai]!.element, label: s.atoms[ai]!.label, xyz: [p[0] + d[0], p[1] + d[1], p[2] + d[2]] }
        }),
        bonds: (bondsByMol.get(mid) ?? []).map(([a, b]) => [local.get(a)!, local.get(b)!]),
        props: structureProps(s, { MOLECULE: String(mid + 1), OPERATOR: `op ${op}${tt}` }),
      })
    }
  }
  return out
}

/** P1 CIF of the supercell (na×nb×nc) with every drawn atom listed. */
export function p1SupercellCif(
  s: ExpandedStructure,
  positions: Vec3[],
  include: (ai: number) => boolean,
  multiples: [number, number, number],
  translations: Vec3[],
  name = 'structure',
): string {
  const [na, nb, nc] = multiples
  const c = s.cell
  const sc: CellParams = { ...c, a: c.a * na, b: c.b * nb, c: c.c * nc }
  const rows: string[] = []
  let k = 0
  for (const t of translations) {
    const d = fracToCart(t, c)
    s.atoms.forEach((a, ai) => {
      if (!include(ai)) return
      const p = positions[ai]!
      const fr = cartToFrac([p[0] + d[0], p[1] + d[1], p[2] + d[2]], sc)
      k++
      rows.push(
        `${(a.label + '_' + k).padEnd(10)} ${a.element.padEnd(3)} ${fr.map((v) => v.toFixed(5)).join(' ')}${a.occupancy != null ? ' ' + a.occupancy : ' 1'}`,
      )
    })
  }
  const safe = name.replace(/[^A-Za-z0-9_]+/g, '_')
  return [
    `data_${safe}_P1_${na}x${nb}x${nc}`,
    `_audit_creation_method 'crystalspacegroups.com P1 supercell export'`,
    `_symmetry_space_group_name_H-M 'P 1'`,
    `_symmetry_Int_Tables_number 1`,
    `_cell_length_a ${sc.a.toFixed(5)}`,
    `_cell_length_b ${sc.b.toFixed(5)}`,
    `_cell_length_c ${sc.c.toFixed(5)}`,
    `_cell_angle_alpha ${(c.alphaDeg ?? 90).toFixed(4)}`,
    `_cell_angle_beta ${(c.betaDeg ?? 90).toFixed(4)}`,
    `_cell_angle_gamma ${(c.gammaDeg ?? 90).toFixed(4)}`,
    `_cell_formula_units_Z 1`,
    `# source: ${s.spaceGroupName ?? '?'} expanded by symmetry, ${na}x${nb}x${nc} cells`,
    'loop_',
    '_symmetry_equiv_pos_as_xyz',
    "'x, y, z'",
    'loop_',
    '_atom_site_label',
    '_atom_site_type_symbol',
    '_atom_site_fract_x',
    '_atom_site_fract_y',
    '_atom_site_fract_z',
    '_atom_site_occupancy',
    ...rows,
    '',
  ].join('\n')
}

export function downloadText(text: string, filename: string, mime = 'text/plain'): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function baseFileName(dataBlock: string | undefined, fileName: string | undefined): string {
  const fromFile = fileName?.replace(/\.[^.]+$/, '')
  const raw = fromFile || dataBlock || 'structure'
  return raw.replace(/[^A-Za-z0-9_.-]+/g, '_').slice(0, 60) || 'structure'
}
