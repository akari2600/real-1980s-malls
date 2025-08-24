import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/state/useStore'
import { snapRectilinear } from '@/geometry/rectilinear'

function useImageBitmap (src: string | null) {
  const [bmp, setBmp] = useState<ImageBitmap | null>(null)
  useEffect(() => {
    let active = true
    ;(async () => {
      if (!src) { setBmp(null); return }
      const res = await fetch(src)
      const blob = await res.blob()
      const b = await createImageBitmap(blob)
      if (active) setBmp(b)
    })()
    return () => { active = false }
  }, [src])
  return bmp
}

export function CanvasView () {
  const imageDataUrl = useStore(s => s.imageDataUrl)
  const contours = useStore(s => s.contours)
  const params = useStore(s => s.params)
  const editMode = useStore(s => s.editMode)
  const setSelected = useStore(s => s.setSelected)
  const updateVertex = useStore(s => s.updateVertex)
  const deleteVertex = useStore(s => s.deleteVertex)
  const measurement = useStore(s => s.measurement)
  const setMeasurementPoint = useStore(s => s.setMeasurementPoint)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const bmp = useImageBitmap(imageDataUrl)

  const processed = useMemo(() => {
    return contours.map(p => ({ ...p, points: snapRectilinear(p.points, 12, params.rectilinearSnap) }))
  }, [contours, params.rectilinearSnap])

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const w = bmp?.width ?? 1024
    const h = bmp?.height ?? 768
    c.width = w; c.height = h
    ctx.clearRect(0, 0, w, h)
    if (bmp) ctx.drawImage(bmp, 0, 0)

    // draw polygons
    ctx.lineWidth = 1
    for (const poly of processed) {
      ctx.beginPath()
      const pts = poly.points
      if (pts.length === 0) continue
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.closePath()
      ctx.strokeStyle = 'rgba(0,255,0,0.9)'
      ctx.stroke()
      ctx.fillStyle = 'rgba(0,255,0,0.6)'
      for (const p of pts) { ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill() }
    }
    // measurement line
    if (measurement.p1 && measurement.p2) {
      ctx.strokeStyle = 'rgba(0,128,255,0.9)'
      ctx.beginPath(); ctx.moveTo(measurement.p1.x, measurement.p1.y); ctx.lineTo(measurement.p2.x, measurement.p2.y); ctx.stroke()
    }
  }, [bmp, processed])

  function getMousePos (evt: React.MouseEvent<HTMLCanvasElement, MouseEvent>) {
    const c = canvasRef.current!
    const rect = c.getBoundingClientRect()
    const x = (evt.clientX - rect.left) * (c.width / rect.width)
    const y = (evt.clientY - rect.top) * (c.height / rect.height)
    return { x, y }
  }

  const hitRadius = 6

  function onMouseDown (e: React.MouseEvent<HTMLCanvasElement>) {
    if (measurement.active) {
      const pos = getMousePos(e)
      if (!measurement.p1) setMeasurementPoint(1, pos)
      else setMeasurementPoint(2, pos)
      return
    }
    if (!editMode) return
    const pos = getMousePos(e)
    for (const poly of contours) {
      for (let i = 0; i < poly.points.length; i++) {
        const p = poly.points[i]
        if (Math.hypot(p.x - pos.x, p.y - pos.y) <= hitRadius) {
          setSelected({ polyId: poly.id, index: i })
          return
        }
      }
    }
  }
  function onMouseMove (e: React.MouseEvent<HTMLCanvasElement>) {
    if (!editMode || measurement.active) return
    const sel = useStore.getState().selected
    if (!sel) return
    const pos = getMousePos(e)
    updateVertex(sel.polyId, sel.index, { x: pos.x, y: pos.y })
  }
  function onMouseUp () { if (editMode) setSelected(null) }
  function onClick (e: React.MouseEvent<HTMLCanvasElement>) {
    if (!editMode || e.shiftKey === false) return
    const pos = getMousePos(e)
    for (const poly of contours) {
      for (let i = 0; i < poly.points.length; i++) {
        const p = poly.points[i]
        if (Math.hypot(p.x - pos.x, p.y - pos.y) <= hitRadius) { deleteVertex(poly.id, i); return }
      }
    }
  }

  return <canvas ref={canvasRef} className="w-full h-full bg-neutral-50 dark:bg-neutral-900" onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onClick={onClick} />
}


