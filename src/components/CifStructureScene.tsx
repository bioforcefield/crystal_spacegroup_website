import { useMemo, useRef, useEffect, type RefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Line, Text, Billboard } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { cellCenterCart, cellCornersCart, fracToCart } from '../data/math'
import {
  elementColor,
  elementRadius,
  operatorColor,
} from '../data/cif/operatorColors'
import type { ExpandedStructure } from '../data/cif/types'
import type { CellParams, SpaceGroupDemo, Vec3 } from '../data/types'
import SymmetryElements from './SymmetryElements'

export type CifVisibility = 'molecules' | 'all' | 'selected' | 'asymmetric'

interface Props {
  structure: ExpandedStructure
  selectedOp: number
  /** molecules = intact (default); all = same atoms dimmed uniformly; selected = BASE+IMAGE; asymmetric = AU */
  visibility: CifVisibility
  resetToken: number
  /** When set, dim molecules that are not this id (optional focus). */
  selectedMolecule?: number | null
  /** Teaching-style screw/glide/inversion overlays (demo cell already = CIF metric). */
  elementDemo?: SpaceGroupDemo | null
  showSymmetryElements?: boolean
}

function fmtLen(v: number): string {
  return v >= 10 ? v.toFixed(2) : v.toFixed(3)
}

function fmtAngle(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

/** Compact HTML readout of lattice parameters (phone-friendly, corner of canvas). */
export function CellParamsBadge({ cell, variant = 'overlay' }: { cell: CellParams; variant?: 'overlay' | 'strip' }) {
  const alpha = cell.alphaDeg ?? 90
  const beta = cell.betaDeg ?? 90
  const gamma = cell.gammaDeg ?? 90
  const orthorhombic =
    Math.abs(alpha - 90) < 1e-3 &&
    Math.abs(beta - 90) < 1e-3 &&
    Math.abs(gamma - 90) < 1e-3
  return (
    <div className={variant === 'strip' ? 'cif-cell-strip' : 'cif-cell-badge'} aria-label="Unit-cell parameters">
      <span className="cif-cell-axis a">
        a {fmtLen(cell.a)} Å
      </span>
      <span className="cif-cell-axis b">
        b {fmtLen(cell.b)} Å
      </span>
      <span className="cif-cell-axis c">
        c {fmtLen(cell.c)} Å
      </span>
      {!orthorhombic && (
        <span className="cif-cell-angles">
          α {fmtAngle(alpha)}° · β {fmtAngle(beta)}° · γ {fmtAngle(gamma)}°
        </span>
      )}
      {orthorhombic && (
        <span className="cif-cell-angles">α = β = γ = 90°</span>
      )}
      <span className="cif-cell-origin">● O = origin (0,0,0)</span>
    </div>
  )
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

function AxisLabels({ cell }: { cell: CellParams }) {
  const o = fracToCart([0, 0, 0], cell)
  const aEnd = fracToCart([1, 0, 0], cell)
  const bEnd = fracToCart([0, 1, 0], cell)
  const cEnd = fracToCart([0, 0, 1], cell)
  // Labels just past each axis tip so they sit on the box, not over the molecule
  // ~1.6× earlier size (0.038 → 0.06) for desktop/phone readability
  const scale = Math.max(0.34, Math.min(cell.a, cell.b, cell.c) * 0.06)
  const bump = (p: Vec3, q: Vec3, extra = scale * 1.3): Vec3 => {
    const dx = q[0] - p[0]
    const dy = q[1] - p[1]
    const dz = q[2] - p[2]
    const len = Math.hypot(dx, dy, dz) || 1
    return [
      q[0] + (dx / len) * extra,
      q[1] + (dy / len) * extra,
      q[2] + (dz / len) * extra,
    ]
  }

  const label = (text: string, position: Vec3, color: string) => (
    <Billboard key={text} position={position}>
      <Text
        fontSize={scale}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={scale * 0.08}
        outlineColor="#0f172a"
      >
        {text}
      </Text>
    </Billboard>
  )

  return (
    <group>
      <Line points={[o, aEnd]} color="#f87171" lineWidth={2} transparent opacity={0.85} />
      <Line points={[o, bEnd]} color="#4ade80" lineWidth={2} transparent opacity={0.85} />
      <Line points={[o, cEnd]} color="#60a5fa" lineWidth={2} transparent opacity={0.85} />
      {label(`a ${fmtLen(cell.a)}`, bump(o, aEnd), '#f87171')}
      {label(`b ${fmtLen(cell.b)}`, bump(o, bEnd), '#4ade80')}
      {label(`c ${fmtLen(cell.c)}`, bump(o, cEnd), '#60a5fa')}
      {/* Origin marker: crystallographic (0,0,0), pushed away from the cell body diagonal */}
      <mesh position={o}>
        <sphereGeometry args={[scale * 0.22, 16, 16]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>
      {label('O (0,0,0)', bump(fracToCart([1, 1, 1], cell), o, scale * 1.1), '#fbbf24')}
    </group>
  )
}

function SceneBody({
  structure,
  selectedOp,
  visibility,
  controlsRef,
  resetToken,
  selectedMolecule = null,
  elementDemo = null,
  showSymmetryElements = false,
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
      const p = a.displayCartesian
      const d = Math.hypot(
        p[0] - center[0],
        p[1] - center[1],
        p[2] - center[2],
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
        <AxisLabels cell={structure.cell} />
        {showSymmetryElements && elementDemo && (
          <SymmetryElements
            demo={elementDemo}
            selectedIndex={selectedOp}
            soft
          />
        )}

        {visibleBonds.map((b, i) => {
          const A = structure.atoms[b.a]!
          const B = structure.atoms[b.b]!
          const opMatch = b.opIndex === selectedOp
          const molFocus =
            selectedMolecule == null || b.moleculeId === selectedMolecule
          const emphasized =
            (opMatch || b.opIndex === 1 || visibility === 'molecules') &&
            molFocus
          const dim = visibility === 'molecules' && !opMatch && selectedOp !== 1
          const col = operatorColor(
            b.opIndex,
            emphasized && !dim ? 0.95 : visibility === 'all' ? 0.55 : 0.3,
          )
          return (
            <Line
              key={`bond-${i}`}
              points={[A.displayCartesian, B.displayCartesian]}
              color={col}
              lineWidth={emphasized && !dim ? 2.4 : 1.15}
              transparent
              opacity={emphasized && !dim ? 0.98 : 0.35}
            />
          )
        })}

        {visibleAtoms.map((a, i) => {
          const isSel = a.opIndex === selectedOp
          const isBase = a.opIndex === 1
          const molFocus =
            selectedMolecule == null || a.moleculeId === selectedMolecule
          const emphasized =
            (isSel ||
              isBase ||
              visibility === 'molecules' ||
              visibility !== 'all') &&
            molFocus
          const strong =
            (isSel || (visibility === 'selected' && isBase)) && molFocus
          const opTint = operatorColor(
            a.opIndex,
            strong ? 1 : emphasized ? 0.85 : 0.4,
          )
          const el = elementColor(a.element)
          const r =
            elementRadius(a.element) *
            (strong ? 1.12 : emphasized ? 1.0 : 0.82)
          return (
            <mesh
              key={`atom-${a.opIndex}-${a.auIndex}-${a.moleculeId}-${i}`}
              position={a.displayCartesian as Vec3}
            >
              <sphereGeometry args={[r, 18, 18]} />
              <meshStandardMaterial
                color={el}
                emissive={opTint}
                emissiveIntensity={strong ? 0.55 : emphasized ? 0.38 : 0.1}
                metalness={0.15}
                roughness={0.45}
                transparent={!strong && visibility === 'all'}
                opacity={strong ? 1 : emphasized ? 0.95 : 0.5}
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
    <div className="cif-canvas-frame">
      <Canvas
        camera={{ position: [8, 6, 10], fov: 42, near: 0.1, far: 200 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <SceneBody {...props} controlsRef={controlsRef} />
      </Canvas>
      <CellParamsBadge cell={props.structure.cell} />
    </div>
  )
}
