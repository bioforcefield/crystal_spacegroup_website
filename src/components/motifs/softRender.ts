/**
 * Tiny 2D-canvas software renderer for the real 3D motif meshes (home page
 * hero + primer cards). No WebGL context: each motif is a low-poly ("lite")
 * build of the same concept geometry, transformed by a full 3×3 affine map
 * (det ±1 or a collapsing frame), projected with a parallel projection,
 * back-face culled with the determinant sign, flat-lit and painter-sorted.
 * Faces, buds and body are one mesh, so they always move together.
 */
import { buildMotifModel, MOTIF_BODY_BASE, MOTIF_PART_COLORS, type MeshStyleId, type MotifPart } from './motifGeometry'
import type { Mat3, Vec3 } from '../../data/types'

export interface LiteMesh {
  /** Triangle vertex positions, 9 floats per triangle (model units). */
  tris: Float32Array
  /** Part index per triangle (into PARTS). */
  part: Uint8Array
  count: number
}

export const PARTS: MotifPart[] = ['body', 'coral', 'mint', 'gold', 'lilac', 'foot', 'eye', 'white', 'cheek']

const liteCache = new Map<MeshStyleId, LiteMesh>()

/** Shared low-poly mesh per style (built once, reused by every canvas). */
export function getLiteMesh(style: MeshStyleId): LiteMesh {
  const hit = liteCache.get(style)
  if (hit) return hit
  const model = buildMotifModel(style, 'lite')
  const tris: number[] = []
  const part: number[] = []
  for (const { part: p, geometry } of model.parts) {
    const pos = geometry.getAttribute('position')
    const idx = geometry.index
    const n = idx ? idx.count : pos.count
    const pi = PARTS.indexOf(p)
    for (let i = 0; i < n; i += 3) {
      for (let k = 0; k < 3; k++) {
        const v = idx ? idx.getX(i + k) : i + k
        tris.push(pos.getX(v), pos.getY(v), pos.getZ(v))
      }
      part.push(pi)
    }
    geometry.dispose()
  }
  const mesh = { tris: new Float32Array(tris), part: new Uint8Array(part), count: part.length }
  liteCache.set(style, mesh)
  return mesh
}

/** Parallel projection: screen = origin + k·(x·right, −y·up) with a horizontal stretch. */
export interface View {
  right: Vec3
  up: Vec3
  /** Toward the viewer (right × up). */
  toward: Vec3
  /** Pixels per world unit. */
  k: number
  /** Extra horizontal stretch (2D affine after projection; 1 = none). */
  sx?: number
  origin: [number, number]
}

export function makeView(right: Vec3, up: Vec3, k: number, origin: [number, number], sx = 1): View {
  const toward: Vec3 = [
    right[1] * up[2] - right[2] * up[1],
    right[2] * up[0] - right[0] * up[2],
    right[0] * up[1] - right[1] * up[0],
  ]
  return { right, up, toward, k, sx, origin }
}

export function project(view: View, p: Vec3): [number, number] {
  const x = p[0] * view.right[0] + p[1] * view.right[1] + p[2] * view.right[2]
  const y = p[0] * view.up[0] + p[1] * view.up[1] + p[2] * view.up[2]
  return [view.origin[0] + view.k * (view.sx ?? 1) * x, view.origin[1] - view.k * y]
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const mix = (a: [number, number, number], b: [number, number, number], t: number) =>
  [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as [number, number, number]

export interface PaintStyle {
  /** Class / legend tint mixed into the cream body. */
  tint: string
  tintAmount?: number
  alpha?: number
}

function partRgb(pi: number, paint: PaintStyle): [number, number, number] {
  const p = PARTS[pi]
  if (p === 'body') return mix(hexToRgb(MOTIF_BODY_BASE), hexToRgb(paint.tint), paint.tintAmount ?? 0.4)
  return hexToRgb(MOTIF_PART_COLORS[p as Exclude<MotifPart, 'body'>])
}

const det3 = (m: Mat3) =>
  m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
  m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
  m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])

// Scratch buffers (shared; drawing is synchronous).
let sx = new Float32Array(0)
let sy = new Float32Array(0)
let order = new Uint32Array(0)
let depth = new Float32Array(0)
let shadeBuf = new Float32Array(0)

/**
 * Draw `mesh` under world map x ↦ L·(scale·v) + t. Returns the number of
 * triangles drawn (for tests / perf checks).
 */
export function drawMotif(
  ctx: CanvasRenderingContext2D,
  mesh: LiteMesh,
  L: Mat3,
  t: Vec3,
  scale: number,
  view: View,
  paint: PaintStyle,
): number {
  const n = mesh.count
  if (sx.length < n * 3) {
    sx = new Float32Array(n * 3)
    sy = new Float32Array(n * 3)
    order = new Uint32Array(n)
    depth = new Float32Array(n)
    shadeBuf = new Float32Array(n)
  }
  const d = det3(L)
  const sign = d < 0 ? -1 : 1
  const degenerate = Math.abs(d) < 1e-3
  const { right, up, toward } = view
  // Light from upper-left-front in view space.
  const lx = -0.45 * right[0] + 0.7 * up[0] + 0.55 * toward[0]
  const ly = -0.45 * right[1] + 0.7 * up[1] + 0.55 * toward[1]
  const lz = -0.45 * right[2] + 0.7 * up[2] + 0.55 * toward[2]
  const ll = Math.hypot(lx, ly, lz)
  const tri = mesh.tris
  let drawn = 0
  const wx = [0, 0, 0]
  const wy = [0, 0, 0]
  const wz = [0, 0, 0]
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) {
      const o = i * 9 + k * 3
      const vx = tri[o] * scale
      const vy = tri[o + 1] * scale
      const vz = tri[o + 2] * scale
      wx[k] = L[0][0] * vx + L[0][1] * vy + L[0][2] * vz + t[0]
      wy[k] = L[1][0] * vx + L[1][1] * vy + L[1][2] * vz + t[1]
      wz[k] = L[2][0] * vx + L[2][1] * vy + L[2][2] * vz + t[2]
    }
    const ax = wx[1] - wx[0], ay = wy[1] - wy[0], az = wz[1] - wz[0]
    const bx = wx[2] - wx[0], by = wy[2] - wy[0], bz = wz[2] - wz[0]
    // Outward normal: geometric normal × sign(det L) (winding flips when det < 0).
    let nx = (ay * bz - az * by) * sign
    let ny = (az * bx - ax * bz) * sign
    let nz = (ax * by - ay * bx) * sign
    const nl = Math.hypot(nx, ny, nz)
    let lit = 0.62
    if (nl > 1e-12) {
      nx /= nl
      ny /= nl
      nz /= nl
      const facing = nx * toward[0] + ny * toward[1] + nz * toward[2]
      if (!degenerate && facing < 0) continue
      lit = 0.42 + 0.58 * Math.max(0, (nx * lx + ny * ly + nz * lz) / ll)
    }
    for (let k = 0; k < 3; k++) {
      const [px, py] = project(view, [wx[k], wy[k], wz[k]])
      sx[drawn * 3 + k] = px
      sy[drawn * 3 + k] = py
    }
    depth[drawn] =
      ((wx[0] + wx[1] + wx[2]) * toward[0] + (wy[0] + wy[1] + wy[2]) * toward[1] + (wz[0] + wz[1] + wz[2]) * toward[2]) / 3
    shadeBuf[drawn] = lit + mesh.part[i] * 10 // pack part index (lit < 10)
    order[drawn] = drawn
    drawn++
  }
  const ord = order.subarray(0, drawn)
  ord.sort((a, b) => depth[a] - depth[b])
  ctx.save()
  ctx.globalAlpha = paint.alpha ?? 1
  ctx.lineJoin = 'round'
  ctx.lineWidth = 0.6
  const rgbCache = new Map<number, [number, number, number]>()
  for (let j = 0; j < drawn; j++) {
    const i = ord[j]
    const packed = shadeBuf[i]
    const pi = Math.floor(packed / 10)
    const lit = packed - pi * 10
    let rgb = rgbCache.get(pi)
    if (!rgb) {
      rgb = partRgb(pi, paint)
      rgbCache.set(pi, rgb)
    }
    const c = `rgb(${Math.round(rgb[0] * lit)},${Math.round(rgb[1] * lit)},${Math.round(rgb[2] * lit)})`
    ctx.fillStyle = c
    ctx.strokeStyle = c
    ctx.beginPath()
    ctx.moveTo(sx[i * 3], sy[i * 3])
    ctx.lineTo(sx[i * 3 + 1], sy[i * 3 + 1])
    ctx.lineTo(sx[i * 3 + 2], sy[i * 3 + 2])
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
  return drawn
}

/** Size a canvas backing store for its CSS box (DPR capped at 2). */
export function fitCanvas(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  /** Cached CSS width (ResizeObserver); measured when omitted / zero. */
  cssWidth?: number,
): CanvasRenderingContext2D | null {
  const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)
  const cssW = cssWidth || canvas.getBoundingClientRect().width || w
  const scale = (cssW / w) * dpr
  const W = Math.max(1, Math.round(w * scale))
  const H = Math.max(1, Math.round(h * scale))
  if (canvas.width !== W) canvas.width = W
  if (canvas.height !== H) canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  return ctx
}
