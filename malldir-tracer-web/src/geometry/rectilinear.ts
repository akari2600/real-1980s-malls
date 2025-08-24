import type { Point } from '@/state/useStore'

export function snapRectilinear (points: Point[], toleranceDeg = 10, gridSnap = 0): Point[] {
  if (points.length < 2) return points
  const snapped: Point[] = []
  const toDeg = (rad: number) => (rad * 180) / Math.PI
  const snapAngle = (angle: number) => {
    const rightAngles = [0, 90, 180, 270]
    let best = angle
    let minDiff = Infinity
    for (const a of rightAngles) {
      const d = Math.min(Math.abs(angle - a), 360 - Math.abs(angle - a))
      if (d < minDiff) { minDiff = d; best = a }
    }
    return minDiff <= toleranceDeg ? best : angle
  }
  const snapCoord = (v: number) => gridSnap > 0 ? Math.round(v / gridSnap) * gridSnap : v

  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i]
    const n = points[i + 1]
    const dx = n.x - p.x
    const dy = n.y - p.y
    const angle = toDeg(Math.atan2(dy, dx))
    const s = snapAngle((angle + 360) % 360)
    let q = { ...n }
    if (s === 0 || s === 180) {
      q = { x: n.x, y: p.y }
    } else if (s === 90 || s === 270) {
      q = { x: p.x, y: n.y }
    }
    snapped.push({ x: snapCoord(p.x), y: snapCoord(p.y) })
    if (i === points.length - 2) snapped.push({ x: snapCoord(q.x), y: snapCoord(q.y) })
  }
  return mergeCollinear(snapped)
}

export function mergeCollinear (points: Point[]): Point[] {
  if (points.length <= 2) return points
  const merged: Point[] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const a = merged[merged.length - 1]
    const b = points[i]
    const c = points[i + 1]
    const collinear = (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)
    if (!collinear) merged.push(b)
  }
  merged.push(points[points.length - 1])
  return merged
}

export function polygonToSvgPath (pts: Point[]): string {
  if (pts.length === 0) return ''
  const d = [`M ${pts[0].x} ${pts[0].y}`]
  for (let i = 1; i < pts.length; i++) d.push(`L ${pts[i].x} ${pts[i].y}`)
  d.push('Z')
  return d.join(' ')
}


