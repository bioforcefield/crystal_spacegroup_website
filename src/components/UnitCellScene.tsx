import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line, Text, Billboard } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { CELL, type GeneralPoint, type Mat3, type Vec3 } from '../data/pbca'
import {
  placedPositions,
  type PlacementMode,
} from '../data/nearestImages'
import { ChiralMotifMesh, orientationFromR } from './ChiralMotif'
import SymmetryElements from './SymmetryElements'

interface SceneProps {
  selectedIndex: number
  animateToken: number
  placementMode: PlacementMode
}

function UnitCellWireframe() {
  const { a, b, c } = CELL
  const corners: Vec3[] = [
    [0, 0, 0],
    [a, 0, 0],
    [a, b, 0],
    [0, b, 0],
    [0, 0, c],
    [a, 0, c],
    [a, b, c],
    [0, b, c],
  ]
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
      <Billboard position={[-0.08, -0.08, -0.08]}>
        <Text
          fontSize={0.11}
          color="#e2e8f0"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#0f172a"
        >
          0
        </Text>
      </Billboard>
    </group>
  )
}

function AxisLabels() {
  const { a, b, c } = CELL
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
  return (
    <group>
      {label('a', [a + 0.12, 0, 0], '#f87171')}
      {label('b', [0, b + 0.12, 0], '#4ade80')}
      {label('c', [0, 0, c + 0.12], '#60a5fa')}
      <Line points={[[0, 0, 0], [a * 0.25, 0, 0]]} color="#f87171" lineWidth={2} />
      <Line points={[[0, 0, 0], [0, b * 0.25, 0]]} color="#4ade80" lineWidth={2} />
      <Line points={[[0, 0, 0], [0, 0, c * 0.25]]} color="#60a5fa" lineWidth={2} />
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
  onSelect,
}: {
  point: GeneralPoint
  isBase: boolean
  isImage: boolean
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

      <Billboard
        position={[
          point.cartesian[0],
          point.cartesian[1],
          point.cartesian[2] + (isBase ? 0.26 : 0.2),
        ]}
      >
        <Text
          fontSize={isBase || isImage ? 0.085 : 0.07}
          color={isImage ? '#fef08a' : isBase ? '#f8fafc' : '#cbd5e1'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.006}
          outlineColor="#0f172a"
        >
          {isBase ? (isImage ? `${point.index} · BASE` : `BASE`) : String(point.index)}
        </Text>
      </Billboard>
      {isImage && !isBase && (
        <Billboard
          position={[
            point.cartesian[0],
            point.cartesian[1],
            point.cartesian[2] + 0.32,
          ]}
        >
          <Text
            fontSize={0.07}
            color="#fef08a"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.005}
            outlineColor="#0f172a"
          >
            IMAGE
          </Text>
        </Billboard>
      )}
    </group>
  )
}

const _qa = new THREE.Quaternion()
const _qb = new THREE.Quaternion()
const _qm = new THREE.Quaternion()

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
  const [active, setActive] = useState(false)
  const progress = useRef(0)
  const startPos = useRef(fromPos)
  const endPos = useRef(toPos)
  const startOri = useRef(orientationFromR(fromR))
  const endOri = useRef(orientationFromR(toR))

  useEffect(() => {
    if (token === 0) return
    startPos.current = fromPos
    endPos.current = toPos
    startOri.current = orientationFromR(fromR)
    endOri.current = orientationFromR(toR)
    progress.current = 0
    setActive(true)
  }, [token, fromPos, toPos, fromR, toR])

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

  if (!active && token === 0) return null

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

function SceneContent({
  selectedIndex,
  animateToken,
  placementMode,
  onSelect,
  controlsRef,
}: SceneProps & {
  onSelect: (index: number) => void
  controlsRef: RefObject<OrbitControlsImpl | null>
}) {
  const placement = useMemo(
    () => placedPositions(selectedIndex, placementMode),
    [selectedIndex, placementMode],
  )
  const { points, baseCartesian, imageCartesian } = placement
  const selected = points.find((p) => p.index === selectedIndex) ?? points[0]
  const identity = points.find((p) => p.index === 1) ?? points[0]

  return (
    <>
      <color attach="background" args={['#0b1220']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={1.15} />
      <directionalLight position={[-2, -1, 2]} intensity={0.4} />

      <group position={[-CELL.a / 2, -CELL.b / 2, -CELL.c / 2]}>
        <UnitCellWireframe />
        <SymmetryElements selectedIndex={selectedIndex} />
        <AxisLabels />
        <BaseImageConnector from={baseCartesian} to={imageCartesian} />
        {points.map((p) => (
          <PointMarker
            key={p.index}
            point={p}
            isBase={p.index === 1}
            isImage={p.index === selectedIndex}
            onSelect={onSelect}
          />
        ))}
        <GhostAnimator
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
        minDistance={1.2}
        maxDistance={8}
      />
    </>
  )
}

export default function UnitCellScene({
  selectedIndex,
  animateToken,
  placementMode,
  onSelectPoint,
  resetToken,
}: SceneProps & {
  onSelectPoint: (index: number) => void
  resetToken: number
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)

  useEffect(() => {
    const ctrl = controlsRef.current
    if (!ctrl) return
    ctrl.reset()
    ctrl.target.set(0, 0, 0)
    ctrl.object.position.set(2.4, 1.9, 2.6)
    ctrl.update()
  }, [resetToken])

  return (
    <Canvas
      camera={{ position: [2.4, 1.9, 2.6], fov: 42, near: 0.1, far: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <SceneContent
        selectedIndex={selectedIndex}
        animateToken={animateToken}
        placementMode={placementMode}
        onSelect={onSelectPoint}
        controlsRef={controlsRef}
      />
    </Canvas>
  )
}
