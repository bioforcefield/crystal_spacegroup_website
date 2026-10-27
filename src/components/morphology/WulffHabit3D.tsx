import { Canvas } from '@react-three/fiber'
import { OrbitControls, Line } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import {
  wulffPolyhedron3D,
  type FaceSpec3D,
} from '../../data/morphology/wulff3d'

function HabitMesh({ faces }: { faces: FaceSpec3D[] }) {
  const result = useMemo(() => wulffPolyhedron3D(faces), [faces])

  const geom = useMemo(() => {
    if (!result.triangles.length || !result.vertices.length) return null
    const positions: number[] = []
    for (const [a, b, c] of result.triangles) {
      const va = result.vertices[a]!
      const vb = result.vertices[b]!
      const vc = result.vertices[c]!
      positions.push(va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    )
    g.computeVertexNormals()
    return g
  }, [result])

  const edgePoints = useMemo(() => {
    return result.edges.map((e) => {
      const a = result.vertices[e.a]!
      const b = result.vertices[e.b]!
      return [
        new THREE.Vector3(a.x, a.y, a.z),
        new THREE.Vector3(b.x, b.y, b.z),
      ] as [THREE.Vector3, THREE.Vector3]
    })
  }, [result])

  const scale = useMemo(() => {
    if (!result.vertices.length) return 1
    let m = 0
    for (const v of result.vertices) {
      m = Math.max(m, Math.hypot(v.x, v.y, v.z))
    }
    return m > 1e-6 ? 1.6 / m : 1
  }, [result])

  return (
    <group scale={scale}>
      {geom ? (
        <mesh geometry={geom}>
          <meshStandardMaterial
            color="#38bdf8"
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ) : null}
      {edgePoints.map((pts, i) => (
        <Line key={i} points={pts} color="#e2e8f0" lineWidth={1.5} />
      ))}
    </group>
  )
}

export default function WulffHabit3D({
  faces,
  habitLabel,
}: {
  faces: FaceSpec3D[]
  habitLabel: string
}) {
  return (
    <div className="teach-wulff3d" aria-label={`3D Wulff habit ${habitLabel}`}>
      <Canvas
        camera={{ position: [2.8, 2.2, 3.2], fov: 42, near: 0.05, far: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
        style={{ width: '100%', height: 280, borderRadius: 10 }}
      >
        <ambientLight intensity={0.65} />
        <directionalLight position={[4, 6, 3]} intensity={0.9} />
        <HabitMesh faces={faces} />
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
      </Canvas>
      <p className="teach-caption">
        Interactive 3D habit from BFDH rates (orbit to rotate). Teaching
        schematic — not a full morphological Wulff construction.
      </p>
    </div>
  )
}
