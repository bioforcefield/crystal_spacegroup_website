import { useMemo, useRef, useEffect, type RefObject } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
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
import {
  bondVisibleInWrapped,
  placeCifStructure,
  type CifPlacementMode,
} from '../data/cif/placement'
import type { CellParams, SpaceGroupDemo, Vec3 } from '../data/types'
import SymmetryElements from './SymmetryElements'
import CellParamsBadge from './cif/CellParamsBadge'
import type {
  CifColorMode,
  CifHBondMode,
  CifThermalMode,
  CifVisibility,
} from './cif/cifViewTypes'
import {
  asymmetricMoleculeIds,
  hbondPartnerMolecules,
} from '../data/cif/hbonds'
import {
  ellipsoidAxes,
  residueColor,
  uIsoRadiusScale,
} from '../data/cif/thermal'
import { CIF_FOV, fitDistanceForSphere } from '../data/cif/fitCamera'

export type { CifPlacementMode }
export type { CifVisibility }
export { CellParamsBadge }

function fmtLen(v: number): string {
  return v >= 10 ? v.toFixed(2) : v.toFixed(3)
}

const CIF_BOUND_PAD = 0.45
/** Match SG demos: origin toward the front of Reset view. */
const CIF_CAM_DIR = new THREE.Vector3(-2.4, 1.35, -2.6).normalize()

interface Props {
  structure: ExpandedStructure
  selectedOp: number
  /** molecules = intact (default); all = same atoms dimmed uniformly; selected = BASE+IMAGE; asymmetric = AU */
  visibility: CifVisibility
  /** SG-style placement: nearest (Near) vs wrapped in-cell (Cell). Default nearest. */
  placementMode?: CifPlacementMode
  resetToken: number
  /** When set, dim molecules that are not this id (optional focus). */
  selectedMolecule?: number | null
  /** Teaching-style screw/glide/inversion overlays (demo cell already = CIF metric). */
  elementDemo?: SpaceGroupDemo | null
  showSymmetryElements?: boolean
  colorMode?: CifColorMode
  thermalMode?: CifThermalMode
  hbondMode?: CifHBondMode
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


function applyCifFit(
  camera: THREE.Camera,
  ctrl: OrbitControlsImpl,
  bounds: { center: THREE.Vector3; radius: number },
  aspect: number,
) {
  const dist = fitDistanceForSphere(bounds.radius, CIF_FOV, aspect)
  const dir = CIF_CAM_DIR.clone()
  const target = bounds.center
  camera.position.set(
    target.x + dir.x * dist,
    target.y + dir.y * dist,
    target.z + dir.z * dist,
  )
  ctrl.target.copy(target)
  ctrl.update()
}

function FitCifCamera({
  bounds,
  controlsRef,
  resetToken,
}: {
  bounds: { center: THREE.Vector3; radius: number }
  controlsRef: RefObject<OrbitControlsImpl | null>
  resetToken: number
}) {
  const { camera, size } = useThree()

  useEffect(() => {
    const aspect =
      size.width > 0 && size.height > 0
        ? size.width / size.height
        : camera instanceof THREE.PerspectiveCamera
          ? camera.aspect
          : 1

    const tryFit = () => {
      const ctrl = controlsRef.current
      if (!ctrl) return false
      applyCifFit(camera, ctrl, bounds, aspect)
      return true
    }

    if (tryFit()) return

    // OrbitControls ref is assigned after first commit — retry next frame.
    const id = window.requestAnimationFrame(() => {
      tryFit()
    })
    return () => window.cancelAnimationFrame(id)
  }, [
    bounds.center.x,
    bounds.center.y,
    bounds.center.z,
    bounds.radius,
    resetToken,
    size.width,
    size.height,
    camera,
    controlsRef,
    bounds,
  ])

  return null
}

function SceneBody({
  structure,
  selectedOp,
  visibility,
  placementMode = 'nearest',
  controlsRef,
  resetToken,
  selectedMolecule = null,
  elementDemo = null,
  showSymmetryElements = false,
  colorMode = 'operator',
  thermalMode = 'off',
  hbondMode = 'off',
}: Props & { controlsRef: RefObject<OrbitControlsImpl | null> }) {
  const center = cellCenterCart(structure.cell)

  const placement = useMemo(
    () =>
      placeCifStructure(
        structure,
        placementMode,
        selectedOp,
        elementDemo ?? null,
      ),
    [structure, placementMode, selectedOp, elementDemo],
  )

  const visibleIndices = useMemo(() => {
    const idxs: number[] = []
    structure.atoms.forEach((a, i) => {
      if (visibility === 'asymmetric' && a.opIndex !== 1) return
      if (
        visibility === 'selected' &&
        a.opIndex !== 1 &&
        a.opIndex !== selectedOp
      )
        return
      idxs.push(i)
    })
    return idxs
  }, [structure.atoms, visibility, selectedOp])

  const visibleIndexSet = useMemo(() => new Set(visibleIndices), [visibleIndices])

  const visibleBonds = useMemo(() => {
    return structure.bonds.filter((b) => {
      if (!visibleIndexSet.has(b.a) || !visibleIndexSet.has(b.b)) return false
      if (placementMode === 'wrapped') {
        return bondVisibleInWrapped(
          placement.positions[b.a]!,
          placement.positions[b.b]!,
        )
      }
      return true
    })
  }, [structure.bonds, visibleIndexSet, placementMode, placement.positions])

  /** AABB of cell + visible atoms in cell-centred coords (nearest images can sit off-centre). */
  const viewBounds = useMemo(() => {
    const box = new THREE.Box3()
    for (const p of cellCornersCart(structure.cell)) {
      box.expandByPoint(
        new THREE.Vector3(p[0] - center[0], p[1] - center[1], p[2] - center[2]),
      )
    }
    for (const i of visibleIndices) {
      const p = placement.positions[i]!
      box.expandByPoint(
        new THREE.Vector3(p[0] - center[0], p[1] - center[1], p[2] - center[2]),
      )
    }
    const mid = new THREE.Vector3()
    const size = new THREE.Vector3()
    box.getCenter(mid)
    box.getSize(size)
    const radius = 0.5 * size.length() + CIF_BOUND_PAD
    return { center: mid, radius: Math.max(radius, 1) }
  }, [structure.cell, center, visibleIndices, placement.positions])


  const partnerMols = useMemo(() => {
    if (hbondMode !== 'partners' || !structure.hbonds?.length) return null
    const auMols = asymmetricMoleculeIds(structure.atoms)
    const set = new Set<number>()
    for (const mid of auMols) {
      for (const m of hbondPartnerMolecules(structure.hbonds, mid)) set.add(m)
    }
    return set
  }, [hbondMode, structure])

  const hbondLines = useMemo(() => {
    if (hbondMode === 'off' || !structure.hbonds?.length) return []
    return structure.hbonds
  }, [hbondMode, structure])

  return (
    <>
      <FitCifCamera
        bounds={viewBounds}
        controlsRef={controlsRef}
        resetToken={resetToken}
      />
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
              points={[placement.positions[b.a]!, placement.positions[b.b]!]}
              color={col}
              lineWidth={emphasized && !dim ? 2.4 : 1.15}
              transparent
              opacity={emphasized && !dim ? 0.98 : 0.35}
            />
          )
        })}


        {hbondLines.map((hb, i) => {
          const a = placement.positions[hb.hydrogen]!
          const b = placement.positions[hb.acceptor]!
          const partnerOk =
            partnerMols == null ||
            partnerMols.has(hb.donorMolecule) ||
            partnerMols.has(hb.acceptorMolecule)
          if (!partnerOk && hbondMode === 'partners') return null
          // Only draw if both endpoints currently visible
          if (!visibleIndices.includes(hb.hydrogen) || !visibleIndices.includes(hb.acceptor)) {
            // still draw cross-op links when molecules mode shows both ops somewhat — check opacity path
          }
          return (
            <Line
              key={`hb-${i}-${hb.hydrogen}-${hb.acceptor}`}
              points={[a, b]}
              color={hb.crossOp ? '#f472b6' : '#94a3b8'}
              lineWidth={1.6}
              transparent
              opacity={0.85}
              dashed
              dashSize={0.12}
              gapSize={0.08}
            />
          )
        })}

        {visibleIndices.map((ai) => {
          const a = structure.atoms[ai]!
          const isSel = a.opIndex === selectedOp
          const isBase = a.opIndex === 1
          const molFocus =
            selectedMolecule == null || a.moleculeId === selectedMolecule
          const partnerFocus =
            partnerMols == null || partnerMols.has(a.moleculeId)
          const emphasized =
            (isSel ||
              isBase ||
              visibility === 'molecules' ||
              visibility !== 'all') &&
            molFocus &&
            partnerFocus
          const strong =
            (isSel || (visibility === 'selected' && isBase)) && molFocus
          const opTint = operatorColor(
            a.opIndex,
            strong ? 1 : emphasized ? 0.85 : 0.4,
          )
          const el =
            colorMode === 'residue'
              ? residueColor(a.residue ?? a.label.split(/[0-9]/)[0], 1)
              : elementColor(a.element)
          const baseR =
            elementRadius(a.element) *
            (strong ? 1.12 : emphasized ? 1.0 : 0.82)
          const r =
            thermalMode === 'off'
              ? baseR
              : uIsoRadiusScale(a.uIso ?? (a.aniso ? (a.aniso.u11 + a.aniso.u22 + a.aniso.u33) / 3 : undefined), baseR)

          const useEllipsoid =
            thermalMode === 'ellipsoid' && a.aniso != null

          if (useEllipsoid) {
            const { radii, rotation } = ellipsoidAxes(a.aniso!)
            // rotation columns → Three.js Matrix4 basis; scale unit sphere
            const m = new THREE.Matrix4()
            m.makeBasis(
              new THREE.Vector3(rotation[0][0], rotation[1][0], rotation[2][0]).multiplyScalar(radii[0]),
              new THREE.Vector3(rotation[0][1], rotation[1][1], rotation[2][1]).multiplyScalar(radii[1]),
              new THREE.Vector3(rotation[0][2], rotation[1][2], rotation[2][2]).multiplyScalar(radii[2]),
            )
            const pos = placement.positions[ai]! as Vec3
            m.setPosition(pos[0], pos[1], pos[2])
            return (
              <mesh
                key={`atom-${a.opIndex}-${a.auIndex}-${a.moleculeId}-${ai}`}
                matrix={m}
                matrixAutoUpdate={false}
              >
                <sphereGeometry args={[1, 16, 16]} />
                <meshStandardMaterial
                  color={el}
                  emissive={opTint}
                  emissiveIntensity={strong ? 0.45 : emphasized ? 0.3 : 0.08}
                  metalness={0.1}
                  roughness={0.55}
                  transparent
                  opacity={strong ? 0.88 : emphasized ? 0.72 : 0.4}
                />
              </mesh>
            )
          }

          return (
            <mesh
              key={`atom-${a.opIndex}-${a.auIndex}-${a.moleculeId}-${ai}`}
              position={placement.positions[ai]! as Vec3}
            >
              <sphereGeometry args={[r, 18, 18]} />
              <meshStandardMaterial
                color={el}
                emissive={colorMode === 'residue' ? '#000000' : opTint}
                emissiveIntensity={
                  colorMode === 'residue'
                    ? 0
                    : strong
                      ? 0.55
                      : emphasized
                        ? 0.38
                        : 0.1
                }
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
        maxDistance={250}
      />
    </>
  )
}

export default function CifStructureScene(props: Props) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  return (
    <div className="cif-canvas-frame">
      <Canvas
        camera={{
          position: [
            CIF_CAM_DIR.x * 12,
            CIF_CAM_DIR.y * 12,
            CIF_CAM_DIR.z * 12,
          ],
          fov: CIF_FOV,
          near: 0.1,
          far: 400,
        }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <SceneBody {...props} controlsRef={controlsRef} />
      </Canvas>
      <CellParamsBadge cell={props.structure.cell} />
    </div>
  )
}
