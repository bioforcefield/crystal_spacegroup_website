/** Global sequence alignment (Needleman–Wunsch / Gotoh affine gaps), BLOSUM62 for proteins. */
const AA = 'ARNDCQEGHILKMFPSTWYVBZX*'
const B62 = `4 -1 -2 -2 0 -1 -1 0 -2 -1 -1 -1 -1 -2 -1 1 0 -3 -2 0 -2 -1 0 -4
-1 5 0 -2 -3 1 0 -2 0 -3 -2 2 -1 -3 -2 -1 -1 -3 -2 -3 -1 0 -1 -4
-2 0 6 1 -3 0 0 0 1 -3 -3 0 -2 -3 -2 1 0 -4 -2 -3 3 0 -1 -4
-2 -2 1 6 -3 0 2 -1 -1 -3 -4 -1 -3 -3 -1 0 -1 -4 -3 -3 4 1 -1 -4
0 -3 -3 -3 9 -3 -4 -3 -3 -1 -1 -3 -1 -2 -3 -1 -1 -2 -2 -1 -3 -3 -2 -4
-1 1 0 0 -3 5 2 -2 0 -3 -2 1 0 -3 -1 0 -1 -2 -1 -2 0 3 -1 -4
-1 0 0 2 -4 2 5 -2 0 -3 -3 1 -2 -3 -1 0 -1 -3 -2 -2 1 4 -1 -4
0 -2 0 -1 -3 -2 -2 6 -2 -4 -4 -2 -3 -3 -2 0 -2 -2 -3 -3 -1 -2 -1 -4
-2 0 1 -1 -3 0 0 -2 8 -3 -3 -1 -2 -1 -2 -1 -2 -2 2 -3 0 0 -1 -4
-1 -3 -3 -3 -1 -3 -3 -4 -3 4 2 -3 1 0 -3 -2 -1 -3 -1 3 -3 -3 -1 -4
-1 -2 -3 -4 -1 -2 -3 -4 -3 2 4 -2 2 0 -3 -2 -1 -2 -1 1 -4 -3 -1 -4
-1 2 0 -1 -3 1 1 -2 -1 -3 -2 5 -1 -3 -1 0 -1 -3 -2 -2 0 1 -1 -4
-1 -1 -2 -3 -1 0 -2 -3 -2 1 2 -1 5 0 -2 -1 -1 -1 -1 1 -3 -1 -1 -4
-2 -3 -3 -3 -2 -3 -3 -3 -1 0 0 -3 0 6 -4 -2 -2 1 3 -1 -3 -3 -1 -4
-1 -2 -2 -1 -3 -1 -1 -2 -2 -3 -3 -1 -2 -4 7 -1 -1 -4 -3 -2 -2 -1 -2 -4
1 -1 1 0 -1 0 0 0 -1 -2 -2 0 -1 -2 -1 4 1 -3 -2 -2 0 0 0 -4
0 -1 0 -1 -1 -1 -1 -2 -2 -1 -1 -1 -1 -2 -1 1 5 -2 -2 0 -1 -1 0 -4
-3 -3 -4 -4 -2 -2 -3 -2 -2 -3 -2 -3 -1 1 -4 -3 -2 11 2 -3 -4 -3 -2 -4
-2 -2 -2 -3 -2 -1 -2 -3 2 -1 -1 -2 -1 3 -3 -2 -2 2 7 -1 -3 -2 -1 -4
0 -3 -3 -3 -1 -2 -2 -3 -3 3 1 -2 1 -1 -2 -2 0 -3 -1 4 -3 -2 -1 -4
-2 -1 3 4 -3 0 1 -1 0 -3 -4 0 -3 -3 -2 0 -1 -4 -3 -3 4 1 -1 -4
-1 0 0 1 -3 3 4 -2 0 -3 -3 1 -1 -3 -1 0 -1 -3 -2 -2 1 4 -1 -4
0 -1 -1 -1 -2 -1 -1 -1 -1 -1 -1 -1 -1 -1 -2 0 0 -2 -1 -1 -1 -1 -1 -4
-4 -4 -4 -4 -4 -4 -4 -4 -4 -4 -4 -4 -4 -4 -4 -4 -4 -4 -4 -4 -4 -4 -4 1`.split('\n').map((r) => r.trim().split(/\s+/).map(Number))

export function blosum62(a: string, b: string): number {
  let i = AA.indexOf(a), j = AA.indexOf(b)
  if (i < 0) i = 22
  if (j < 0) j = 22
  return B62[i]![j]!
}
/** Nucleic acids: +5 match / −4 mismatch (EDNAFULL-like); T≡U. */
export function naScore(a: string, b: string): number {
  const n = (c: string) => (c === 'U' ? 'T' : c)
  return n(a) === n(b) && a !== 'X' ? 5 : -4
}

export interface AlignOpts { kind: 'protein' | 'nucleic'; gapOpen?: number; gapExtend?: number }
export interface PairAlignment { a: string; b: string; score: number; identity: number; identical: number; aligned: number }

/** Gotoh global alignment; returns gapped strings ('-' = gap). End gaps are not penalised. */
export function alignPair(s: string, t: string, o: AlignOpts): PairAlignment {
  const sc = o.kind === 'protein' ? blosum62 : naScore
  const go = o.gapOpen ?? (o.kind === 'protein' ? 10 : 10), ge = o.gapExtend ?? (o.kind === 'protein' ? 1 : 0.5)
  const n = s.length, m = t.length
  const NEG = -1e9
  const M = new Float64Array((n + 1) * (m + 1)).fill(NEG), X = new Float64Array((n + 1) * (m + 1)).fill(NEG), Y = new Float64Array((n + 1) * (m + 1)).fill(NEG)
  const id = (i: number, j: number) => i * (m + 1) + j
  M[id(0, 0)] = 0
  for (let i = 1; i <= n; i++) X[id(i, 0)] = 0 // free end gaps
  for (let j = 1; j <= m; j++) Y[id(0, j)] = 0
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const endI = j === m, endJ = i === n
      const k = id(i, j), d = id(i - 1, j - 1), u = id(i - 1, j), l = id(i, j - 1)
      M[k] = Math.max(M[d]!, X[d]!, Y[d]!) + sc(s[i - 1]!, t[j - 1]!)
      X[k] = endI ? Math.max(M[u]!, X[u]!, Y[u]!) : Math.max(M[u]! - go, X[u]! - ge, Y[u]! - go)
      Y[k] = endJ ? Math.max(M[l]!, Y[l]!, X[l]!) : Math.max(M[l]! - go, Y[l]! - ge, X[l]! - go)
    }
  }
  // traceback
  let i = n, j = m
  const end = id(n, m)
  let state = M[end]! >= X[end]! && M[end]! >= Y[end]! ? 0 : X[end]! >= Y[end]! ? 1 : 2
  const score = Math.max(M[end]!, X[end]!, Y[end]!)
  const A: string[] = [], B: string[] = []
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-6
  while (i > 0 || j > 0) {
    if (i === 0) { A.push('-'); B.push(t[--j]!); continue }
    if (j === 0) { A.push(s[--i]!); B.push('-'); continue }
    const k = id(i, j)
    if (state === 0) {
      const d = id(i - 1, j - 1), v = M[k]! - sc(s[i - 1]!, t[j - 1]!)
      A.push(s[i - 1]!); B.push(t[j - 1]!)
      state = near(v, M[d]!) ? 0 : near(v, X[d]!) ? 1 : 2
      i--; j--
    } else if (state === 1) {
      const u = id(i - 1, j), endI = j === m
      A.push(s[i - 1]!); B.push('-')
      const v = X[k]!
      if (endI) state = near(v, M[u]!) ? 0 : near(v, X[u]!) ? 1 : 2
      else state = near(v, X[u]! - ge) ? 1 : near(v, M[u]! - go) ? 0 : 2
      i--
    } else {
      const l = id(i, j - 1), endJ = i === n
      A.push('-'); B.push(t[j - 1]!)
      const v = Y[k]!
      if (endJ) state = near(v, M[l]!) ? 0 : near(v, Y[l]!) ? 2 : 1
      else state = near(v, Y[l]! - ge) ? 2 : near(v, M[l]! - go) ? 0 : 1
      j--
    }
  }
  const a = A.reverse().join(''), b = B.reverse().join('')
  const st = identityOf(a, b)
  return { a, b, score, ...st }
}

export function identityOf(a: string, b: string): { identity: number; identical: number; aligned: number } {
  let identical = 0, aligned = 0
  for (let k = 0; k < a.length; k++) {
    if (a[k] === '-' || b[k] === '-') continue
    aligned++
    if (a[k] === b[k] || ((a[k] === 'T' || a[k] === 'U') && (b[k] === 'T' || b[k] === 'U'))) identical++
  }
  const shorter = Math.min(a.replace(/-/g, '').length, b.replace(/-/g, '').length) || 1
  return { identity: identical / shorter, identical, aligned }
}

/**
 * Progressive (centre-star) multiple alignment: the sequence with the highest
 * summed pairwise score is the centre; every other sequence is aligned to it and
 * gaps are merged ("once a gap, always a gap").
 */
export function alignMultiple(seqs: string[], o: AlignOpts): { rows: string[]; center: number } {
  if (seqs.length === 0) return { rows: [], center: 0 }
  if (seqs.length === 1) return { rows: [seqs[0]!], center: 0 }
  const n = seqs.length
  const S: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
  const pa = new Map<string, PairAlignment>()
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const r = alignPair(seqs[i]!, seqs[j]!, o)
    pa.set(`${i},${j}`, r)
    S[i]![j] = S[j]![i] = r.score
  }
  let c = 0, best = -Infinity
  for (let i = 0; i < n; i++) { const t = S[i]!.reduce((x, y) => x + y, 0); if (t > best) { best = t; c = i } }
  // msa columns indexed by centre: rows[k] aligned to centre string with gaps.
  let center = seqs[c]!
  const rows: string[] = new Array(n).fill('')
  rows[c] = center
  const done: number[] = [c]
  for (let k = 0; k < n; k++) {
    if (k === c) continue
    const r = k > c ? pa.get(`${c},${k}`)! : pa.get(`${k},${c}`)!
    const cA = k > c ? r.a : r.b, kA = k > c ? r.b : r.a
    // merge: walk current centre (with gaps) and new pairwise centre (with gaps)
    let p = 0, q = 0
    const newCenter: string[] = [], newK: string[] = []
    const others = done.map(() => [] as string[])
    while (p < center.length || q < cA.length) {
      const ch1 = center[p], ch2 = cA[q]
      if (ch1 != null && ch2 != null && ch1 !== '-' && ch2 !== '-') {
        newCenter.push(ch1); newK.push(kA[q]!); done.forEach((d, z) => others[z]!.push(rows[d]![p]!)); p++; q++
      } else if (ch1 === '-' || (ch2 == null)) {
        newCenter.push('-'); newK.push('-'); done.forEach((d, z) => others[z]!.push(rows[d]![p]!)); p++
      } else {
        newCenter.push('-'); newK.push(kA[q]!); done.forEach((_, z) => others[z]!.push('-')); q++
      }
    }
    done.forEach((d, z) => { rows[d] = others[z]!.join('') })
    center = rows[c]!
    rows[k] = newK.join('')
    done.push(k)
  }
  return { rows, center: c }
}

/** Per-column conservation: fraction of non-gap rows matching the column's most common residue. */
export function conservation(rows: string[]): number[] {
  const L = rows[0]?.length ?? 0
  const out: number[] = []
  for (let k = 0; k < L; k++) {
    const cnt = new Map<string, number>()
    for (const r of rows) { const ch = r[k]!; if (ch !== '-') cnt.set(ch, (cnt.get(ch) ?? 0) + 1) }
    const top = Math.max(0, ...cnt.values())
    out.push(rows.length ? top / rows.length : 0)
  }
  return out
}
