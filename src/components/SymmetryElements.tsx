import { useMemo } from 'react'
import { Line, Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import {
  CELL,
  OPERATORS,
  fracToCart,
  classColor,
  type Vec3,
} from '../data/pbca'
import {
  SCREW_AXES,
  INVERSION_CENTERS,
  GLIDE_PLANES,
  type ScrewAxisSpec,
  type GlidePlaneSpec,
} from '../data/symmetryElements'

const FAINT = 0.12
const EMPH_LINE = 0.95
const EMPH_PLANE = 0.26
const FAINT_PLANE = 0.08

interface Props {
  selectedIndex: number
}

function cartAlong(
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
  return [fracToCart(a), fracToCart(b)]
}

/** Small cone arrowhead oriented along `direction`. */
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
  axis,
  emphasized,
}: {
  axis: ScrewAxisSpec
  emphasized: boolean
}) {
  const color = classColor('screw')
  const opacity = emphasized ? EMPH_LINE : FAINT
  const lineWidth = emphasized ? 3.2 : 1.2
  const [p0, p1] = cartAlong(axis.origin, axis.direction, 0, 1)

  const midFrac: Vec3 = [
    axis.origin[0] + axis.direction[0] * 0.5,
    axis.origin[1] + axis.direction[1] * 0.5,
    axis.origin[2] + axis.direction[2] * 0.5,
  ]
  const mid = fracToCart(midFrac)

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

  // Radial basis ⊥ axis for the half-turn arc cue
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
  const arcPts: Vec3[] = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const ang = Math.PI * t
    return [
      arcCenter[0] + r[0] * Math.cos(ang) + s[0] * Math.sin(ang),
      arcCenter[1] + r[1] * Math.cos(ang) + s[1] * Math.sin(ang),
      arcCenter[2] + r[2] * Math.cos(ang) + s[2] * Math.sin(ang),
    ]
  })

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
          <ArrowHead
            position={headFar}
            direction={axisUnit}
            color={color}
            opacity={opacity * 0.85}
            scale={0.85}
          />
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
              ½
            </Text>
          </Billboard>
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
              {`2₁ ${axis.locus}`}
            </Text>
          </Billboard>
        </>
      )}
    </group>
  )
}

function InversionCenterVisual({
  position,
  emphasized,
}: {
  position: Vec3
  emphasized: boolean
}) {
  const color = classColor('inversion')
  const cart = fracToCart(position)
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

function planeBorderPoints(
  n: 0 | 1 | 2,
  constCart: number,
  a: number,
  b: number,
  c: number,
): Vec3[] {
  if (n === 0) {
    return [
      [constCart, 0, 0],
      [constCart, b, 0],
      [constCart, b, c],
      [constCart, 0, c],
      [constCart, 0, 0],
    ]
  }
  if (n === 1) {
    return [
      [0, constCart, 0],
      [a, constCart, 0],
      [a, constCart, c],
      [0, constCart, c],
      [0, constCart, 0],
    ]
  }
  return [
    [0, 0, constCart],
    [a, 0, constCart],
    [a, b, constCart],
    [0, b, constCart],
    [0, 0, constCart],
  ]
}

function GlidePlaneVisual({
  plane,
  emphasized,
}: {
  plane: GlidePlaneSpec
  emphasized: boolean
}) {
  const color = classColor(plane.classId)
  const planeOpacity = emphasized ? EMPH_PLANE : FAINT_PLANE
  const lineOpacity = emphasized ? EMPH_LINE : FAINT

  const { a, b, c } = CELL
  const n = plane.normalAxis
  const constCart =
    n === 0
      ? plane.planeValue * a
      : n === 1
        ? plane.planeValue * b
        : plane.planeValue * c

  const rotation: Vec3 =
    n === 0 ? [0, Math.PI / 2, 0] : n === 1 ? [-Math.PI / 2, 0, 0] : [0, 0, 0]

  const size: [number, number] =
    n === 0 ? [c, b] : n === 1 ? [a, c] : [a, b]

  const center: Vec3 =
    n === 0
      ? [constCart, b / 2, c / 2]
      : n === 1
        ? [a / 2, constCart, c / 2]
        : [a / 2, b / 2, constCart]

  const glideCart = fracToCart(plane.glide)
  const lift = 0.02
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
      <mesh position={center} rotation={rotation}>
        <planeGeometry args={size} />
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
          points={planeBorderPoints(n, constCart, a, b, c)}
          color={color}
          lineWidth={1.5}
          transparent
          opacity={lineOpacity * 0.7}
        />
      )}
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

/**
 * Draws Pbca symmetry elements: selected operator emphasized,
 * all other elements faint for teaching context.
 */
export default function SymmetryElements({ selectedIndex }: Props) {
  const selected = OPERATORS.find((o) => o.index === selectedIndex)
  const classId = selected?.classId ?? 'identity'

  return (
    <group>
      {INVERSION_CENTERS.map((c) => (
        <InversionCenterVisual
          key={c.locus}
          position={c.position}
          emphasized={classId === 'inversion' && c.primary}
        />
      ))}

      {SCREW_AXES.map((axis) => {
        const emphasized =
          classId === 'screw' &&
          axis.opIndex === selectedIndex &&
          axis.primary
        return (
          <ScrewAxisVisual
            key={`${axis.opIndex}-${axis.locus}`}
            axis={axis}
            emphasized={emphasized}
          />
        )
      })}

      {GLIDE_PLANES.map((plane) => {
        const emphasized =
          plane.opIndex === selectedIndex && plane.primary
        return (
          <GlidePlaneVisual
            key={`${plane.opIndex}-${plane.locus}`}
            plane={plane}
            emphasized={emphasized}
          />
        )
      })}
    </group>
  )
}
