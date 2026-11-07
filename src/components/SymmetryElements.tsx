/**
 * 3D symmetry-element overlay. Every axis / plane / centre is derived from
 * the exact classification (elementGeometry); the emphasised element is the
 * one of the copy actually shown, i.e. the same axis / plane / centre the
 * ghost path uses. Stored screwAxes / glidePlanes are not drawn.
 */
import { useMemo } from 'react'
import { usePlaneGeometry } from './usePlaneGeometry'
import { Line, Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { fracToCart } from '../data/math'
import { elementOverlay } from '../data/elementSelection'
import type { DisplayElement } from '../data/elementGeometry'
import type { PlacementMode } from '../data/nearestImages'
import type { CellParams, Mat3, SpaceGroupDemo, Vec3 } from '../data/types'

const FAINT = 0.22
const EMPH_LINE = 0.95
const EMPH_PLANE = 0.26
const FAINT_PLANE = 0.1

interface Props {
  demo: SpaceGroupDemo
  selectedIndex: number
  placementMode?: PlacementMode
  /** Draw only the emphasized (selected-op) element. */
  onlySelected?: boolean
  /** Soften overlays when drawn over dense molecular content (Lattice Lab). */
  soft?: boolean
  /** CIF map: the selected operation's own Seitz pair (its index may not match the demo's list). */
  selectedSeitz?: { R: Mat3; t: Vec3 }
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const addV = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scl = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2])
const unit = (a: Vec3): Vec3 => scl(a, 1 / (len(a) || 1))
const crossV = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

function ArrowHead({ position, direction, color, opacity, scale = 1 }: { position: Vec3; direction: Vec3; color: string; opacity: number; scale?: number }) {
  const quat = useMemo(() => {
    const d = new THREE.Vector3(...direction)
    const q = new THREE.Quaternion()
    if (d.lengthSq() < 1e-10) return q
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())
    return q
  }, [direction])
  return (
    <mesh position={position} quaternion={quat}>
      <coneGeometry args={[0.028 * scale, 0.07 * scale, 10]} />
      <meshStandardMaterial color={color} transparent opacity={opacity} emissive={color} emissiveIntensity={opacity > 0.5 ? 0.35 : 0.08} depthWrite={false} />
    </mesh>
  )
}

function Label({ position, color, text }: { position: Vec3; color: string; text: string }) {
  return (
    <Billboard position={position}>
      <Text fontSize={0.065} color={color} anchorX="center" anchorY="middle" outlineWidth={0.004} outlineColor="#0f172a">
        {text}
      </Text>
    </Billboard>
  )
}

function AxisVisual({ el, cell, emphasized, opacityScale }: { el: DisplayElement; cell: CellParams; emphasized: boolean; opacityScale: number }) {
  if (el.geom.type !== 'axis') return null
  const c = el.cls
  const p0 = fracToCart(el.geom.p0, cell)
  const p1 = fracToCart(el.geom.p1, cell)
  // Orient along the classification's axis u so the turn arc shows its real sense.
  const uCart = unit(fracToCart(el.geom.dir, cell))
  const along = len(sub(p1, p0))
  const flip = (p1[0] - p0[0]) * uCart[0] + (p1[1] - p0[1]) * uCart[1] + (p1[2] - p0[2]) * uCart[2] < 0
  const a = flip ? p1 : p0
  const opacity = (emphasized ? EMPH_LINE : FAINT) * opacityScale
  const color = el.color
  const radialGuess: Vec3 = Math.abs(uCart[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]
  const r = scl(unit(sub(radialGuess, scl(uCart, radialGuess[0] * uCart[0] + radialGuess[1] * uCart[1] + radialGuess[2] * uCart[2]))), 0.09)
  const s = scl(unit(crossV(uCart, r)), 0.09)
  const arcCenter = addV(a, scl(uCart, along * 0.35))
  const turn = (2 * Math.PI) / Math.max(1, c.order)
  const sign = c.sense === '-' ? -1 : 1
  const arcPts: Vec3[] = [0, 0.25, 0.5, 0.75, 1].map((t) => addV(arcCenter, addV(scl(r, Math.cos(sign * turn * t)), scl(s, Math.sin(sign * turn * t)))))
  const screw = c.kind === 'screw'
  const mid = addV(a, scl(uCart, along * 0.5))
  return (
    <group>
      <Line points={[p0, p1]} color={color} lineWidth={emphasized ? 3.2 : 1.2} transparent opacity={opacity} dashed={c.kind === 'rotoinversion' && !emphasized} dashSize={0.05} gapSize={0.03} />
      {emphasized && (
        <>
          <Line points={arcPts} color={color} lineWidth={2} transparent opacity={opacity * 0.9} />
          <ArrowHead position={arcPts[4]} direction={sub(arcPts[4], arcPts[3])} color={color} opacity={opacity} scale={0.7} />
          {screw && <ArrowHead position={addV(a, scl(uCart, along * 0.9))} direction={uCart} color={color} opacity={opacity} />}
          {(el.centre ? [el.centre] : el.members.filter((m) => m.centre).map((m) => m.centre!)).map((ctr, i) => (
            <mesh key={i} position={fracToCart(ctr, cell)}>
              <octahedronGeometry args={[0.04, 0]} />
              <meshStandardMaterial color={color} transparent opacity={opacity} emissive={color} emissiveIntensity={0.5} depthWrite={false} />
            </mesh>
          ))}
          <Label position={addV(mid, scl(r, 1.6))} color={color} text={`${el.symbol} ${c.locus}`} />
        </>
      )}
    </group>
  )
}

function PlaneVisual({ el, cell, emphasized, opacityScale }: { el: DisplayElement; cell: CellParams; emphasized: boolean; opacityScale: number }) {
  const poly = el.geom.type === 'plane' ? el.geom.poly : null
  const corners = useMemo(() => (poly ? poly.map((p) => fracToCart(p, cell)) : []), [poly, cell])
  const geom = usePlaneGeometry(corners)
  if (!poly) return null
  const color = el.color
  const planeOpacity = (emphasized ? EMPH_PLANE : FAINT_PLANE) * opacityScale
  const lineOpacity = (emphasized ? EMPH_LINE : FAINT) * opacityScale
  const center = scl(corners.reduce((s, p) => addV(s, p), [0, 0, 0] as Vec3), 1 / corners.length)
  // Emphasised: the shown copy's actual slide (what the ghost does); context: the element glide.
  const slide = emphasized ? el.cls.intrinsicRaw : (el.glide ?? [0, 0, 0])
  const glideCart = fracToCart(slide as Vec3, cell)
  const hasGlide = len(glideCart) > 1e-6
  const nCart = unit(crossV(sub(corners[1], corners[0]), sub(corners[2], corners[0])))
  const lift = scl(nCart, 0.025)
  const from = addV(addV(center, scl(glideCart, -0.35)), lift)
  const to = addV(from, scl(glideCart, 0.7))
  return (
    <group>
      <mesh geometry={geom}>
        <meshStandardMaterial color={color} transparent opacity={planeOpacity} side={THREE.DoubleSide} depthWrite={false} emissive={color} emissiveIntensity={emphasized ? 0.15 : 0.03} />
      </mesh>
      {emphasized && <Line points={[...corners, corners[0]]} color={color} lineWidth={1.5} transparent opacity={lineOpacity * 0.7} />}
      {hasGlide && (emphasized || el.cls.kind === 'glide') && (
        <Line points={[from, to]} color={color} lineWidth={emphasized ? 2.4 : 1} transparent opacity={lineOpacity} dashed dashSize={0.05} gapSize={0.035} />
      )}
      {emphasized && (
        <>
          {hasGlide && <ArrowHead position={to} direction={sub(to, from)} color={color} opacity={lineOpacity} />}
          <Label position={addV(center, scl(lift, 3))} color={color} text={`${el.symbol} ${el.cls.locus}`} />
        </>
      )}
    </group>
  )
}

function PointVisual({ el, cell, emphasized, opacityScale }: { el: DisplayElement; cell: CellParams; emphasized: boolean; opacityScale: number }) {
  if (el.geom.type !== 'point') return null
  const opacity = (emphasized ? 0.95 : FAINT) * opacityScale
  const pos = fracToCart(el.geom.pos, cell)
  return (
    <group>
      <mesh position={pos}>
        <octahedronGeometry args={[emphasized ? 0.048 : 0.03, 0]} />
        <meshStandardMaterial color={el.color} transparent opacity={opacity} emissive={el.color} emissiveIntensity={emphasized ? 0.55 : 0.1} depthWrite={false} />
      </mesh>
      {emphasized && <Label position={addV(pos, [0, 0.1, 0])} color={el.color} text={`${el.symbol} ${el.cls.locus}`} />}
    </group>
  )
}

function ElementVisual(props: { el: DisplayElement; cell: CellParams; emphasized: boolean; opacityScale: number }) {
  const t = props.el.geom.type
  return t === 'axis' ? <AxisVisual {...props} /> : t === 'plane' ? <PlaneVisual {...props} /> : <PointVisual {...props} />
}

export default function SymmetryElements({ demo, selectedIndex, placementMode = 'nearest', soft = false, onlySelected = false, selectedSeitz }: Props) {
  const overlay = useMemo(
    () => elementOverlay(demo, selectedIndex, placementMode, selectedSeitz),
    [demo, selectedIndex, placementMode, selectedSeitz],
  )
  const opacityScale = soft ? 0.72 : 1
  return (
    <group name="symmetry-elements">
      {!onlySelected &&
        overlay.context.map((el) => (
          <ElementVisual key={el.key} el={el} cell={demo.cell} emphasized={false} opacityScale={opacityScale} />
        ))}
      {overlay.selected && (
        <ElementVisual key={`sel:${overlay.selected.key}`} el={overlay.selected} cell={demo.cell} emphasized opacityScale={opacityScale} />
      )}
    </group>
  )
}
