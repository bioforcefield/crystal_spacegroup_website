import { Billboard, Line, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { Vec3 } from '../../data/types'

export interface SceneAnnotations {
  /** Picked-atom marker positions (Cartesian). */
  markers: { pos: Vec3; r: number; color: string }[]
  /** Dashed polylines (distance lines, angle arcs, torsion chains). */
  lines: { points: Vec3[]; color: string; dashed?: boolean; width?: number }[]
  labels: { pos: Vec3; text: string; color: string }[]
  /** Symmetry element for a molecule pair. */
  element?:
    | { kind: 'point'; p: Vec3; color: string }
    | { kind: 'line'; a: Vec3; b: Vec3; color: string }
    | { kind: 'plane'; center: Vec3; normal: Vec3; size: number; color: string }
    | null
}

function Plane({ center, normal, size, color }: { center: Vec3; normal: Vec3; size: number; color: string }) {
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(...normal).normalize(),
  )
  return (
    <mesh position={center} quaternion={q} raycast={() => null}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial color={color} transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}

export default function MeasureOverlay({ ann }: { ann: SceneAnnotations }) {
  const el = ann.element
  return (
    <group>
      {ann.markers.map((m, i) => (
        <mesh key={`m${i}`} position={m.pos} raycast={() => null}>
          <sphereGeometry args={[m.r, 16, 12]} />
          <meshBasicMaterial color={m.color} wireframe transparent opacity={0.9} />
        </mesh>
      ))}
      {ann.lines.map((l, i) =>
        l.points.length >= 2 ? (
          <Line
            key={`l${i}`}
            points={l.points}
            color={l.color}
            lineWidth={l.width ?? 2}
            dashed={l.dashed ?? true}
            dashSize={0.18}
            gapSize={0.12}
            depthTest={false}
            renderOrder={10}
            raycast={() => null}
          />
        ) : null,
      )}
      {ann.labels.map((l, i) => (
        <Billboard key={`t${i}`} position={l.pos}>
          <Text
            fontSize={0.42}
            color={l.color}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#0f172a"
            renderOrder={11}
            material-depthTest={false}
          >
            {l.text}
          </Text>
        </Billboard>
      ))}
      {el?.kind === 'point' && (
        <group position={el.p}>
          <mesh raycast={() => null}>
            <sphereGeometry args={[0.32, 20, 16]} />
            <meshBasicMaterial color={el.color} />
          </mesh>
          <mesh raycast={() => null}>
            <sphereGeometry args={[0.55, 20, 16]} />
            <meshBasicMaterial color={el.color} transparent opacity={0.25} depthWrite={false} />
          </mesh>
        </group>
      )}
      {el?.kind === 'line' && (
        <Line points={[el.a, el.b]} color={el.color} lineWidth={4} raycast={() => null} />
      )}
      {el?.kind === 'plane' && <Plane {...el} />}
    </group>
  )
}
