import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { looksLikeMmcif, parseMmcif, pdbSpaceGroup } from '../mmcif'
import { buildMacroModel, expandMacro } from '../macro'
import { analyzeLigand } from '../interactions'
import { cartoonSegment, emptyMesh, splitRuns } from '../cartoon'
import { dsspLite } from '../secondary'
import { fetchPdbCif, PDB_TEACHING_CHIPS, PdbNotFoundError } from '../fetchPdb'
import { placeCifStructure } from '../../cif/placement'
import { distToElement } from '../../nearestImages'
import { getDemo } from '../../registry'
import type { Vec3 } from '../../types'

const fx = (n: string) => readFileSync(resolve(__dirname, 'fixtures', n), 'utf8')
const CRN = fx('1crn.cif')
const HSG = fx('1hsg.cif')

describe('mmCIF parser', () => {
  const pm = parseMmcif(CRN)
  it('detects mmCIF and reads the cell', () => {
    expect(looksLikeMmcif(CRN)).toBe(true)
    expect(pm.crystal).toBe(true)
    const c = pm.parsed.cell
    expect(c.a).toBeCloseTo(40.96, 2)
    expect(c.b).toBeCloseTo(18.65, 2)
    expect(c.c).toBeCloseTo(22.52, 2)
    expect(c.betaDeg).toBeCloseTo(90.77, 2)
  })
  it('maps H-M symbols to ITA numbers', () => {
    expect(pm.parsed.spaceGroupNumber).toBe(4)
    expect(pdbSpaceGroup('P 1 21 1').number).toBe(4)
    expect(pdbSpaceGroup('P 43 21 2').number).toBe(96)
    expect(pdbSpaceGroup('H 3').number).toBe(146)
    expect(pdbSpaceGroup('P 32 2 1').number).toBe(154)
    expect(pdbSpaceGroup('P 21 21 21').number).toBe(19)
    expect(pdbSpaceGroup('C 1 2 1').number).toBe(5)
  })
  it('reads all atoms with fractional coordinates in the cell frame', () => {
    expect(pm.parsed.atoms.length).toBe(327)
    const n1 = pm.parsed.atoms[0]!
    expect(n1.element).toBe('N')
    // x/a ≈ 17.047/40.96 for a near-orthogonal cell
    expect(n1.fractional[0]).toBeCloseTo(17.047 / 40.96, 1)
    expect(pm.extras[1]!.ca).toBe(true)
    expect(pm.extras[0]!.chain).toBe('A')
  })
  it('keeps model 1 and the first altloc only', () => {
    const rows = CRN.split('\n')
    const i = rows.findIndex((l) => l.startsWith('ATOM 1 '))
    const alt = (l: string, a: string, dx: string) => l.replace(' . THR', ` ${a} THR`).replace('17.047', dx)
    const extra = [
      alt(rows[i]!, 'A', '17.047').replace('ATOM 1 ', 'ATOM 1001 '),
      alt(rows[i]!, 'B', '19.999').replace('ATOM 1 ', 'ATOM 1002 '),
      rows[i]!.replace('ATOM 1 ', 'ATOM 1003 ').replace(/ 1 $/, ' 2 '),
    ]
    const last = rows.findIndex((l) => l.startsWith('ATOM 327 '))
    const text = [...rows.slice(0, i), extra[0]!, extra[1]!, ...rows.slice(i + 1, last + 1), extra[2]!, ...rows.slice(last + 1)].join('\n')
    const p2 = parseMmcif(text)
    const n = p2.parsed.atoms.filter((_, k) => p2.extras[k]!.seq === '1' && p2.extras[k]!.atomName === 'N')
    expect(n.length).toBe(1)
    expect(n[0]!.fractional[0]).toBeCloseTo(17.047 / 40.96, 1)
    expect(p2.parsed.warnings.some((w) => /model 1/.test(w))).toBe(true)
  })
  it('flags non-crystal (NMR) entries', () => {
    const nmr = CRN.replace("'X-RAY DIFFRACTION'", "'SOLUTION NMR'").replace('X-RAY DIFFRACTION', 'SOLUTION NMR')
      .replace(/_cell\.length_a\s+[\d.]+/, '_cell.length_a 1.000').replace(/_cell\.length_b\s+[\d.]+/, '_cell.length_b 1.000').replace(/_cell\.length_c\s+[\d.]+/, '_cell.length_c 1.000')
    const p = parseMmcif(nmr)
    expect(p.crystal).toBe(false)
    expect(p.nonCrystalReason).toMatch(/no crystal lattice/)
    const m = buildMacroModel(p)
    expect(m.operators.length).toBe(1)
  })
})

describe('macro model + representations', () => {
  const m = buildMacroModel(parseMmcif(CRN))
  it('expands one whole copy per operator', () => {
    expect(m.operators.length).toBe(2)
    const full = expandMacro(m, 'full')
    expect(full.atoms.length).toBe(327 * 2)
    expect(full.macro?.rep).toBe('full')
    const cart = expandMacro(m, 'cartoon')
    expect(cart.atoms.length).toBeLessThan(full.atoms.length)
    expect(new Set(cart.atoms.map((a) => a.moleculeId)).size).toBe(2)
  })
  it('assigns helices and strands for crambin', () => {
    const ss = m.ss.filter((_, i) => m.extras[i]!.ca)
    expect(ss.length).toBe(46)
    expect(ss.filter((s) => s === 'H').length).toBeGreaterThan(10)
    expect(ss.filter((s) => s === 'E').length).toBeGreaterThan(2)
  })
  it('DSSP-lite finds an ideal α-helix', () => {
    const ca: Vec3[] = Array.from({ length: 12 }, (_, i) => [2.3 * Math.cos((i * 100 * Math.PI) / 180), 2.3 * Math.sin((i * 100 * Math.PI) / 180), 1.5 * i])
    const ss = dsspLite(ca, ca.map(() => false))
    expect(ss.slice(2, 10).every((s) => s === 'H')).toBe(true)
  })
  it('builds a finite cartoon mesh', () => {
    const res = m.extras.map((e, i) => ({ e, i })).filter(({ e }) => e.ca).map(({ i }) => ({ ca: m.cart[i]!, ss: m.ss[i]!, color: [1, 1, 1] as [number, number, number], ai: i }))
    const mesh = emptyMesh()
    for (const run of splitRuns(res)) cartoonSegment(mesh, run)
    expect(mesh.indices.length).toBeGreaterThan(1000)
    expect(mesh.positions.every(Number.isFinite)).toBe(true)
    expect(mesh.normals.every(Number.isFinite)).toBe(true)
    expect(Math.max(...mesh.indices)).toBeLessThan(mesh.positions.length / 3)
  })
})

describe('Nearest straddle on crambin (P2₁)', () => {
  const s = expandMacro(buildMacroModel(parseMmcif(CRN)), 'cartoon')
  const demo = getDemo(4)!
  const centroid = (fr: Vec3[], idx: number[]): Vec3 => {
    const c: Vec3 = [0, 0, 0]
    for (const i of idx) for (let k = 0; k < 3; k++) c[k] += fr[i]![k]! / idx.length
    return c
  }
  for (const op of s.operators.filter((o) => o.index !== 1)) {
    it(`op ${op.index} (${op.triplet}): AU + mate midpoint lies on the 2₁ axis`, () => {
      const { fractionals } = placeCifStructure(s, 'nearest', op.index, demo)
      const au = s.atoms.map((a, i) => (a.opIndex === 1 ? i : -1)).filter((i) => i >= 0)
      const mate = s.atoms.map((a, i) => (a.opIndex === op.index ? i : -1)).filter((i) => i >= 0)
      const a = centroid(fractionals, au), b = centroid(fractionals, mate)
      const mid: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
      const dOp = demo.operators.find((o) => o.index === op.index)!
      expect(distToElement(demo, mid, dOp)).toBeLessThan(0.05)
    })
  }
})

describe('ligand interactions — HIV protease + indinavir (1HSG)', () => {
  const m = buildMacroModel(parseMmcif(HSG))
  it('lists MK1 as a ligand and excludes water', () => {
    expect(m.spaceGroupNumber).toBe(18)
    const ids = m.ligands.map((l) => l.id)
    expect(ids).toContain('MK1_B_902')
    expect(m.ligands.some((l) => l.comp === 'HOH')).toBe(false)
  })
  it('finds the catalytic Asp25/Asp25′ H-bonds and a symmetry-mate residue', () => {
    const site = analyzeLigand(m, m.ligands.find((l) => l.id === 'MK1_B_902')!)
    const hb = site.interactions.filter((i) => i.type === 'hbond')
    expect(hb.some((i) => /^ASP 25 A/.test(i.resLabel))).toBe(true)
    expect(hb.some((i) => /^ASP 25 B/.test(i.resLabel))).toBe(true)
    for (const i of hb) {
      expect(i.dist).toBeGreaterThanOrEqual(2.5)
      expect(i.dist).toBeLessThanOrEqual(4.1)
      expect(!!i.weak).toBe(i.dist > 3.5)
    }
    expect(site.pocket.some((p) => p.symCode !== '')).toBe(true)
    expect(site.pocket.every((p) => p.minDist <= 4.5 + 1e-6)).toBe(true)
    expect(site.interactions.some((i) => i.type === 'hydrophobic')).toBe(true)
  })
})

describe('RCSB fetch', () => {
  it('rejects malformed ids and maps 404', async () => {
    await expect(fetchPdbCif('abc')).rejects.toThrow(/not a PDB ID/)
    const f404 = (async () => new Response('', { status: 404 })) as unknown as typeof fetch
    await expect(fetchPdbCif('9zzz', f404)).rejects.toBeInstanceOf(PdbNotFoundError)
    const ok = (async (u: string) => new Response(String(u))) as unknown as typeof fetch
    expect(await fetchPdbCif('1crn', ok)).toBe('https://files.rcsb.org/download/1CRN.cif')
  })
  it('teaching chips are valid ids', () => {
    for (const c of PDB_TEACHING_CHIPS) expect(c.id).toMatch(/^[0-9][a-z0-9]{3}$/)
  })
})
