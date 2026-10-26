import * as THREE from 'three'
import { properBasis, type Mat3 } from '../data/pbca'

const _m4 = new THREE.Matrix4()
const _q = new THREE.Quaternion()

/** Build a Three quaternion from a proper 3×3 (row-major). */
export function quatFromProper(R: Mat3): THREE.Quaternion {
  _m4.set(
    R[0][0],
    R[0][1],
    R[0][2],
    0,
    R[1][0],
    R[1][1],
    R[1][2],
    0,
    R[2][0],
    R[2][1],
    R[2][2],
    0,
    0,
    0,
    0,
    1,
  )
  return _q.setFromRotationMatrix(_m4).clone()
}

export function orientationFromR(R: Mat3): {
  quaternion: THREE.Quaternion
  mirror: boolean
} {
  const { proper, mirror } = properBasis(R)
  return { quaternion: quatFromProper(proper), mirror }
}

/**
 * Compact chiral "L" triad: three unequal orthogonal arms + a handed flag
 * on the long (+z) arm. Mirror via parent scale.x = −1 for improper ops.
 */
export function ChiralMotifMesh({
  color,
  emissiveIntensity = 0.3,
  opacity = 1,
  selected = false,
}: {
  color: string
  emissiveIntensity?: number
  opacity?: number
  selected?: boolean
}) {
  const matProps = {
    color,
    emissive: color,
    emissiveIntensity,
    roughness: 0.4,
    metalness: 0.2,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
    side: THREE.DoubleSide as THREE.Side,
  }

  const armR = selected ? 0.018 : 0.015
  const lx = 0.07
  const ly = 0.11
  const lz = 0.15

  return (
    <group>
      <mesh>
        <sphereGeometry args={[selected ? 0.028 : 0.022, 16, 16]} />
        <meshStandardMaterial
          {...matProps}
          emissiveIntensity={emissiveIntensity + 0.15}
        />
      </mesh>

      {/* +x short (red tip) */}
      <mesh position={[lx / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[armR, armR, lx, 10]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[lx, 0, 0]}>
        <sphereGeometry args={[armR * 1.35, 12, 12]} />
        <meshStandardMaterial
          {...matProps}
          color="#fca5a5"
          emissive="#f87171"
          emissiveIntensity={0.45}
        />
      </mesh>

      {/* +y medium (green tip) */}
      <mesh position={[0, ly / 2, 0]}>
        <cylinderGeometry args={[armR, armR, ly, 10]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[0, ly, 0]}>
        <sphereGeometry args={[armR * 1.35, 12, 12]} />
        <meshStandardMaterial
          {...matProps}
          color="#86efac"
          emissive="#4ade80"
          emissiveIntensity={0.45}
        />
      </mesh>

      {/* +z long (blue tip) */}
      <mesh position={[0, 0, lz / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[armR, armR, lz, 10]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[0, 0, lz]}>
        <sphereGeometry args={[armR * 1.45, 12, 12]} />
        <meshStandardMaterial
          {...matProps}
          color="#93c5fd"
          emissive="#60a5fa"
          emissiveIntensity={0.45}
        />
      </mesh>

      {/* Handedness flag — offset toward +x so mirror is obvious */}
      <mesh position={[0.028, 0, lz * 0.72]} rotation={[0, 0, 0.15]}>
        <boxGeometry args={[0.045, 0.012, 0.055]} />
        <meshStandardMaterial
          {...matProps}
          color="#fef08a"
          emissive="#facc15"
          emissiveIntensity={0.55}
        />
      </mesh>
    </group>
  )
}
