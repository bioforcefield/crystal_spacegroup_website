import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseMmcif } from '../../mmcif'
import { buildMacroModel } from '../../macro'
import {
  analyzeStructure, csvCell, foldSymmetric, fullReportCsv, mtp, pseudorotation, ramaClass, sectionCsv, stepParams, type BaseFrame,
} from '..'
import { dihedral, dihedral as dih, lsFit } from '../geom'
import type { Vec3 } from '../../../types'

const fx = (n: string) => readFileSync(resolve(__dirname, '../../__tests__/fixtures', n), 'utf8')
const load = (n: string) => analyzeStructure(buildMacroModel(parseMmcif(fx(n))))
const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length

describe('dihedral math', () => {
  it('known geometries', () => {
    const a: Vec3 = [1, 0, 0], b: Vec3 = [0, 0, 0], c: Vec3 = [0, 0, 1]
    expect(dihedral(a, b, c, [1, 0, 1])).toBeCloseTo(0, 6)
    expect(dihedral(a, b, c, [-1, 0, 1])).toBeCloseTo(180, 6)
    expect(dihedral(a, b, c, [0, 1, 1])).toBeCloseTo(90, 6)
    expect(dihedral(a, b, c, [0, -1, 1])).toBeCloseTo(-90, 6)
    expect(dih(a, b, c, [Math.cos(Math.PI / 3), Math.sin(Math.PI / 3), 2])).toBeCloseTo(60, 6)
  })
  it('helpers', () => {
    expect(foldSymmetric(150)).toBeCloseTo(-30)
    expect(foldSymmetric(-100)).toBeCloseTo(80)
    expect([mtp(62), mtp(-175), mtp(-58), mtp(120)]).toEqual(['p', 't', 'm', null])
    expect(ramaClass('general', -63, -41)).toBe('favored')
    expect(ramaClass('general', -120, 130)).toBe('favored')
    expect(ramaClass('general', 60, -120)).toBe('outlier')
  })
  it('least-squares fit recovers a rigid motion', () => {
    const P: Vec3[] = [[0, 0, 0], [1, 0, 0], [0, 2, 0], [0, 0, 3], [1, 1, 1]]
    const t = 0.7, R = [[Math.cos(t), -Math.sin(t), 0], [Math.sin(t), Math.cos(t), 0], [0, 0, 1]]
    const Q = P.map((p) => [R[0]![0]! * p[0] + R[0]![1]! * p[1] + 5, R[1]![0]! * p[0] + R[1]![1]! * p[1] - 2, p[2] + 1] as Vec3)
    const f = lsFit(P, Q)
    expect(f.rmsd).toBeLessThan(1e-6)
    expect(f.R[1]![0]).toBeCloseTo(Math.sin(t), 6)
    expect(f.t).toEqual([expect.closeTo(5, 6), expect.closeTo(-2, 6), expect.closeTo(1, 6)])
  })
  it('pseudorotation: ideal C2′-endo / C3′-endo', () => {
    const ideal = (P: number, tm = 38) => [0, 1, 2, 3, 4].map((j) => tm * Math.cos(((P + 144 * (j - 2)) * Math.PI) / 180))
    const s = pseudorotation(ideal(162))
    expect(s.P).toBeCloseTo(162, 3); expect(s.tm).toBeCloseTo(38, 3); expect(s.name).toBe("C2'-endo")
    expect(pseudorotation(ideal(18)).name).toBe("C3'-endo")
  })
  it('step parameters of an ideal 36° / 3.38 Å step', () => {
    const f1: BaseFrame = { origin: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1], rmsd: 0 }
    const c = Math.cos(Math.PI / 5), s = Math.sin(Math.PI / 5)
    const f2: BaseFrame = { origin: [0, 0, 3.38], x: [c, s, 0], y: [-s, c, 0], z: [0, 0, 1], rmsd: 0 }
    const { p } = stepParams(f1, f2)
    expect(p.f).toBeCloseTo(36, 6); expect(p.c).toBeCloseTo(3.38, 6)
    expect(Math.abs(p.a) + Math.abs(p.b) + Math.abs(p.d) + Math.abs(p.e)).toBeLessThan(1e-6)
  })
})

describe('1CRN protein backbone / side chains', () => {
  const A = load('1crn.cif')
  const row = (n: number) => A.protein.find((r) => r.res.num === n)!
  it('46 residues, termini without φ / ψ', () => {
    expect(A.protein).toHaveLength(46)
    expect(row(1).phi).toBeNull()
    expect(row(46).psi).toBeNull()
  })
  it('helix 7–19 is αR; strand 1–4 is β (cf. PDBe/wwPDB validation ranges)', () => {
    for (let n = 7; n <= 18; n++) {
      expect(row(n).phi!).toBeGreaterThan(-90); expect(row(n).phi!).toBeLessThan(-45)
      expect(row(n).psi!).toBeGreaterThan(-60); expect(row(n).psi!).toBeLessThan(-5)
    }
    for (const n of [2, 3, 4]) { expect(row(n).phi!).toBeLessThan(-100); expect(row(n).psi!).toBeGreaterThan(120) }
  })
  it('reference values from coordinates (Thr2, Ile7, Arg10)', () => {
    expect(row(2).phi!).toBeCloseTo(-108, 0); expect(row(2).psi!).toBeCloseTo(144, 0)
    expect(row(7).phi!).toBeCloseTo(-64, 0); expect(row(10).psi!).toBeCloseTo(-43, 0)
  })
  it('all trans peptides, ≥ 90% favored, ≤ 2 outliers', () => {
    expect(A.protein.filter((r) => r.cis)).toHaveLength(0)
    const pp = A.protein.filter((r) => r.rama)
    expect(pp.filter((r) => r.rama === 'favored').length / pp.length).toBeGreaterThan(0.9)
    expect(pp.filter((r) => r.rama === 'outlier').length).toBeLessThanOrEqual(2)
  })
  it('χ definitions and rotamers', () => {
    expect(row(7).rotamer).toBe('mt') // Ile
    expect(row(10).chi.filter((c) => c != null)).toHaveLength(4) // Arg χ1–χ4
    const phe = row(13)
    expect(Math.abs(phe.chi[1]!)).toBeLessThanOrEqual(90) // folded symmetric ring
    expect(row(9).chi[0]).toBeNull() // Ala
  })
})

describe('1BNA B-DNA (Dickerson dodecamer)', () => {
  const A = load('1bna.cif')
  it('sugars mostly South / C2′-endo family', () => {
    const s = A.nucleic.filter((r) => r.P != null)
    expect(s).toHaveLength(24)
    expect(s.filter((r) => r.P! >= 108 && r.P! < 216).length / s.length).toBeGreaterThan(0.75)
    expect(s.filter((r) => r.pucker === "C2'-endo").length).toBeGreaterThanOrEqual(8)
  })
  it('finds 12 Watson–Crick pairs and 11 steps', () => {
    expect(A.pairs).toHaveLength(12)
    expect(A.steps).toHaveLength(11)
  })
  it('pair / step parameters close to published 3DNA values (Lu & Olson 2003)', () => {
    expect(mean(A.steps.map((s) => s.twist))).toBeGreaterThan(34); expect(mean(A.steps.map((s) => s.twist))).toBeLessThan(38)
    expect(mean(A.steps.map((s) => s.rise))).toBeGreaterThan(3.2); expect(mean(A.steps.map((s) => s.rise))).toBeLessThan(3.5)
    expect(Math.abs(mean(A.steps.map((s) => s.slide)))).toBeLessThan(0.5)
    expect(mean(A.pairs.map((p) => p.propeller))).toBeLessThan(-8)
    expect(Math.abs(mean(A.pairs.map((p) => p.shear)))).toBeLessThan(0.4)
    expect(Math.abs(mean(A.pairs.map((p) => p.stretch)))).toBeLessThan(0.5)
    // A5–T20 step (AA/TT) ≈ 3DNA twist 35.5°, rise 3.3 Å
    const aa = A.steps.find((s) => s.label.startsWith('AA/TT'))!
    expect(aa.twist).toBeCloseTo(35.4, 0); expect(aa.rise).toBeCloseTo(3.32, 1)
    expect(A.form).toMatch(/^B-like/)
  })
})

describe('CSV', () => {
  it('quotes and formats cells', () => {
    expect(csvCell(null)).toBe(''); expect(csvCell(1.234)).toBe('1.23'); expect(csvCell('a,b')).toBe('"a,b"'); expect(csvCell("C2'-endo")).toBe("C2'-endo")
  })
  it('section + full report with header comments', () => {
    const A = load('1crn.cif')
    const s = sectionCsv('backbone', A, { pdbId: '1crn', filter: 'all chains', date: '2026-10-31' })
    const lines = s.trim().split('\n')
    expect(lines[0]).toMatch(/^# .*Protein backbone/)
    expect(lines).toContain('# PDB: 1CRN'); expect(lines).toContain('# Date: 2026-10-31'); expect(lines).toContain('# Selection: all chains')
    const hdr = lines.find((l) => !l.startsWith('#'))!
    expect(hdr).toBe('chain,resnum,resname,phi,psi,omega,cis,rama_category,rama_class')
    const data = lines.filter((l) => !l.startsWith('#')).slice(1)
    expect(data).toHaveLength(46)
    expect(data.every((l) => l.split(',').length === 9)).toBe(true)
    const full = fullReportCsv(A, { pdbId: '1crn', filter: 'all', date: '2026-10-31' })
    expect(full).toMatch(/Side-chain chi/); expect(full).not.toMatch(/Base-pair/)
  })
})

describe('performance', () => {
  it('analyses a 4.7k-atom entry quickly', () => {
    const A = load('1hsg.cif')
    expect(A.protein.length).toBeGreaterThan(190)
    expect(A.ms).toBeLessThan(500)
  })
})
