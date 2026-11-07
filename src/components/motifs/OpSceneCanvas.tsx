/**
 * Draws one {@link OpScene} on a 2D canvas: the operation's real element,
 * faint static BASE / IMAGE endpoints, and a ghost that follows the honest
 * opPath frames. One shared low-poly mesh per style; no WebGL contexts.
 * Runs only on-screen with motion on; paused animations or reduced motion show
 * the static endpoints (both directions, live).
 */
import { useEffect, useRef } from 'react'
import { easeInOut, RENDER_COLLAPSE_FLOOR } from '../../data/opPath'
import type { Vec3 } from '../../data/types'
import { scenePose, sceneScreen, type OpScene } from './homeScenes'
import { drawMotif, fitCanvas, getLiteMesh, type LiteMesh } from './softRender'
import { startLoop } from './animLoop'
import type { MeshStyleId } from './motifGeometry'

export interface SceneTimeline {
  periodMs: number
  /** Fraction of the period at which motion starts / ends. */
  moveStart: number
  moveEnd: number
}

export const CARD_TIMELINE: SceneTimeline = { periodMs: 3600, moveStart: 0.04, moveEnd: 0.7 }

/** Loop phase → { s (eased path parameter), ghost alpha }. Pure, for tests. */
export function timelineFrame(u: number, tl: SceneTimeline = CARD_TIMELINE): { s: number; alpha: number } {
  const { moveStart, moveEnd } = tl
  if (u < moveStart) return { s: 0, alpha: u / moveStart }
  if (u < moveEnd) return { s: easeInOut((u - moveStart) / (moveEnd - moveStart)), alpha: 1 }
  if (u < 0.82) return { s: 1, alpha: 1 }
  if (u < 0.94) return { s: 1, alpha: 1 - (u - 0.82) / 0.12 }
  return { s: 0, alpha: 0 }
}

function add(a: Vec3, b: Vec3, k = 1): Vec3 {
  return [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
}

export function drawElement(ctx: CanvasRenderingContext2D, sc: OpScene, color: string) {
  const el = sc.element
  const P = (p: Vec3) => sceneScreen(sc, p)
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  if (el.kind === 'plane') {
    const c = [
      add(add(el.p, el.u, el.halfU), el.v, el.halfV),
      add(add(el.p, el.u, -el.halfU), el.v, el.halfV),
      add(add(el.p, el.u, -el.halfU), el.v, -el.halfV),
      add(add(el.p, el.u, el.halfU), el.v, -el.halfV),
    ].map(P)
    ctx.beginPath()
    c.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.closePath()
    ctx.globalAlpha = 0.13
    ctx.fill()
    ctx.globalAlpha = 0.85
    ctx.lineWidth = 1.2
    ctx.setLineDash([4, 3])
    ctx.stroke()
  } else if (el.kind === 'axis') {
    const along = Math.abs(el.dir[0] * sc.view.toward[0] + el.dir[1] * sc.view.toward[1] + el.dir[2] * sc.view.toward[2])
    const [cx, cy] = P(el.p)
    if (along > 0.95) {
      // Axis points at the viewer: 2-fold lens symbol at its piercing point.
      ctx.beginPath()
      ctx.ellipse(cx, cy, 3.6, 6.4, 0, 0, Math.PI * 2)
      ctx.globalAlpha = 0.25
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.lineWidth = 1.5
      ctx.stroke()
    } else {
      const [x0, y0] = P(add(el.p, el.dir, -el.half))
      const [x1, y1] = P(add(el.p, el.dir, el.half))
      ctx.lineWidth = 2.2
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.stroke()
      if (el.screw) {
        ctx.font = '700 9px system-ui, sans-serif'
        ctx.fillText('2₁', x0 + 4, y0 - 2)
        ctx.fillText('+½ ↑', x1 + 4, y1 + 6)
      }
    }
  } else if (el.kind === 'center') {
    const [cx, cy] = P(el.p)
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(cx, cy, 3.8, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx, cy, 1.3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export function drawPose(
  ctx: CanvasRenderingContext2D,
  sc: OpScene,
  mesh: LiteMesh,
  s: number,
  tint: string,
  alpha: number,
  tintAmount = 0.4,
) {
  const { L, t } = scenePose(sc, s, RENDER_COLLAPSE_FLOOR)
  return drawMotif(ctx, mesh, L, t, sc.modelScale, sc.view, { tint, alpha, tintAmount })
}

function drawStatic(ctx: CanvasRenderingContext2D, sc: OpScene, mesh: LiteMesh, color: string, still: boolean) {
  ctx.clearRect(0, 0, sc.width, sc.height)
  // Cell frame (as the classic cards).
  ctx.save()
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(8, 8, 104, 56, 6)
  else ctx.rect(8, 8, 104, 56)
  ctx.stroke()
  ctx.restore()
  drawElement(ctx, sc, color)
  const endA = still ? 0.95 : 0.38
  const identity = sc.path.kind === 'identity'
  drawPose(ctx, sc, mesh, 0, color, identity ? 1 : endA)
  const label = (txt: string, p: Vec3, a: number) => {
    const [x, y] = sceneScreen(sc, p)
    ctx.save()
    ctx.globalAlpha = a
    ctx.fillStyle = color
    ctx.font = '700 10px system-ui, sans-serif'
    ctx.textAlign = 'center'
    // Dark halo keeps B / I legible over the cell; stay above the caption line.
    const ty = Math.min(sc.height - (sc.caption ? 14 : 4), y + 20)
    ctx.lineWidth = 2.5
    ctx.strokeStyle = 'rgba(2,6,23,0.9)'
    ctx.strokeText(txt, x, ty)
    ctx.fillText(txt, x, ty)
    ctx.restore()
  }
  if (identity) {
    label('BASE', sc.base, 1)
  } else {
    drawPose(ctx, sc, mesh, 1, color, endA)
    label('B', sc.base, endA + 0.2)
    label('I', scenePose(sc, 1).t, endA + 0.2)
  }
  if (sc.caption) {
    ctx.save()
    ctx.fillStyle = color
    ctx.font = '600 9px system-ui, sans-serif'
    ctx.fillText(sc.caption, 6, sc.height - 3)
    ctx.restore()
  }
}

export default function OpSceneCanvas({
  scene,
  style,
  color,
  className,
}: {
  scene: OpScene
  style: MeshStyleId
  color: string
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const mesh = getLiteMesh(style)
    let layer: HTMLCanvasElement | null = null
    let layerStill: boolean | null = null
    const start = performance.now()
    return startLoop({
      el: canvas,
      animated: scene.path.kind !== 'identity',
      draw: (now, still, size) => {
        const ctx = fitCanvas(canvas, scene.width, scene.height, size.w)
        if (!ctx) return
        if (!layer || layer.width !== canvas.width || layer.height !== canvas.height || layerStill !== still) {
          layer = layer ?? document.createElement('canvas')
          layer.width = canvas.width
          layer.height = canvas.height
          const lctx = layer.getContext('2d')
          if (!lctx) return
          lctx.setTransform(canvas.width / scene.width, 0, 0, canvas.height / scene.height, 0, 0)
          drawStatic(lctx, scene, mesh, color, still)
          layerStill = still
        }
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(layer, 0, 0)
        ctx.restore()
        if (still) return
        const f = timelineFrame(((now - start) % CARD_TIMELINE.periodMs) / CARD_TIMELINE.periodMs)
        if (f.alpha > 0.01) drawPose(ctx, scene, mesh, f.s, color, f.alpha)
      },
    })
  }, [scene, style, color])

  return (
    <canvas
      ref={ref}
      className={className ?? 'primer-canvas'}
      width={scene.width * 2}
      height={scene.height * 2}
      aria-hidden="true"
      data-motif-style={style}
      data-op-kind={scene.path.kind}
    />
  )
}
