import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import { cellCornersCart, fracToCart } from '../data/math'
import { supercellTranslations, type CellMultiples } from '../data/supercell'
import type { CellParams, Vec3 } from '../data/types'

const CELL_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7],
]

/** Faint copies of the unit-cell outline for each translated cell + bright supercell outline. */
export default function SupercellWire({
  cell,
  multiples,
}: {
  cell: CellParams
  multiples: CellMultiples
}) {
  const { inner, outer } = useMemo(() => {
    const corners = cellCornersCart(cell)
    const sc = (f: Vec3) => fracToCart(f, cell)
    const inner: Vec3[] = []
    for (const t of supercellTranslations(multiples)) {
      if (!t[0] && !t[1] && !t[2]) continue
      const d = sc(t)
      for (const [i, j] of CELL_EDGES) {
        const a = corners[i], b = corners[j]
        inner.push([a[0] + d[0], a[1] + d[1], a[2] + d[2]], [b[0] + d[0], b[1] + d[1], b[2] + d[2]])
      }
    }
    const [na, nb, nc] = multiples
    const cc = (
      [
        [0, 0, 0], [na, 0, 0], [na, nb, 0], [0, nb, 0],
        [0, 0, nc], [na, 0, nc], [na, nb, nc], [0, nb, nc],
      ] as Vec3[]
    ).map(sc)
    const outer: Vec3[] = []
    for (const [i, j] of CELL_EDGES) outer.push(cc[i], cc[j])
    return { inner, outer }
  }, [cell, multiples])
  return (
    <group>
      {inner.length > 0 && (
        <Line points={inner} segments color="#7dd3fc" lineWidth={1} transparent opacity={0.3} />
      )}
      <Line points={outer} segments color="#fbbf24" lineWidth={1.8} transparent opacity={0.8} />
    </group>
  )
}
