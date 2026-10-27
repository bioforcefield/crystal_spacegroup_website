import { useMemo, useRef, useEffect, type RefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Line } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { cellCenterCart, cellCornersCart, fracToCart } from '../data/math'
import {
  elementColor,
  elementRadius,
  operatorColor,
} from '../data/cif/operatorColors'
import type { ExpandedStructure } from '../data/cif/types'
import type { CellParams, Vec3 } from '../data/types'

interface Props {
  structure: ExpandedStructure
  selectedOp: number
  /** 'all' | 'selected' | 'asymmetric' */
  visibility: 'all' | 'selected' | 'asymmetric'
  resetToken: number
}

function CellWire({ cell }: { cell: CellParams }) {
  const corners = cellCornersCart(cell)
  const edges: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ]
  return (
    <group>
      {edges.map(([i, j], k) => (
        <Line
          key={k}
          points={[corners[i], corners[j]]}
          color="#7dd3fc"
          lineWidth={1.4}
          transparent
          opacity={0.8}
        />
      ))}
    </group>
  )
}

function AxisHints({ cell }: { cell: CellParams }) {
  const o = fracToCart([0, 0, 0], cell)
  const a = fracToCart([0.2, 0, 0], cell)
  const b = fracToCart([0, 0.2, 0], cell)
  const c = fracToCart([0, 0, 0.2], cell)
  return (
    <group>
      <Line points={[o, a]} color="#f87171" lineWidth={2} />
      <Line points={[o, b]} color="#4ade80" lineWidth={2} />
      <Line points={[o, c]} color="#60a5fa" lineWidth={2} />
    </group>
  )
}

function SceneBody({
  structure,
  selectedOp,
  visibility,
  controlsRef,
  resetToken,
}: Props & { controlsRef: RefObject<OrbitControlsImpl | null> }) {
  const center = cellCenterCart(structure.cell)

  const visibleAtoms = useMemo(() => {
    if (visibility === 'asymmetric') {
      return structure.atoms.filter((a) => a.opIndex === 1)
    }
    if (visibility === 'selected') {
      return structure.atoms.filter(
        (a) => a.opIndex === 1 || a.opIndex === selectedOp,
      )
    }
    return structure.atoms
  }, [structure.atoms, visibility, selectedOp])

  const visibleAtomSet = useMemo(() => new Set(visibleAtoms), [visibleAtoms])

  const visibleBonds = useMemo(() => {
    return structure.bonds.filter(
      (b) =>
        visibleAtomSet.has(structure.atoms[b.a]!) &&
        visibleAtomSet.has(structure.atoms[b.b]!),
    )
  }, [structure.atoms, structure.bonds, visibleAtomSet])

  const boundsRadius = useMemo(() => {
    const corners = cellCornersCart(structure.cell)
    let maxR = 0
    for (const p of corners) {
      const d = Math.hypot(
        p[0] - center[0],
        p[1] - center[1],
        p[2] - center[2],
      )
      maxR = Math.max(maxR, d)
    }
    for (const a of visibleAtoms) {
      const d = Math.hypot(
        a.cartesian[0] - center[0],
        a.cartesian[1] - center[1],
        a.cartesian[2] - center[2],
      )
      maxR = Math.max(maxR, d)
    }
    return Math.max(maxR, 1)
  }, [structure.cell, center, visibleAtoms])

  useEffect(() => {
    const ctrl = controlsRef.current
    if (!ctrl) return
    const dist = boundsRadius * 2.6
    const dir = new THREE.Vector3(1.1, 0.85, 1.35).normalize()
    ctrl.object.position.copy(dir.multiplyScalar(dist))
    ctrl.target.set(0, 0, 0)
    ctrl.update()
  }, [resetToken, boundsRadius, controlsRef])

  return (
    <>
      <color attach="background" args={['#0b1220']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 5, 6]} intensity={1.1} />
      <directionalLight position={[-3, -2, 2]} intensity={0.35} />

      <group position={[-center[0], -center[1], -center[2]]}>
        <CellWire cell={structure.cell} />
        <AxisHints cell={structure.cell} />

        {visibleBonds.map((b, i) => {
          const A = structure.atoms[b.a]!
          const B = structure.atoms[b.b]!
          const emphasized = b.opIndex === selectedOp || b.opIndex === 1
          const col = operatorColor(b.opIndex, emphasized ? 0.9 : 0.35)
          return (
            <Line
              key={`bond-${i}`}
              points={[A.cartesian, B.cartesian]}
              color={col}
              lineWidth={emphasized ? 2.2 : 1.2}
              transparent
              opacity={emphasized ? 0.95 : 0.4}
            />
          )
        })}

        {visibleAtoms.map((a, i) => {
          const isSel = a.opIndex === selectedOp
          const isBase = a.opIndex === 1
          const emphasized = isSel || isBase || visibility !== 'all'
          const opTint = operatorColor(a.opIndex, emphasized ? 1 : 0.45)
          const el = elementColor(a.element)
          const r = elementRadius(a.element) * (emphasized ? 1.05 : 0.85)
          return (
            <mesh
              key={`atom-${a.opIndex}-${a.auIndex}-${i}`}
              position={a.cartesian as Vec3}
            >
              <sphereGeometry args={[r, 18, 18]} />
              <meshStandardMaterial
                color={el}
                emissive={opTint}
                emissiveIntensity={emphasized ? 0.45 : 0.12}
                metalness={0.15}
                roughness={0.45}
                transparent={!emphasized}
                opacity={emphasized ? 1 : 0.55}
              />
            </mesh>
          )
        })}
      </group>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={0.5}
        maxDistance={80}
      />
    </>
  )
}

export default function CifStructureScene(props: Props) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  return (
    <Canvas
      camera={{ position: [8, 6, 10], fov: 42, near: 0.1, far: 200 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <SceneBody {...props} controlsRef={controlsRef} />
    </Canvas>
  )
}
