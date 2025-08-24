import { describe, it, expect } from 'vitest'
import { mergeCollinear, polygonToSvgPath, snapRectilinear } from './rectilinear'

describe('rectilinear utils', () => {
  it('merges collinear points', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
    ]
    const merged = mergeCollinear(pts)
    expect(merged).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 10 },
    ])
  })

  it('creates a closed SVG path', () => {
    const d = polygonToSvgPath([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ])
    expect(d.startsWith('M 0 0')).toBe(true)
    expect(d.includes('Z')).toBe(true)
  })

  it('snaps to right angles within tolerance', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 3 }, // ~17° should snap to 0° with default tolerance 10? Actually not. Use higher tolerance.
      { x: 10, y: 13 },
    ]
    const snapped = snapRectilinear(pts, 20, 0)
    // second point snapped vertically to y=0 and third to x=10 from first-second segment
    expect(snapped[1].y).toBe(0)
  })
})


