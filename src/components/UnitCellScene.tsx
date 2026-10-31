import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Line, Text, Billboard } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { cellCenterCart, cellCornersCart, fracToCart } from '../data/math'
import {
  placedPositions,
  type PlacementMode,
} from '../data/nearestImages'
import type { GeneralPoint, Mat3, SpaceGroupDemo, Vec3 } from '../data/types'
import { ChiralMotifMesh, orientationFromR } from './ChiralMotif'
import SymmetryElements from './SymmetryElements'
import {
  DEFAULT_MULTIPLES,
  isDefaultMultiples,
  replicatePoints,
  supercellTranslations,
  type CellMultiples,
} from '../data/supercell'

interface SceneProps {
  demo: SpaceGroupDemo
  selectedIndex: number
  animateToken: number
  placementMode: PlacementMode
  showAllSites: boolean
  /** Supercell na×nb×nc (default 1×1×1 = single unit cell). */
  multiples?: CellMultiples
}

function UnitCellWireframe({ demo }: { demo: SpaceGroupDemo }) {
  const corners = cellCornersCart(demo.cell)
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
          lineWidth={1.5}
          transparent
          opacity={0.85}
        />
      ))}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial
          color="#e2e8f0"
          emissive="#94a3b8"
          emissiveIntensity={0.4}
        />
      </mesh>
      <Billboard position={[-0.14, -0.1, 0.02]}>
        <Text
          fontSize={0.13}
          color="#e2e8f0"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.012}
          outlineColor="#0f172a"
        >
          o
        </Text>
      </Billboard>
    </group>
  )
}

const CELL_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7],
]

/** Faint copies of the unit-cell outline for every translated cell, plus a bright supercell outline. */
function SupercellWireframe({ demo, multiples }: { demo: SpaceGroupDemo; multiples: CellMultiples }) {
  const corners = cellCornersCart(demo.cell)
  const lines = useMemo(() => {
    const out: { pts: [Vec3, Vec3]; outer: boolean }[] = []
    const sc = (f: Vec3) => fracToCart(f, demo.cell)
    for (const t of supercellTranslations(multiples)) {
      if (t[0] === 0 && t[1] === 0 && t[2] === 0) continue
      const d = sc(t)
      for (const [i, j] of CELL_EDGES) {
        const a = corners[i], b = corners[j]
        out.push({
          pts: [
            [a[0] + d[0], a[1] + d[1], a[2] + d[2]],
            [b[0] + d[0], b[1] + d[1], b[2] + d[2]],
          ],
          outer: false,
        })
      }
    }
    // Supercell outline from fractional corners.
    const [na, nb, nc] = multiples
    const fc: Vec3[] = [
      [0, 0, 0], [na, 0, 0], [na, nb, 0], [0, nb, 0],
      [0, 0, nc], [na, 0, nc], [na, nb, nc], [0, nb, nc],
    ]
    const cc = fc.map(sc)
    for (const [i, j] of CELL_EDGES) out.push({ pts: [cc[i], cc[j]], outer: true })
    return out
  }, [demo.cell, multiples, corners])
  return (
    <group>
      {lines.map((l, k) => (
        <Line
          key={k}
          points={l.pts}
          color={l.outer ? '#fbbf24' : '#7dd3fc'}
          lineWidth={l.outer ? 1.8 : 1}
          transparent
          opacity={l.outer ? 0.8 : 0.3}
        />
      ))}
    </group>
  )
}

/** Translated copy of a motif (no labels / rings); clicking selects its operator. */
function ReplicaMarker({ point, onSelect }: { point: GeneralPoint; onSelect: (index: number) => void }) {
  const { quaternion, mirror } = useMemo(() => orientationFromR(point.operator.R), [point.operator.R])
  return (
    <group
      position={point.cartesian}
      quaternion={quaternion}
      scale={[mirror ? -1 : 1, 1, 1]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(point.index)
      }}
    >
      <ChiralMotifMesh color={point.classColor} selected={false} emissiveIntensity={0.18} />
    </group>
  )
}

function AxisLabels({ demo }: { demo: SpaceGroupDemo }) {
  const o = fracToCart([0, 0, 0], demo.cell)
  const aEnd = fracToCart([1, 0, 0], demo.cell)
  const bEnd = fracToCart([0, 1, 0], demo.cell)
  const cEnd = fracToCart([0, 0, 1], demo.cell)
  const aQ = fracToCart([0.25, 0, 0], demo.cell)
  const bQ = fracToCart([0, 0.25, 0], demo.cell)
  const cQ = fracToCart([0, 0, 0.25], demo.cell)
  const label = (text: string, position: Vec3, color: string) => (
    <Billboard key={text} position={position}>
      <Text
        fontSize={0.12}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.008}
        outlineColor="#0f172a"
      >
        {text}
      </Text>
    </Billboard>
  )
  const bump = (p: Vec3, q: Vec3): Vec3 => {
    const dx = q[0] - p[0]
    const dy = q[1] - p[1]
    const dz = q[2] - p[2]
    const len = Math.hypot(dx, dy, dz) || 1
    return [q[0] + (dx / len) * 0.12, q[1] + (dy / len) * 0.12, q[2] + (dz / len) * 0.12]
  }
  return (
    <group>
      {label('a', bump(o, aEnd), '#f87171')}
      {label('b', bump(o, bEnd), '#4ade80')}
      {label('c', bump(o, cEnd), '#60a5fa')}
      <Line points={[o, aQ]} color="#f87171" lineWidth={2} />
      <Line points={[o, bQ]} color="#4ade80" lineWidth={2} />
      <Line points={[o, cQ]} color="#60a5fa" lineWidth={2} />
    </group>
  )
}

function BaseImageConnector({ from, to }: { from: Vec3; to: Vec3 }) {
  const same =
    Math.abs(from[0] - to[0]) < 1e-6 &&
    Math.abs(from[1] - to[1]) < 1e-6 &&
    Math.abs(from[2] - to[2]) < 1e-6
  if (same) return null

  // Slight arc for readability
  const mid: Vec3 = [
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2,
    (from[2] + to[2]) / 2 + 0.12,
  ]

  return (
    <Line
      points={[from, mid, to]}
      color="#e2e8f0"
      lineWidth={1.25}
      transparent
      opacity={0.45}
      dashed
      dashSize={0.06}
      gapSize={0.04}
      dashScale={1}
    />
  )
}

function PointMarker({
  point,
  isBase,
  isImage,
  showLabel,
  onSelect,
}: {
  point: GeneralPoint
  isBase: boolean
  isImage: boolean
  /** False for dim orbit sites when a non-identity op is selected. */
  showLabel: boolean
  onSelect: (index: number) => void
}) {
  const color = point.classColor
  const emphasized = isBase || isImage
  const { quaternion, mirror } = useMemo(
    () => orientationFromR(point.operator.R),
    [point.operator.R],
  )
  const groupRef = useRef<THREE.Group>(null)

  useEffect(() => {
    const g = groupRef.current
    if (!g) return
    g.position.set(
      point.cartesian[0],
      point.cartesian[1],
      point.cartesian[2],
    )
    g.quaternion.copy(quaternion)
    g.scale.set(mirror ? -1 : 1, 1, 1)
  }, [point.cartesian, quaternion, mirror])

  // Offset BASE vs IMAGE billboards so they don't stack when close.
  const labelPos: Vec3 = isBase && isImage
    ? [
        point.cartesian[0],
        point.cartesian[1],
        point.cartesian[2] + 0.3,
      ]
    : isBase
      ? [
          point.cartesian[0] - 0.08,
          point.cartesian[1] + 0.04,
          point.cartesian[2] + 0.28,
        ]
      : isImage
        ? [
            point.cartesian[0] + 0.08,
            point.cartesian[1] - 0.04,
            point.cartesian[2] + 0.34,
          ]
        : [
            point.cartesian[0],
            point.cartesian[1],
            point.cartesian[2] + 0.2,
          ]

  const labelText =
    isBase && isImage
      ? 'BASE · IMAGE'
      : isBase
        ? 'BASE'
        : isImage
          ? 'IMAGE'
          : String(point.index)

  return (
    <group>
      <group
        ref={groupRef}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(point.index)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default'
        }}
      >
        <ChiralMotifMesh
          color={color}
          selected={emphasized}
          emissiveIntensity={isImage ? 0.85 : isBase ? 0.55 : 0.28}
        />
        {/* Persistent BASE accent ring */}
        {isBase && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.145, 0.014, 12, 48]} />
            <meshBasicMaterial color="#f8fafc" transparent opacity={0.95} />
          </mesh>
        )}
        {/* Selected IMAGE ring (yellow) — still shown when image === base */}
        {isImage && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[isBase ? 0.175 : 0.13, 0.012, 12, 48]} />
            <meshBasicMaterial color="#fef08a" transparent opacity={0.98} />
          </mesh>
        )}
      </group>

      {showLabel && (
        <Billboard position={labelPos}>
          <Text
            fontSize={isBase || isImage ? 0.085 : 0.07}
            color={isImage ? '#fef08a' : isBase ? '#f8fafc' : '#cbd5e1'}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.006}
            outlineColor="#0f172a"
          >
            {labelText}
          </Text>
        </Billboard>
      )}
    </group>
  )
}

const _qa = new THREE.Quaternion()
const _qb = new THREE.Quaternion()
const _qm = new THREE.Quaternion()

/** Remount with key={token} so each selection starts a fresh flight. */
function GhostAnimator({
  fromPos,
  toPos,
  fromR,
  toR,
  ghostColor,
  token,
}: {
  fromPos: Vec3
  toPos: Vec3
  fromR: Mat3
  toR: Mat3
  ghostColor: string
  token: number
}) {
  const groupRef = useRef<THREE.Group>(null)
  // Initialized from token on mount (parent remounts via key=token).
  const [active, setActive] = useState(() => token > 0)
  const progress = useRef(0)
  const startPos = useRef(fromPos)
  const endPos = useRef(toPos)
  const startOri = useRef(orientationFromR(fromR))
  const endOri = useRef(orientationFromR(toR))

  useFrame((_, dt) => {
    if (!active || !groupRef.current) return
    progress.current = Math.min(1, progress.current + dt * 1.25)
    const t = progress.current
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

    const x =
      startPos.current[0] + (endPos.current[0] - startPos.current[0]) * ease
    const y =
      startPos.current[1] + (endPos.current[1] - startPos.current[1]) * ease
    const z =
      startPos.current[2] +
      (endPos.current[2] - startPos.current[2]) * ease +
      Math.sin(Math.PI * ease) * 0.15

    groupRef.current.position.set(x, y, z)

    _qa.copy(startOri.current.quaternion)
    _qb.copy(endOri.current.quaternion)
    _qm.slerpQuaternions(_qa, _qb, ease)
    groupRef.current.quaternion.copy(_qm)

    const m0 = startOri.current.mirror ? -1 : 1
    const m1 = endOri.current.mirror ? -1 : 1
    const mx = m0 + (m1 - m0) * ease
    const sx = Math.abs(mx) < 0.05 ? (mx >= 0 ? 0.05 : -0.05) : mx
    const puff = 0.9 + 0.3 * Math.sin(Math.PI * ease)
    groupRef.current.scale.set(sx * puff, puff, puff)

    if (t >= 1) setActive(false)
  })

  if (token === 0) return null

  return (
    <group ref={groupRef} visible={active}>
      <ChiralMotifMesh
        color={ghostColor}
        emissiveIntensity={0.9}
        opacity={0.8}
        selected
      />
    </group>
  )
}


const BOUND_PADDING = 0.3
const FIT_MARGIN = 1.08
const USER_ZOOM_MIN = 0.6
const USER_ZOOM_MAX = 2.5
/** Camera look-from relative to cell-centred scene. Negative X/Z puts the
 * crystallographic origin (at −center) toward the front of the default view;
 * +Y keeps a slight elevated angle. */
const DEFAULT_CAM_DIR = new THREE.Vector3(-2.4, 1.55, -2.6).normalize()
const DEFAULT_CAM_POS: [number, number, number] = [
  DEFAULT_CAM_DIR.x * 4,
  DEFAULT_CAM_DIR.y * 4,
  DEFAULT_CAM_DIR.z * 4,
]

type SceneBounds = { center: THREE.Vector3; radius: number }

function sceneCenter(demo: SpaceGroupDemo, multiples: CellMultiples): Vec3 {
  if (isDefaultMultiples(multiples)) return cellCenterCart(demo.cell)
  return fracToCart(
    [multiples[0] / 2, multiples[1] / 2, multiples[2] / 2],
    demo.cell,
  )
}

function computeSceneBounds(
  demo: SpaceGroupDemo,
  visibleCartesians: Vec3[],
  multiples: CellMultiples = DEFAULT_MULTIPLES,
): SceneBounds {
  const centerCart = sceneCenter(demo, multiples)
  const ox = centerCart[0]
  const oy = centerCart[1]
  const oz = centerCart[2]
  const box = new THREE.Box3()
  for (const c of cellCornersCart(demo.cell)) {
    box.expandByPoint(new THREE.Vector3(c[0] - ox, c[1] - oy, c[2] - oz))
  }
  if (!isDefaultMultiples(multiples)) {
    const [na, nb, nc] = multiples
    for (const f of [
      [0, 0, 0], [na, 0, 0], [0, nb, 0], [0, 0, nc],
      [na, nb, 0], [na, 0, nc], [0, nb, nc], [na, nb, nc],
    ] as Vec3[]) {
      const c = fracToCart(f, demo.cell)
      box.expandByPoint(new THREE.Vector3(c[0] - ox, c[1] - oy, c[2] - oz))
    }
  }
  for (const p of visibleCartesians) {
    box.expandByPoint(new THREE.Vector3(p[0] - ox, p[1] - oy, p[2] - oz))
  }
  const center = new THREE.Vector3()
  const size = new THREE.Vector3()
  box.getCenter(center)
  box.getSize(size)
  // Sphere that covers the AABB, plus padding for motifs / labels.
  const radius = 0.5 * size.length() + BOUND_PADDING
  return { center, radius: Math.max(radius, 0.5) }
}

function fitDistanceForSphere(
  radius: number,
  fovDeg: number,
  aspect: number,
): number {
  const vFov = (fovDeg * Math.PI) / 180
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(aspect, 1e-6))
  const half = Math.min(Math.sin(vFov / 2), Math.sin(hFov / 2))
  return (radius / Math.max(half, 1e-6)) * FIT_MARGIN
}

/**
 * Keeps the full unit cell + visible sites framed while orbiting.
 * Scroll-wheel zoom adjusts a scale factor on the fit distance (not absolute).
 */
function FitCamera({
  bounds,
  controlsRef,
  userZoomRef,
  resetToken,
}: {
  bounds: SceneBounds
  controlsRef: RefObject<OrbitControlsImpl | null>
  userZoomRef: RefObject<number>
  resetToken: number
}) {
  const { camera, gl } = useThree()
  const appliedDir = useRef(DEFAULT_CAM_DIR.clone())
  const resetSeen = useRef(resetToken)

  useEffect(() => {
    const el = gl.domElement
    let pinchStartDist = 0
    let pinchStartZoom = 1

    const pinchDistance = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.hypot(dx, dy)
    }

    const clampZoom = (z: number) =>
      Math.min(USER_ZOOM_MAX, Math.max(USER_ZOOM_MIN, z))

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = Math.exp(e.deltaY * 0.0015)
      const z = userZoomRef.current ?? 1
      userZoomRef.current = clampZoom(z * factor)
    }

    // Two-finger pinch → same userZoomRef scale as wheel (FitCamera framing).
    // Capture + preventDefault so the browser / OrbitControls do not steal it.
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchStartDist = pinchDistance(e.touches)
        pinchStartZoom = userZoomRef.current ?? 1
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || pinchStartDist <= 0) return
      e.preventDefault()
      e.stopPropagation()
      const d = pinchDistance(e.touches)
      // Fingers apart → zoom in → smaller distance factor (closer camera).
      const factor = pinchStartDist / Math.max(d, 1e-6)
      userZoomRef.current = clampZoom(pinchStartZoom * factor)
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchStartDist = 0
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false, capture: true })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove, true)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [gl, userZoomRef])

  // Priority -2: run after drei OrbitControls (-1) so rotate angles stick,
  // then we only correct distance / target for framing.
  useFrame(() => {
    const controls = controlsRef.current
    if (!controls || !(camera instanceof THREE.PerspectiveCamera)) return

    if (resetSeen.current !== resetToken) {
      resetSeen.current = resetToken
      userZoomRef.current = 1
      appliedDir.current.copy(DEFAULT_CAM_DIR)
    }

    const { center, radius } = bounds
    controls.target.copy(center)

    const offset = new THREE.Vector3().subVectors(camera.position, controls.target)
    if (offset.lengthSq() > 1e-8) {
      appliedDir.current.copy(offset).normalize()
    }

    const dist =
      fitDistanceForSphere(radius, camera.fov, camera.aspect) *
      (userZoomRef.current ?? 1)

    camera.position.copy(controls.target).addScaledVector(appliedDir.current, dist)
    // Do not call controls.update() here — OrbitControls already ran this
    // frame; a second update would double-apply damping. Next frame it will
    // re-read spherical.radius from camera.position.
    camera.lookAt(controls.target)
  }, -2)

  return null
}

function SceneContent({
  demo,
  selectedIndex,
  animateToken,
  placementMode,
  showAllSites,
  multiples = DEFAULT_MULTIPLES,
  onSelect,
  controlsRef,
  userZoomRef,
  resetToken,
}: SceneProps & {
  onSelect: (index: number) => void
  controlsRef: RefObject<OrbitControlsImpl | null>
  userZoomRef: RefObject<number>
  resetToken: number
}) {
  const placement = useMemo(
    () => placedPositions(demo, selectedIndex, placementMode),
    [demo, selectedIndex, placementMode],
  )
  const { points, baseCartesian, imageCartesian } = placement
  const selected = points.find((p) => p.index === selectedIndex) ?? points[0]
  const identity = points.find((p) => p.index === 1) ?? points[0]

  const visiblePoints = useMemo(
    () =>
      points.filter(
        (p) =>
          showAllSites || p.index === 1 || p.index === selectedIndex,
      ),
    [points, showAllSites, selectedIndex],
  )

  const bounds = useMemo(
    () =>
      computeSceneBounds(
        demo,
        visiblePoints.map((p) => p.cartesian),
        multiples,
      ),
    [demo, visiblePoints, multiples],
  )
  const center = sceneCenter(demo, multiples)
  const supercell = !isDefaultMultiples(multiples)
  const replicas = useMemo(
    () =>
      supercell
        ? replicatePoints(visiblePoints, multiples, (f) =>
            fracToCart(f, demo.cell),
          ).filter((r) => r.t[0] || r.t[1] || r.t[2])
        : [],
    [supercell, visiblePoints, multiples, demo.cell],
  )

  return (
    <>
      <color attach="background" args={['#0b1220']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={1.15} />
      <directionalLight position={[-2, -1, 2]} intensity={0.4} />

      <FitCamera
        bounds={bounds}
        controlsRef={controlsRef}
        userZoomRef={userZoomRef}
        resetToken={resetToken}
      />

      <group position={[-center[0], -center[1], -center[2]]}>
        <UnitCellWireframe demo={demo} />
        {supercell && <SupercellWireframe demo={demo} multiples={multiples} />}
        {replicas.map((r) => (
          <ReplicaMarker
            key={`${r.t.join(',')}:${r.point.index}`}
            point={r.point}
            onSelect={onSelect}
          />
        ))}
        <SymmetryElements demo={demo} selectedIndex={selectedIndex} />
        <AxisLabels demo={demo} />
        <BaseImageConnector from={baseCartesian} to={imageCartesian} />
        {visiblePoints.map((p) => {
          const isBase = p.index === 1
          const isImage = p.index === selectedIndex
          // Hide numeric labels on non-BASE/non-IMAGE when focusing an op.
          const showLabel =
            isBase || isImage || selectedIndex === 1
          return (
            <PointMarker
              key={p.index}
              point={p}
              isBase={isBase}
              isImage={isImage}
              showLabel={showLabel}
              onSelect={onSelect}
            />
          )
        })}
        <GhostAnimator
          key={animateToken}
          fromPos={baseCartesian}
          toPos={imageCartesian}
          fromR={identity.operator.R}
          toR={selected.operator.R}
          ghostColor={selected.classColor}
          token={animateToken}
        />
      </group>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enableZoom={false}
        minDistance={0.4}
        maxDistance={40}
      />
    </>
  )
}

export default function UnitCellScene({
  demo,
  selectedIndex,
  animateToken,
  placementMode,
  showAllSites,
  multiples,
  onSelectPoint,
  resetToken,
}: SceneProps & {
  onSelectPoint: (index: number) => void
  resetToken: number
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const userZoomRef = useRef(1)

  useEffect(() => {
    userZoomRef.current = 1
    const ctrl = controlsRef.current
    if (!ctrl) return
    ctrl.target.set(0, 0, 0)
    ctrl.object.position.set(...DEFAULT_CAM_POS)
    ctrl.update()
  }, [resetToken])

  return (
    <Canvas
      camera={{ position: DEFAULT_CAM_POS, fov: 42, near: 0.1, far: 80 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <SceneContent
        demo={demo}
        selectedIndex={selectedIndex}
        animateToken={animateToken}
        placementMode={placementMode}
        showAllSites={showAllSites}
        multiples={multiples}
        onSelect={onSelectPoint}
        controlsRef={controlsRef}
        userZoomRef={userZoomRef}
        resetToken={resetToken}
      />
    </Canvas>
  )
}
