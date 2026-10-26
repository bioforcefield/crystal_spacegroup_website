import { useMemo } from 'react'
import { Line, Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { classColor, fracToCart } from '../data/math'
import type {
  GlidePlaneSpec,
  ScrewAxisSpec,
  SpaceGroupDemo,
  Vec3,
} from '../data/types'

const FAINT = 0.12
const EMPH_LINE = 0.95
const EMPH_PLANE = 0.26
const FAINT_PLANE = 0.08

interface Props {
  demo: SpaceGroupDemo
  selectedIndex: number
}

function cartAlong(
  demo: SpaceGroupDemo,
  originFrac: Vec3,
  dirFrac: Vec3,
  t0: number,
  t1: number,
): [Vec3, Vec3] {
  const a: Vec3 = [
    originFrac[0] + dirFrac[0] * t0,
    originFrac[1] + dirFrac[1] * t0,
    originFrac[2] + dirFrac[2] * t0,
  ]
  const b: Vec3 = [
    originFrac[0] + dirFrac[0] * t1,
    originFrac[1] + dirFrac[1] * t1,
    originFrac[2] + dirFrac[2] * t1,
  ]
  return [fracToCart(a, demo.cell), fracToCart(b, demo.cell)]
}

function ArrowHead({
  position,
  direction,
  color,
  opacity,
  scale = 1,
}: {
  position: Vec3
  direction: Vec3
  color: string
  opacity: number
  scale?: number
}) {
  const quat = useMemo(() => {
    const d = new THREE.Vector3(...direction)
    if (d.lengthSq() < 1e-10) return new THREE.Quaternion()
    d.normalize()
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)
    return q
  }, [direction])

  return (
    <mesh position={position} quaternion={quat}>
      <coneGeometry args={[0.028 * scale, 0.07 * scale, 10]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        emissive={color}
        emissiveIntensity={opacity > 0.5 ? 0.35 : 0.08}
        depthWrite={false}
      />
    </mesh>
  )
}

function ScrewAxisVisual({
  demo,
  axis,
  emphasized,
}: {
  demo: SpaceGroupDemo
  axis: ScrewAxisSpec
  emphasized: boolean
}) {
  const kind = axis.kind ?? '21'
  const color =
    kind === '2'
      ? classColor(demo, 'twofold')
      : kind === '3'
        ? classColor(demo, 'threefold')
        : kind === '4' || kind === 'bar4'
          ? classColor(demo, 'fourfold')
          : classColor(demo, 'screw')
  const opacity = emphasized ? EMPH_LINE : FAINT
  const lineWidth = emphasized ? 3.2 : 1.2
  const [p0, p1] = cartAlong(demo, axis.origin, axis.direction, 0, 1)

  const midFrac: Vec3 = [
    axis.origin[0] + axis.direction[0] * 0.5,
    axis.origin[1] + axis.direction[1] * 0.5,
    axis.origin[2] + axis.direction[2] * 0.5,
  ]
  const mid = fracToCart(midFrac, demo.cell)

  const tickCart: Vec3 =
    axis.direction[0] !== 0
      ? [0, 0.06, 0]
      : axis.direction[1] !== 0
        ? [0.06, 0, 0]
        : [0.06, 0, 0]
  const tickFrom: Vec3 = [
    mid[0] - tickCart[0],
    mid[1] - tickCart[1],
    mid[2] - tickCart[2],
  ]
  const tickTo: Vec3 = [
    mid[0] + tickCart[0],
    mid[1] + tickCart[1],
    mid[2] + tickCart[2],
  ]

  const axisCartDir: Vec3 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]
  const axisLen = Math.hypot(...axisCartDir) || 1
  const axisUnit: Vec3 = [
    axisCartDir[0] / axisLen,
    axisCartDir[1] / axisLen,
    axisCartDir[2] / axisLen,
  ]

  const headNear: Vec3 = [
    p0[0] + axisUnit[0] * axisLen * 0.92,
    p0[1] + axisUnit[1] * axisLen * 0.92,
    p0[2] + axisUnit[2] * axisLen * 0.92,
  ]
  const headFar: Vec3 = [
    p0[0] + axisUnit[0] * axisLen * 0.55,
    p0[1] + axisUnit[1] * axisLen * 0.55,
    p0[2] + axisUnit[2] * axisLen * 0.55,
  ]

  const radialGuess: Vec3 =
    Math.abs(axisUnit[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]
  const dot =
    radialGuess[0] * axisUnit[0] +
    radialGuess[1] * axisUnit[1] +
    radialGuess[2] * axisUnit[2]
  const rx = radialGuess[0] - axisUnit[0] * dot
  const ry = radialGuess[1] - axisUnit[1] * dot
  const rz = radialGuess[2] - axisUnit[2] * dot
  const rLen = Math.hypot(rx, ry, rz) || 1
  const r: Vec3 = [(rx / rLen) * 0.09, (ry / rLen) * 0.09, (rz / rLen) * 0.09]
  const cx = axisUnit[1] * r[2] - axisUnit[2] * r[1]
  const cy = axisUnit[2] * r[0] - axisUnit[0] * r[2]
  const cz = axisUnit[0] * r[1] - axisUnit[1] * r[0]
  const cLen = Math.hypot(cx, cy, cz) || 1
  const s: Vec3 = [(cx / cLen) * 0.09, (cy / cLen) * 0.09, (cz / cLen) * 0.09]

  const arcCenter: Vec3 = [
    p0[0] + axisUnit[0] * axisLen * 0.35,
    p0[1] + axisUnit[1] * axisLen * 0.35,
    p0[2] + axisUnit[2] * axisLen * 0.35,
  ]
  const arcSpan =
    kind === '3'
      ? (2 * Math.PI) / 3
      : kind === '4' || kind === '41' || kind === '43' || kind === 'bar4'
        ? Math.PI / 2
        : Math.PI
  const arcPts: Vec3[] = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const ang = arcSpan * t
    return [
      arcCenter[0] + r[0] * Math.cos(ang) + s[0] * Math.sin(ang),
      arcCenter[1] + r[1] * Math.cos(ang) + s[1] * Math.sin(ang),
      arcCenter[2] + r[2] * Math.cos(ang) + s[2] * Math.sin(ang),
    ]
  })

  const symbol =
    kind === '2'
      ? '2'
      : kind === '3'
        ? '3'
        : kind === '4'
          ? '4'
          : kind === '41'
            ? '4₁'
            : kind === '43'
              ? '4₃'
              : kind === 'bar4'
                ? '−4'
                : '2₁'

  return (
    <group>
      <Line
        points={[p0, p1]}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={opacity}
      />
      {emphasized && (
        <>
          <ArrowHead
            position={headNear}
            direction={axisUnit}
            color={color}
            opacity={opacity}
          />
          {(kind === '21' || kind === '41' || kind === '43') && (
            <ArrowHead
              position={headFar}
              direction={axisUnit}
              color={color}
              opacity={opacity * 0.85}
              scale={0.85}
            />
          )}
          <Line
            points={arcPts}
            color={color}
            lineWidth={2}
            transparent
            opacity={opacity * 0.9}
          />
          <ArrowHead
            position={arcPts[arcPts.length - 1]}
            direction={[
              arcPts[4][0] - arcPts[3][0],
              arcPts[4][1] - arcPts[3][1],
              arcPts[4][2] - arcPts[3][2],
            ]}
            color={color}
            opacity={opacity}
            scale={0.7}
          />
          {(kind === '21' || kind === '41' || kind === '43') && (
            <>
              <Line
                points={[tickFrom, tickTo]}
                color={color}
                lineWidth={2}
                transparent
                opacity={opacity}
              />
              <Billboard
                position={[
                  mid[0] + tickCart[0] * 1.8,
                  mid[1] + tickCart[1] * 1.8,
                  mid[2] + tickCart[2] * 1.8,
                ]}
              >
                <Text
                  fontSize={0.07}
                  color={color}
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.005}
                  outlineColor="#0f172a"
                >
                  {kind === '41' ? '¼' : kind === '43' ? '¾' : '½'}
                </Text>
              </Billboard>
            </>
          )}
          <Billboard
            position={[
              p0[0] + axisUnit[0] * axisLen * 0.08 + r[0] * 1.4,
              p0[1] + axisUnit[1] * axisLen * 0.08 + r[1] * 1.4,
              p0[2] + axisUnit[2] * axisLen * 0.08 + r[2] * 1.4,
            ]}
          >
            <Text
              fontSize={0.065}
              color={color}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.004}
              outlineColor="#0f172a"
            >
              {`${symbol} ${axis.locus}`}
            </Text>
          </Billboard>
        </>
      )}
    </group>
  )
}

function InversionCenterVisual({
  demo,
  position,
  emphasized,
}: {
  demo: SpaceGroupDemo
  position: Vec3
  emphasized: boolean
}) {
  const color = classColor(demo, 'inversion')
  const cart = fracToCart(position, demo.cell)
  const opacity = emphasized ? 0.95 : FAINT
  const radius = emphasized ? 0.048 : 0.032

  return (
    <mesh position={cart}>
      <octahedronGeometry args={[radius, 0]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        emissive={color}
        emissiveIntensity={emphasized ? 0.55 : 0.1}
        depthWrite={false}
      />
    </mesh>
  )
}

/** Parallelogram glide plane from four fractional corners. */
function GlidePlaneVisual({
  demo,
  plane,
  emphasized,
}: {
  demo: SpaceGroupDemo
  plane: GlidePlaneSpec
  emphasized: boolean
}) {
  const color = classColor(demo, plane.classId)
  const planeOpacity = emphasized ? EMPH_PLANE : FAINT_PLANE
  const lineOpacity = emphasized ? EMPH_LINE : FAINT
  const n = plane.normalAxis
  const v = plane.planeValue

  const fracCorners: Vec3[] =
    n === 0
      ? [
          [v, 0, 0],
          [v, 1, 0],
          [v, 1, 1],
          [v, 0, 1],
        ]
      : n === 1
        ? [
            [0, v, 0],
            [1, v, 0],
            [1, v, 1],
            [0, v, 1],
          ]
        : [
            [0, 0, v],
            [1, 0, v],
            [1, 1, v],
            [0, 1, v],
          ]

  const cell = demo.cell
  const corners = useMemo(
    () => fracCorners.map((p) => fracToCart(p, cell)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [n, v, cell.a, cell.b, cell.c, cell.betaDeg, cell.gammaDeg],
  )
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const verts = new Float32Array([
      ...corners[0],
      ...corners[1],
      ...corners[2],
      ...corners[0],
      ...corners[2],
      ...corners[3],
    ])
    g.setAttribute('position', new THREE.BufferAttribute(verts, 3))
    g.computeVertexNormals()
    return g
  }, [corners])

  const center: Vec3 = [
    (corners[0][0] + corners[2][0]) / 2,
    (corners[0][1] + corners[2][1]) / 2,
    (corners[0][2] + corners[2][2]) / 2,
  ]
  const border: Vec3[] = [...corners, corners[0]]

  const hasGlide = plane.glide.some((c) => Math.abs(c) > 1e-6)
  const glideCart = fracToCart(plane.glide, demo.cell)
  // Lift slightly along plane normal (approx y for ⊥b)
  const lift = 0.025
  const liftVec: Vec3 =
    n === 0 ? [lift, 0, 0] : n === 1 ? [0, lift, 0] : [0, 0, lift]
  const arrowFrom: Vec3 = [
    center[0] - glideCart[0] * 0.35 + liftVec[0],
    center[1] - glideCart[1] * 0.35 + liftVec[1],
    center[2] - glideCart[2] * 0.35 + liftVec[2],
  ]
  const arrowTo: Vec3 = [
    arrowFrom[0] + glideCart[0] * 0.7,
    arrowFrom[1] + glideCart[1] * 0.7,
    arrowFrom[2] + glideCart[2] * 0.7,
  ]
  const glideDir: Vec3 = [
    arrowTo[0] - arrowFrom[0],
    arrowTo[1] - arrowFrom[1],
    arrowTo[2] - arrowFrom[2],
  ]
  const labelPos: Vec3 = [
    center[0] + liftVec[0] * 3,
    center[1] + liftVec[1] * 3,
    center[2] + liftVec[2] * 3,
  ]

  return (
    <group>
      <mesh geometry={geom}>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={planeOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
          emissive={color}
          emissiveIntensity={emphasized ? 0.15 : 0.03}
        />
      </mesh>
      {emphasized && (
        <Line
          points={border}
          color={color}
          lineWidth={1.5}
          transparent
          opacity={lineOpacity * 0.7}
        />
      )}
      {hasGlide && (
        <Line
          points={[arrowFrom, arrowTo]}
          color={color}
          lineWidth={emphasized ? 2.4 : 1}
          transparent
          opacity={lineOpacity}
          dashed
          dashSize={0.05}
          gapSize={0.035}
          dashScale={1}
        />
      )}
      {emphasized && (
        <>
          <ArrowHead
            position={arrowTo}
            direction={glideDir}
            color={color}
            opacity={lineOpacity}
          />
          <Billboard position={labelPos}>
            <Text
              fontSize={0.07}
              color={color}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.005}
              outlineColor="#0f172a"
            >
              {plane.label}
            </Text>
          </Billboard>
        </>
      )}
    </group>
  )
}

export default function SymmetryElements({ demo, selectedIndex }: Props) {
  const selected = demo.operators.find((o) => o.index === selectedIndex)
  const classId = selected?.classId ?? 'identity'

  return (
    <group>
      {demo.inversionCenters.map((c) => (
        <InversionCenterVisual
          key={c.locus}
          demo={demo}
          position={c.position}
          emphasized={
            classId === 'inversion' &&
            (selectedIndex === demo.primaryInversionOp
              ? c.primary
              : Math.abs(c.position[0] - (selected?.t[0] ?? 0) / 2) < 0.01 &&
                Math.abs(c.position[1] - (selected?.t[1] ?? 0) / 2) < 0.01 &&
                Math.abs(c.position[2] - (selected?.t[2] ?? 0) / 2) < 0.01)
          }
        />
      ))}

      {demo.screwAxes.map((axis) => {
        const emphasized =
          (classId === 'screw' ||
            classId === 'twofold' ||
            classId === 'threefold' ||
            classId === 'fourfold') &&
          axis.opIndex === selectedIndex &&
          axis.primary
        return (
          <ScrewAxisVisual
            key={`${axis.opIndex}-${axis.locus}`}
            demo={demo}
            axis={axis}
            emphasized={emphasized}
          />
        )
      })}

      {demo.glidePlanes.map((plane) => {
        const emphasized =
          plane.opIndex === selectedIndex && plane.primary
        return (
          <GlidePlaneVisual
            key={`${plane.opIndex}-${plane.locus}`}
            demo={demo}
            plane={plane}
            emphasized={emphasized}
          />
        )
      })}
    </group>
  )
}
