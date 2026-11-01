import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { detectFormat, maeToMmcif, pastedName, pdbToMmcif, readMae, readStructureFile, seqresNumbering, toMmcifIfNeeded } from '../formats'
import { parseMmcif } from '../mmcif'
import { buildMacroModel, expandMacro } from '../macro'
import { chainSequences } from '../sequence'
import { alignMultiple, alignPair, blosum62, conservation } from '../align'
import { applySuperposition, kabsch } from '../kabsch'
import type { Vec3 } from '../../types'

const fx = (n: string) => readFileSync(resolve(__dirname, 'fixtures', n), 'utf8')
const PDB = fx('1crn.pdb')
const MAE = fx('1crn_lig.mae')
const CIF = fx('1crn.cif')

describe('format detection', () => {
  it('detects mmCIF, PDB, MAE and small-molecule CIF', () => {
    expect(detectFormat(CIF)).toBe('mmcif')
    expect(detectFormat(PDB)).toBe('pdb')
    expect(detectFormat(MAE)).toBe('mae')
    expect(detectFormat('data_x\n_cell_length_a 5\n')).toBe('cif')
    expect(toMmcifIfNeeded('data_x\n_cell_length_a 5\n').text).toBe('data_x\n_cell_length_a 5\n')
  })
  it('names pasted text by format', () => {
    expect(pastedName(PDB, 'pasted.cif')).toBe('pasted.pdb')
    expect(pastedName(MAE, 'pasted.cif')).toBe('pasted.mae')
    expect(pastedName(CIF, 'pasted.cif')).toBe('pasted.cif')
  })
})

describe('legacy PDB → mmCIF', () => {
  const pm = parseMmcif(pdbToMmcif(PDB).mmcif)
  const ref = parseMmcif(CIF)
  it('reads CRYST1 cell + space group and stays crystalline', () => {
    expect(pm.crystal).toBe(true)
    expect(pm.parsed.cell.a).toBeCloseTo(40.96, 2)
    expect(pm.parsed.cell.betaDeg).toBeCloseTo(90.77, 2)
    expect(pm.parsed.spaceGroupNumber).toBe(4)
    expect(pm.pdbId).toBe('1CRN')
    expect(pm.method).toBe('X-RAY DIFFRACTION')
    expect(pm.resolutionA).toBeCloseTo(1.5)
  })
  it('matches the mmCIF atoms and fractional coordinates', () => {
    expect(pm.parsed.atoms.length).toBe(ref.parsed.atoms.length)
    for (const k of [0, 50, 200, 326]) {
      for (let i = 0; i < 3; i++) expect(pm.parsed.atoms[k]!.fractional[i]).toBeCloseTo(ref.parsed.atoms[k]!.fractional[i]!, 3)
      expect(pm.parsed.atoms[k]!.element).toBe(ref.parsed.atoms[k]!.element)
      expect(pm.extras[k]!.atomName).toBe(ref.extras[k]!.atomName)
    }
  })
  it('reads HELIX/SHEET and SEQRES', () => {
    expect(pm.ss.filter((s) => s.kind === 'helix').length).toBe(2)
    expect(pm.ss.some((s) => s.kind === 'strand')).toBe(true)
    expect(pm.seqres.get('A')!.length).toBe(46)
    expect(pm.seqres.get('A')![0]).toEqual({ comp: 'THR', num: '1' })
  })
  it('keeps model 1 and first altloc only', () => {
    const txt = [
      'CRYST1   10.000   10.000   10.000  90.00  90.00  90.00 P 1           1',
      'MODEL        1',
      'ATOM      1  CA AALA A   1       1.000   1.000   1.000  0.50 10.00           C',
      'ATOM      2  CA BALA A   1       1.200   1.000   1.000  0.50 10.00           C',
      'ATOM      3  CA  GLY A   2       4.000   1.000   1.000  1.00 10.00           C',
      'ENDMDL',
      'MODEL        2',
      'ATOM      1  CA  ALA A   1       9.000   1.000   1.000  1.00 10.00           C',
      'ENDMDL',
    ].join('\n')
    const p = parseMmcif(pdbToMmcif(txt).mmcif)
    expect(p.parsed.atoms.length).toBe(2)
    expect(p.parsed.atoms[0]!.fractional[0]).toBeCloseTo(0.1, 4)
  })
  it('flows into the macro pipeline (cartoon + sequence)', () => {
    const m = buildMacroModel(pm)
    expect(expandMacro(m, 'cartoon', false).atoms.length).toBeGreaterThan(0)
    const seq = chainSequences(m)
    expect(seq[0]!.residues.map((r) => r.code).join('')).toBe('TTCCPSIVARSNFNVCRLPGTPEAICATYTGCIIIPGATCPGDYAN')
    expect(seq[0]!.residues.filter((r) => r.ss === 'H').length).toBeGreaterThan(5)
  })
  it('numbers SEQRES across unobserved residues', () => {
    expect(seqresNumbering(['MET', 'ALA', 'GLY', 'SER'], [{ comp: 'ALA', num: '2' }, { comp: 'SER', num: '4' }])).toEqual([null, '2', null, '4'])
  })
})

describe('Maestro .mae → mmCIF', () => {
  it('tokenises blocks and tables', () => {
    const b = readMae(MAE)
    const ct = b.find((x) => x.name === 'f_m_ct')!
    expect(ct.props.get('s_m_title')).toBe('crambin test (Maestro)')
    expect(ct.children.find((c) => c.name.startsWith('m_atom'))!.nRows).toBe(330)
  })
  it('parses atoms, residues, bonds; no lattice', () => {
    const r = maeToMmcif(MAE)
    expect(r.info.bonds).toBeGreaterThan(300)
    const pm = parseMmcif(r.mmcif)
    expect(pm.crystal).toBe(false)
    expect(pm.nonCrystalReason).toMatch(/no crystal lattice/)
    expect(pm.parsed.atoms.length).toBe(330)
    expect(pm.extras[0]).toMatchObject({ comp: 'THR', chain: 'A', seq: '1', atomName: 'N' })
    const m = buildMacroModel(pm)
    expect(m.ligands.map((l) => l.comp)).toContain('EOH')
    expect(chainSequences(m)[0]!.residues.length).toBe(46)
  })
  it('gunzips .maegz uploads', async () => {
    const f = new File([gzipSync(Buffer.from(MAE))], '1crn_lig.maegz')
    const r = await readStructureFile(f)
    expect(r.name).toBe('1crn_lig.mae')
    expect(detectFormat(r.text)).toBe('mae')
  })
})

describe('mmCIF seqres + sequences', () => {
  it('reads _pdbx_poly_seq_scheme', () => {
    const m = buildMacroModel(parseMmcif(CIF))
    expect(m.seqres!.get('A')!.length).toBe(46)
    const s = chainSequences(m)
    expect(s).toHaveLength(1)
    expect(s[0]!.residues.every((r) => r.observed && r.key && r.center)).toBe(true)
  })
})

describe('alignment', () => {
  it('BLOSUM62 basics', () => {
    expect(blosum62('W', 'W')).toBe(11)
    expect(blosum62('A', 'R')).toBe(-1)
  })
  it('aligns identical and gapped protein sequences', () => {
    const a = alignPair('HEAGAWGHEE', 'HEAGAWGHEE', { kind: 'protein' })
    expect(a.identity).toBe(1)
    const b = alignPair('MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHF', 'MVLSPADKTNVKAAWGKVGEYGAEALERMFLSFPTTKTYFPHF', { kind: 'protein' })
    expect(b.a.replace(/-/g, '')).toBe('MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHF')
    expect((b.b.match(/-/g) ?? []).length).toBe(4)
    expect(b.identity).toBe(1)
  })
  it('hemoglobin α vs β ≈ 43% identity', () => {
    const alpha = 'VLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHGKKVADALTNAVAHVDDMPNALSALSDLHAHKLRVDPVNFKLLSHCLLVTLAAHLPAEFTPAVHASLDKFLASVSTVLTSKYR'
    const beta = 'VHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPKVKAHGKKVLGAFSDGLAHLDNLKGTFATLSELHCDKLHVDPENFRLLGNVLVCVLAHHFGKEFTPPVQAAYQKVVAGVANALAHKYH'
    const r = alignPair(alpha, beta, { kind: 'protein' })
    expect(r.identity).toBeGreaterThan(0.38)
    expect(r.identity).toBeLessThan(0.5)
  })
  it('nucleic acids treat T≡U', () => {
    expect(alignPair('CGCGAATTCGCG', 'CGCGAAUUCGCG', { kind: 'nucleic' }).identity).toBe(1)
  })
  it('progressive MSA keeps every sequence and equal lengths', () => {
    const seqs = ['MKTAYIAKQR', 'MKTAYAKQR', 'MKTAYIAKQRW', 'KTAYIAKQ']
    const { rows } = alignMultiple(seqs, { kind: 'protein' })
    expect(new Set(rows.map((r) => r.length)).size).toBe(1)
    rows.forEach((r, i) => expect(r.replace(/-/g, '')).toBe(seqs[i]))
    const cons = conservation(rows)
    expect(cons.filter((c) => c === 1).length).toBeGreaterThan(4)
  })
})

describe('Kabsch', () => {
  it('recovers a known rotation + translation with zero RMSD', () => {
    const P: Vec3[] = [[0, 0, 0], [1.5, 0, 0], [1.5, 1.2, 0.3], [0.2, 2.1, 1.7], [-1, 0.5, 2]]
    const th = 0.7, c = Math.cos(th), s = Math.sin(th)
    const Q: Vec3[] = P.map(([x, y, z]) => [c * x - s * z + 3, y - 2, s * x + c * z + 1])
    const sp = kabsch(P, Q)
    expect(sp.rmsd).toBeLessThan(1e-6)
    const t = applySuperposition(sp, [2, 2, 2])
    expect(t[0]).toBeCloseTo(c * 2 - s * 2 + 3, 6)
    expect(t[2]).toBeCloseTo(s * 2 + c * 2 + 1, 6)
  })
  it('gives a positive RMSD for noisy points and never reflects', () => {
    const P: Vec3[] = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]]
    const Q: Vec3[] = [[0, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1]] // mirror image
    const sp = kabsch(P, Q)
    const R = sp.rot
    const det = R[0]![0]! * (R[1]![1]! * R[2]![2]! - R[1]![2]! * R[2]![1]!) - R[0]![1]! * (R[1]![0]! * R[2]![2]! - R[1]![2]! * R[2]![0]!) + R[0]![2]! * (R[1]![0]! * R[2]![1]! - R[1]![1]! * R[2]![0]!)
    expect(det).toBeCloseTo(1, 6)
    expect(sp.rmsd).toBeGreaterThan(0.1)
  })
})

describe('chain comparison + superposition', () => {
  it('self-comparison of 1CRN (PDB vs mmCIF) is 100% identical with ~0 RMSD', async () => {
    const { alignChains, superposeRow } = await import('../compare')
    const a = chainSequences(buildMacroModel(parseMmcif(CIF)))[0]!
    const b = chainSequences(buildMacroModel(parseMmcif(pdbToMmcif(PDB).mmcif)))[0]!
    const al = alignChains([a, b])
    expect(al.identity[1]).toBe(1)
    const ov = superposeRow(al, 1)!
    expect(ov.n).toBe(46)
    expect(ov.rmsd).toBeLessThan(0.01)
    expect(ov.segments.length).toBeGreaterThan(0)
  })
})
