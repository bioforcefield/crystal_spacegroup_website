/**
 * Macromolecule (PDB) rendering: cartoon / trace / full atoms (all instanced or
 * merged geometry), plus the ligand-focus overlay (ball-and-stick ligand, pocket
 * sticks with labels, dashed interaction lines) and a smooth focus camera.
 */
import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react'
import * as THREE from 'three'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Billboard, Line, Text } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { ExpandedStructure } from '../../data/cif/types'
import type { AtomPick } from '../../data/cif/atomInfo'
import type { Vec3 } from '../../data/types'
import { jmolColor } from '../../data/cif/colorSchemes'
import { cartoonSegment, emptyMesh, rung, splitRuns, traceTube, type CartoonResidue } from '../../data/pdb/cartoon'
import { isAmino, ladderAtom, METALS } from '../../data/pdb/macro'
import { INTERACTION_TYPES, type InteractionType, type LigandSite } from '../../data/pdb/interactions'

const tmpColor = new THREE.Color()
export function rgbOf(css: string): [number, number, number] {
  tmpColor.set(css.startsWith('hsla') ? css.replace('hsla', 'hsl').replace(/,\s*[\d.]+\)$/, ')') : css)
  return [tmpColor.r, tmpColor.g, tmpColor.b]
}

/** Merged cartoon geometry for all drawn copies; per-vertex atom index for picking. */
export function CartoonMeshes({
  structure,
  positions,
  visibleIndices,
  colorOf,
  schemeKey,
  offsets,
  translations,
  opacity,
  onHover,
  onPick,
}: {
  structure: ExpandedStructure
  positions: Vec3[]
  visibleIndices: number[]
  colorOf: (ai: number) => string
  schemeKey: string
  offsets: Vec3[]
  translations: Vec3[]
  opacity: number
  onHover?: (pick: AtomPick | null, x: number, y: number) => void
  onPick?: (pick: AtomPick) => void
}) {
  const macro = structure.macro!
  const { geom, atomIndex } = useMemo(() => {
    const mesh = emptyMesh()
    const byMol = new Map<number, number[]>()
    for (const ai of visibleIndices) {
      const a = structure.atoms[ai]!
      if (!a.pdb) continue
      let l = byMol.get(a.moleculeId)
      if (!l) byMol.set(a.moleculeId, (l = []))
      l.push(ai)
    }
    for (const list of byMol.values()) {
      const prot = new Map<string, CartoonResidue>()
      const order: string[] = []
      const oxy = new Map<string, Vec3>()
      const ptrace = new Map<string, { ca: Vec3; ai: number; color: [number, number, number] }[]>()
      const c1 = new Map<string, { p: Vec3; ai: number }>()
      const nb = new Map<string, Vec3>()
      for (const ai of list) {
        const e = structure.atoms[ai]!.pdb!
        const key = `${e.chain}|${e.seq}`
        const p = positions[ai]!
        if (isAmino(e.comp) || e.ca) {
          if (e.ca) {
            const ss = macro.model.ss[macro.siteOf[structure.atoms[ai]!.auIndex]!] ?? 'C'
            prot.set(key, { ca: p, ss, color: rgbOf(colorOf(ai)), ai })
            order.push(key)
          } else if (e.atomName === 'O') oxy.set(key, p)
          continue
        }
        const la = ladderAtom(e)
        if (la === 'P') {
          let l = ptrace.get(e.chain)
          if (!l) ptrace.set(e.chain, (l = []))
          l.push({ ca: p, ai, color: rgbOf(colorOf(ai)) })
        } else if (la === 'C1') c1.set(key, { p, ai })
        else if (la === 'N') nb.set(key, p)
      }
      // protein: split per chain, then by Cα gaps
      const chains = new Map<string, CartoonResidue[]>()
      for (const k of order) {
        const r = prot.get(k)!
        r.o = oxy.get(k)
        const ch = k.split('|')[0]!
        let l = chains.get(ch)
        if (!l) chains.set(ch, (l = []))
        l.push(r)
      }
      for (const l of chains.values()) for (const run of splitRuns(l, 4.3)) cartoonSegment(mesh, run)
      for (const l of ptrace.values())
        for (const run of splitRuns(l, 8)) traceTube(mesh, run.map((q) => ({ p: q.ca, ai: q.ai, color: q.color })))
      for (const [k, c] of c1) {
        const to = nb.get(k)
        if (to) rung(mesh, { from: c.p, to, color: rgbOf(colorOf(c.ai)), ai: c.ai })
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(mesh.normals, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(mesh.colors, 3))
    g.setIndex(mesh.indices)
    g.computeBoundingSphere()
    return { geom: g, atomIndex: mesh.atomIndex }
    // colorOf is recreated each render; schemeKey captures the color mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure, positions, visibleIndices, schemeKey])
  useEffect(() => () => geom.dispose(), [geom])
  const pickOf = (e: ThreeEvent<PointerEvent | MouseEvent>, k: number): AtomPick | null => {
    const f = e.face
    if (!f) return null
    const ai = atomIndex[f.a]
    return ai == null ? null : { ai, t: translations[k]! }
  }
  return (
    <>
      {offsets.map((d, k) => (
        <mesh
          key={k}
          geometry={geom}
          position={d}
          onPointerMove={(e) => {
            if (!onHover) return
            const p = pickOf(e, k)
            if (!p) return
            e.stopPropagation()
            onHover(p, e.nativeEvent.clientX, e.nativeEvent.clientY)
          }}
          onPointerOut={() => onHover?.(null, 0, 0)}
          onClick={(e) => {
            if (!onPick || e.delta > 4) return
            const p = pickOf(e, k)
            if (!p) return
            e.stopPropagation()
            onPick(p)
          }}
        >
          <meshStandardMaterial
            vertexColors
            roughness={0.55}
            metalness={0.05}
            side={THREE.DoubleSide}
            transparent={opacity < 1 || k > 0}
            opacity={k > 0 ? Math.min(opacity, 0.55) : opacity}
            depthWrite={opacity >= 1 && k === 0}
          />
        </mesh>
      ))}
    </>
  )
}

function Stick({ a, b, color, r = 0.12 }: { a: Vec3; b: Vec3; color: string; r?: number }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b)
    const dir = vb.clone().sub(va)
    const len = dir.length()
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    return { pos: va.add(vb).multiplyScalar(0.5), quat, len }
  }, [a, b])
  return (
    <mesh position={pos} quaternion={quat} raycast={() => null}>
      <cylinderGeometry args={[r, r, len, 10]} />
      <meshStandardMaterial color={color} roughness={0.45} />
    </mesh>
  )
}

const add3 = (p: Vec3, d: Vec3): Vec3 => [p[0] + d[0], p[1] + d[1], p[2] + d[2]]

/** Ligand ball-and-stick + pocket sticks + interaction dashes (positions shifted by `delta`). */
export function LigandFocusOverlay({
  site,
  delta,
  types,
  highlight = null,
}: {
  site: LigandSite
  delta: Vec3
  types?: Set<InteractionType>
  highlight?: string | null
}) {
  const colorOfType = new Map(INTERACTION_TYPES.map((t) => [t.v, t.color]))
  const items: ReactNode[] = []
  site.atoms.forEach((at, i) => {
    const metal = METALS.has(at.element)
    items.push(
      <mesh key={`la${i}`} position={add3(at.cart, delta)} raycast={() => null}>
        <sphereGeometry args={[metal ? 0.55 : 0.32, 16, 16]} />
        <meshStandardMaterial color={jmolColor(at.element)} roughness={0.4} emissive="#222" />
      </mesh>,
    )
  })
  site.bonds.forEach(([i, j], k) => {
    const A = add3(site.atoms[i]!.cart, delta), B = add3(site.atoms[j]!.cart, delta)
    const m: Vec3 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2]
    items.push(<Stick key={`lb${k}a`} a={A} b={m} color={jmolColor(site.atoms[i]!.element)} r={0.14} />)
    items.push(<Stick key={`lb${k}b`} a={m} b={B} color={jmolColor(site.atoms[j]!.element)} r={0.14} />)
  })
  site.pocket.forEach((res, ri) => {
    res.bonds.forEach(([i, j], k) => {
      const A = add3(res.atoms[i]!.cart, delta), B = add3(res.atoms[j]!.cart, delta)
      const m: Vec3 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2]
      const hi = highlight === res.key
      const ca = hi ? '#fde047' : res.symCode ? '#c4b5fd' : jmolColor(res.atoms[i]!.element)
      const cb = hi ? '#fde047' : res.symCode ? '#c4b5fd' : jmolColor(res.atoms[j]!.element)
      items.push(<Stick key={`p${ri}_${k}a`} a={A} b={m} color={ca} r={hi ? 0.16 : 0.08} />)
      items.push(<Stick key={`p${ri}_${k}b`} a={m} b={B} color={cb} r={hi ? 0.16 : 0.08} />)
    })
    const anchor = res.atoms.find((a) => a.name === 'CA') ?? res.atoms[0]
    if (anchor)
      items.push(
        <Billboard key={`pl${ri}`} position={add3(add3(anchor.cart, delta), [0, 0.6, 0])}>
          <Text fontSize={0.42} color={res.symCode ? '#ddd6fe' : '#e2e8f0'} outlineWidth={0.03} outlineColor="#0b1220" anchorX="center" anchorY="bottom">
            {res.label}
          </Text>
        </Billboard>,
      )
  })
  site.interactions.forEach((it, k) => {
    if (types && !types.has(it.type)) return
    const A = add3(it.a, delta), B = add3(it.b, delta)
    const color = colorOfType.get(it.type) ?? '#fff'
    items.push(
      <Line key={`i${k}`} points={[A, B]} color={color} lineWidth={highlight && it.resKey === highlight ? 5 : 2} dashed dashSize={0.18} gapSize={0.12} />,
    )
    items.push(
      <Billboard key={`il${k}`} position={[(A[0] + B[0]) / 2, (A[1] + B[1]) / 2 + 0.15, (A[2] + B[2]) / 2]}>
        <Text fontSize={0.3} color={color} outlineWidth={0.025} outlineColor="#0b1220">
          {it.dist.toFixed(1)}
        </Text>
      </Billboard>,
    )
  })
  return <group>{items}</group>
}

/** Smoothly fly the camera to the focus sphere; fly back when focus clears. */
export function FocusCamera({
  target,
  controlsRef,
  groupOffset,
}: {
  target: { center: Vec3; radius: number } | null
  controlsRef: RefObject<OrbitControlsImpl | null>
  groupOffset: Vec3
}) {
  const { camera } = useThree()
  const saved = useRef<{ pos: THREE.Vector3; tgt: THREE.Vector3 } | null>(null)
  const goal = useRef<{ pos: THREE.Vector3; tgt: THREE.Vector3; t: number } | null>(null)
  const key = target ? `${target.center.join(',')}|${target.radius}` : ''
  useEffect(() => {
    const ctl = controlsRef.current
    if (!ctl) return
    if (target) {
      if (!saved.current) saved.current = { pos: camera.position.clone(), tgt: ctl.target.clone() }
      const c = new THREE.Vector3(target.center[0] + groupOffset[0], target.center[1] + groupOffset[1], target.center[2] + groupOffset[2])
      const dir = camera.position.clone().sub(ctl.target).normalize()
      const d = Math.max(9, target.radius * 2.6 + 6)
      goal.current = { pos: c.clone().add(dir.multiplyScalar(d)), tgt: c, t: 0 }
    } else if (saved.current) {
      goal.current = { pos: saved.current.pos, tgt: saved.current.tgt, t: 0 }
      saved.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  useFrame((_, dt) => {
    const g = goal.current
    const ctl = controlsRef.current
    if (!g || !ctl) return
    g.t = Math.min(1, g.t + dt / 0.9)
    const k = 1 - Math.pow(1 - g.t, 3)
    camera.position.lerp(g.pos, k)
    ctl.target.lerp(g.tgt, k)
    ctl.update()
    if (g.t >= 1) goal.current = null
  })
  return null
}
