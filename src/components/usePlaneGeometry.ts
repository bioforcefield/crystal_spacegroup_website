import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { Vec3 } from '../data/types'

/** Triangle-fan BufferGeometry of a convex polygon (Cartesian corners). */
export function planeGeometry(corners: Vec3[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  const verts: number[] = []
  for (let i = 1; i + 1 < corners.length; i++) verts.push(...corners[0], ...corners[i], ...corners[i + 1])
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3))
  g.computeVertexNormals()
  return g
}

/**
 * Polygon geometry owned by the component: R3F does not dispose a geometry
 * passed as a prop, so the previous one is disposed when the polygon changes
 * (new selection / Near ⇄ Wrap) and on unmount.
 */
export function usePlaneGeometry(corners: Vec3[]): THREE.BufferGeometry {
  const g = useMemo(() => planeGeometry(corners), [corners])
  useEffect(() => () => g.dispose(), [g])
  return g
}
