/** Distinct hues for symmetry copies (op index 1…). */

const HUES = [
  200, 280, 30, 140, 330, 50, 170, 0, 250, 90, 310, 60, 190, 20, 220, 120,
]

export function operatorColor(opIndex: number, alpha = 1): string {
  const h = HUES[(Math.max(1, opIndex) - 1) % HUES.length]!
  return `hsla(${h}, 78%, 62%, ${alpha})`
}

export function elementRadius(el: string): number {
  const map: Record<string, number> = {
    H: 0.22,
    C: 0.38,
    N: 0.36,
    O: 0.34,
    F: 0.3,
    S: 0.48,
    P: 0.48,
    Cl: 0.5,
    Br: 0.55,
  }
  return map[el] ?? 0.4
}

export function elementColor(el: string): string {
  const map: Record<string, string> = {
    H: '#f8fafc',
    C: '#94a3b8',
    N: '#60a5fa',
    O: '#f87171',
    S: '#facc15',
    P: '#fb923c',
    F: '#a3e635',
    Cl: '#4ade80',
    Br: '#a16207',
  }
  return map[el] ?? '#cbd5e1'
}
