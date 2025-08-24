import { useMemo } from 'react'
import { useStore } from '@/state/useStore'
import { polygonToSvgPath } from '@/geometry/rectilinear'
import { Button } from './ui/Button'

export function ExportPanel () {
  const contours = useStore(s => s.contours)

  const svg = useMemo(() => {
    if (contours.length === 0) return ''
    const maxX = Math.max(...contours.flatMap(c => c.points.map(p => p.x)))
    const maxY = Math.max(...contours.flatMap(c => c.points.map(p => p.y)))
    const paths = contours.map(c => `<path d="${polygonToSvgPath(c.points)}" fill="none" stroke="black" stroke-width="1"/>`).join('\n')
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${maxX} ${maxY}">\n${paths}\n</svg>`
  }, [contours])

  function download () {
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'traced.svg'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-2">
      <Button onClick={download} disabled={!svg}>Download SVG</Button>
      <textarea readOnly value={svg} className="w-full h-48 text-xs font-mono p-2 border border-neutral-300 dark:border-neutral-700 rounded" />
    </div>
  )
}


