import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { ChiralMotifMesh } from '../ChiralMotif'
import {
  getMotifModel,
  MOTIF_BODY_BASE,
  MOTIF_PART_COLORS,
  type MotifPart,
} from './motifGeometry'
import type { MotifStyleId } from './motifStyles'

/** Body tint: cream mixed toward the symmetry-class colour (legend semantics). */
export const BODY_CLASS_TINT = 0.55

export function tintedBodyColor(classColor: string, t = BODY_CLASS_TINT): string {
  return new THREE.Color(MOTIF_BODY_BASE).lerp(new THREE.Color(classColor), t).getHexString()
}

// Feature materials are shared across all instances (one per part × opacity).
const featureMaterials = new Map<string, THREE.MeshStandardMaterial>()
function featureMaterial(part: Exclude<MotifPart, 'body'>, opacity: number) {
  const key = `${part}:${opacity}`
  let m = featureMaterials.get(key)
  if (!m) {
    const col = MOTIF_PART_COLORS[part]
    m = new THREE.MeshStandardMaterial({
      color: col,
      emissive: col,
      emissiveIntensity: part === 'eye' ? 0 : part === 'white' ? 0.6 : 0.22,
      roughness: part === 'eye' ? 0.25 : 0.45,
      metalness: 0.05,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1,
    })
    featureMaterials.set(key, m)
  }
  return m
}

export interface MotifMeshProps {
  style: MotifStyleId
  /** Symmetry-class colour (same semantics as the classic motif). */
  color: string
  emissiveIntensity?: number
  opacity?: number
  selected?: boolean
}

/**
 * One chiral motif in its OBJECT frame. Callers place it inside a group that
 * carries the operation's full linear map (quaternion + scale.x = ±1).
 * `classic` renders the original ChiralMotifMesh unchanged.
 */
export default function MotifMesh({
  style,
  color,
  emissiveIntensity = 0.3,
  opacity = 1,
  selected = false,
}: MotifMeshProps) {
  if (style === 'classic') {
    return (
      <ChiralMotifMesh
        color={color}
        emissiveIntensity={emissiveIntensity}
        opacity={opacity}
        selected={selected}
      />
    )
  }
  return (
    <StyledMotif
      style={style}
      color={color}
      emissiveIntensity={emissiveIntensity}
      opacity={opacity}
      selected={selected}
    />
  )
}

function StyledMotif({
  style,
  color,
  emissiveIntensity,
  opacity,
  selected,
}: Required<MotifMeshProps> & { style: Exclude<MotifStyleId, 'classic'> }) {
  const model = getMotifModel(style)
  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: `#${tintedBodyColor(color)}`,
        emissive: color,
        // Classic scale is 0.18–0.9; keep the body readable, not glowing.
        emissiveIntensity: Math.min(0.55, emissiveIntensity * 0.6),
        roughness: 0.55,
        metalness: 0.02,
        transparent: opacity < 1,
        opacity,
        depthWrite: opacity >= 1,
      }),
    [color, emissiveIntensity, opacity],
  )
  useEffect(() => () => bodyMat.dispose(), [bodyMat])
  // Uniform emphasis only — never changes handedness or placement.
  const s = selected ? 1.08 : 1
  return (
    <group scale={[s, s, s]}>
      {model.parts.map(({ part, geometry }) => (
        <mesh
          key={part}
          geometry={geometry}
          material={part === 'body' ? bodyMat : featureMaterial(part, opacity)}
        />
      ))}
    </group>
  )
}
