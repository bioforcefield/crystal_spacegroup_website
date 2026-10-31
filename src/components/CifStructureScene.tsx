import { equivalenceClasses, equivalenceColor, jmolColor } from '../data/cif/colorSchemes'
import SupercellWire from './SupercellWire'
import {
  DEFAULT_MULTIPLES,
  isDefaultMultiples,
  replicaOffsets,
  type CellMultiples,
} from '../data/supercell'
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
import {
  CIF_FOV,
  aspectForFit,
  computeCifViewBounds,
  fitDistanceForSphere,
} from '../data/cif/fitCamera'

export type { CifPlacementMode }
export type { CifVisibility }

function fmtLen(v: number): string {
  return v >= 10 ? v.toFixed(2) : v.toFixed(3)
}

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
  /** Supercell na×nb×nc; default 1×1×1 = single cell (unchanged). */
  multiples?: CellMultiples
}

/** Instanced, dimmed lattice-translated copies of the visible atoms + bonds. */
function CifReplicas({
  structure,
  positions,
  visibleIndices,
  bonds,
  offsets,
  colorOf,
  tintOf,
  bondColorOf,
  schemeKey,
}: {
  schemeKey: string
  structure: ExpandedStructure
  positions: Vec3[]
  visibleIndices: number[]
  bonds: { a: number; b: number; opIndex: number }[]
  offsets: Vec3[]
  colorOf: (atomIndex: number) => string
  tintOf: ((atomIndex: number) => string) | null
  bondColorOf: (atomIndex: number, opIndex: number) => string
}) {
  const groups = useMemo(() => {
    const byKey = new Map<string, { el: string; color: string; tint: string | null; pts: Vec3[] }>()
    for (const ai of visibleIndices) {
      const el = structure.atoms[ai]!.element
      const color = colorOf(ai)
      const tint = tintOf ? tintOf(ai) : null
      const key = `${el}|${color}|${tint ?? ''}`
      const p = positions[ai]!
      let g = byKey.get(key)
      if (!g) byKey.set(key, (g = { el, color, tint, pts: [] }))
      for (const d of offsets) g.pts.push([p[0] + d[0], p[1] + d[1], p[2] + d[2]])
    }
    return [...byKey.entries()]
    // colorOf/tintOf are recreated each render; schemeKey captures the color mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure.atoms, positions, visibleIndices, offsets, schemeKey])
  const bondGeom = useMemo(() => {
    const arr = new Float32Array(bonds.length * offsets.length * 12)
    const col = new Float32Array(bonds.length * offsets.length * 12)
    const c = new THREE.Color()
    let k = 0
    let j = 0
    const pushC = (hex: string) => {
      c.set(hex.startsWith('hsla') ? hex.replace('hsla', 'hsl').replace(/,\s*[\d.]+\)$/, ')') : hex)
      col[j++] = c.r; col[j++] = c.g; col[j++] = c.b
    }
    for (const d of offsets) {
      for (const b of bonds) {
        const p = positions[b.a]!, q = positions[b.b]!
        const m: Vec3 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2]
        const ca = bondColorOf(b.a, b.opIndex)
        const cb = bondColorOf(b.b, b.opIndex)
        for (const [v, hex] of [[p, ca], [m, ca], [m, cb], [q, cb]] as [Vec3, string][]) {
          arr[k++] = v[0] + d[0]; arr[k++] = v[1] + d[1]; arr[k++] = v[2] + d[2]
          pushC(hex)
        }
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    return g
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bonds, positions, offsets, schemeKey])
  useEffect(() => () => bondGeom.dispose(), [bondGeom])
  return (
    <group>
      {groups.map(([key, g]) => (
        <InstancedAtoms key={key} element={g.el} color={g.color} tint={g.tint} points={g.pts} />
      ))}
      <lineSegments geometry={bondGeom}>
        <lineBasicMaterial vertexColors transparent opacity={0.55} />
      </lineSegments>
    </group>
  )
}

function InstancedAtoms({
  element,
  color,
  tint,
  points,
}: {
  element: string
  color: string
  tint: string | null
  points: Vec3[]
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const m = ref.current
    if (!m) return
    const mat = new THREE.Matrix4()
    points.forEach((p, i) => {
      mat.makeTranslation(p[0], p[1], p[2])
      m.setMatrixAt(i, mat)
    })
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [points])
  const r = elementRadius(element) * 0.82
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, points.length]} frustumCulled={false}>
      <sphereGeometry args={[r, 10, 10]} />
      <meshStandardMaterial
        color={color}
        emissive={tint ? tint.replace('hsla', 'hsl').replace(/,\s*[\d.]+\)$/, ')') : '#000000'}
        emissiveIntensity={tint ? 0.25 : 0}
        roughness={0.5}
        transparent
        opacity={0.7}
      />
    </instancedMesh>
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


function applyCifFit(
  camera: THREE.Camera,
  ctrl: OrbitControlsImpl,
  bounds: { center: THREE.Vector3; radius: number },
  aspect: number,
) {
  const dist = fitDistanceForSphere(bounds.radius, CIF_FOV, aspect)
  const dir = CIF_CAM_DIR.clone()
  const target = bounds.center
  if (camera instanceof THREE.PerspectiveCamera) {
    camera.aspect = aspect
    camera.updateProjectionMatrix()
  }
  camera.position.set(
    target.x + dir.x * dist,
    target.y + dir.y * dist,
    target.z + dir.z * dist,
  )
  ctrl.target.copy(target)
  ctrl.update()
}

/**
 * Frame the CIF cell once the WebGL canvas has a real size.
 * First paint often reports 0×0 (or a pathological flex size); fitting then
 * zooms to infinity and the cell looks like a black speck until a later
 * reflow (e.g. toggling the old Cell expand). Retry until size is usable.
 */
function FitCifCamera({
  bounds,
  controlsRef,
  resetToken,
}: {
  bounds: { center: THREE.Vector3; radius: number }
  controlsRef: RefObject<OrbitControlsImpl | null>
  resetToken: number
}) {
  const { camera, size, gl } = useThree()

  useEffect(() => {
    let cancelled = false
    let raf = 0
    let attempts = 0
    const maxAttempts = 180 // ~3s at 60fps — cover layout settle after CIF load

    const measure = () => {
      // Prefer live DOM box: R3F `size` can lag a flex reflow that CSS
      // `height:100% !important` already painted (Cell-click "fixed" that).
      const dom = gl.domElement
      const parent = dom.parentElement
      const w = Math.max(
        size.width,
        dom.clientWidth || 0,
        parent?.clientWidth || 0,
      )
      const h = Math.max(
        size.height,
        dom.clientHeight || 0,
        parent?.clientHeight || 0,
      )
      return { w, h }
    }

    const tryFit = (): boolean => {
      const ctrl = controlsRef.current
      if (!ctrl) return false
      const { w, h } = measure()
      const aspect = aspectForFit(
        w,
        h,
        camera instanceof THREE.PerspectiveCamera ? camera.aspect : undefined,
      )
      if (aspect == null) return false
      applyCifFit(camera, ctrl, bounds, aspect)
      return true
    }

    const tick = () => {
      if (cancelled) return
      if (tryFit()) {
        // Layout can still settle one frame later (toolbar wrap, sidebar).
        raf = window.requestAnimationFrame(() => {
          if (!cancelled) tryFit()
        })
        return
      }
      attempts += 1
      if (attempts < maxAttempts) {
        raf = window.requestAnimationFrame(tick)
      }
    }

    tick()
    // Also re-fit when the canvas element itself resizes (flex / absolute frame).
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            if (!cancelled) tryFit()
          })
        : null
    if (ro) {
      ro.observe(gl.domElement)
      if (gl.domElement.parentElement) ro.observe(gl.domElement.parentElement)
    }

    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf)
      ro?.disconnect()
    }
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
    gl,
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
  multiples = DEFAULT_MULTIPLES,
}: Props & { controlsRef: RefObject<OrbitControlsImpl | null> }) {
  const supercell = !isDefaultMultiples(multiples)
  const center = useMemo(
    () =>
      supercell
        ? fracToCart([multiples[0] / 2, multiples[1] / 2, multiples[2] / 2], structure.cell)
        : cellCenterCart(structure.cell),
    [supercell, multiples, structure.cell],
  )
  const offsets = useMemo(
    () => (supercell ? replicaOffsets(multiples, (f) => fracToCart(f, structure.cell)) : []),
    [supercell, multiples, structure.cell],
  )

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

  const eq = useMemo(() => equivalenceClasses(structure.atoms), [structure.atoms])

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
    const pts: [number, number, number][] = []
    for (const p of cellCornersCart(structure.cell)) {
      pts.push([p[0] - center[0], p[1] - center[1], p[2] - center[2]])
    }
    for (const i of visibleIndices) {
      const p = placement.positions[i]!
      pts.push([p[0] - center[0], p[1] - center[1], p[2] - center[2]])
    }
    if (supercell) {
      const [na, nb, nc] = multiples
      for (const f of [
        [0, 0, 0], [na, 0, 0], [0, nb, 0], [0, 0, nc],
        [na, nb, 0], [na, 0, nc], [0, nb, nc], [na, nb, nc],
      ] as Vec3[]) {
        const p = fracToCart(f, structure.cell)
        pts.push([p[0] - center[0], p[1] - center[1], p[2] - center[2]])
      }
    }
    const b = computeCifViewBounds(pts)
    return {
      center: new THREE.Vector3(b.center.x, b.center.y, b.center.z),
      radius: b.radius,
    }
  }, [structure.cell, center, visibleIndices, placement.positions, supercell, multiples])


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
        {supercell && (
          <>
            <SupercellWire cell={structure.cell} multiples={multiples} />
            <CifReplicas
              structure={structure}
              positions={placement.positions as Vec3[]}
              visibleIndices={visibleIndices}
              bonds={visibleBonds}
              offsets={offsets}
              schemeKey={colorMode}
              colorOf={(ai) =>
                colorMode === 'element'
                  ? jmolColor(structure.atoms[ai]!.element)
                  : colorMode === 'equivalence'
                    ? equivalenceColor(eq.classOf[ai] ?? 0)
                    : colorMode === 'residue'
                      ? residueColor(structure.atoms[ai]!.residue ?? structure.atoms[ai]!.label.split(/[0-9]/)[0], 1)
                      : elementColor(structure.atoms[ai]!.element)
              }
              tintOf={colorMode === 'operator' ? (ai) => operatorColor(structure.atoms[ai]!.opIndex) : null}
              bondColorOf={(ai, opIndex) =>
                colorMode === 'operator'
                  ? operatorColor(opIndex)
                  : colorMode === 'element'
                    ? jmolColor(structure.atoms[ai]!.element)
                    : colorMode === 'equivalence'
                      ? equivalenceColor(eq.classOf[ai] ?? 0)
                      : '#94a3b8'
              }
            />
          </>
        )}
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
          const pa = placement.positions[b.a]!
          const pb = placement.positions[b.b]!
          if (colorMode === 'element' || colorMode === 'equivalence') {
            const ca =
              colorMode === 'element'
                ? jmolColor(structure.atoms[b.a]!.element)
                : equivalenceColor(eq.classOf[b.a] ?? 0)
            const cb =
              colorMode === 'element'
                ? jmolColor(structure.atoms[b.b]!.element)
                : equivalenceColor(eq.classOf[b.b] ?? 0)
            const mid: Vec3 = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2]
            const lw = emphasized && !dim ? 2.4 : 1.15
            const op = emphasized && !dim ? 0.98 : 0.5
            return (
              <group key={`bond-${i}`}>
                <Line points={[pa, mid]} color={ca} lineWidth={lw} transparent opacity={op} />
                <Line points={[mid, pb]} color={cb} lineWidth={lw} transparent opacity={op} />
              </group>
            )
          }
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
              : colorMode === 'element'
                ? jmolColor(a.element)
                : colorMode === 'equivalence'
                  ? equivalenceColor(eq.classOf[ai] ?? 0)
                  : elementColor(a.element)
          const plain = colorMode !== 'operator'
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
                  emissive={plain ? '#000000' : opTint}
                  emissiveIntensity={plain ? 0 : strong ? 0.45 : emphasized ? 0.3 : 0.08}
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
                emissive={plain ? '#000000' : opTint}
                emissiveIntensity={
                  plain
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
        className="cif-r3f-root"
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
    </div>
  )
}
