import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export type Point = { x: number, y: number }
export type Polyline = { id: string, points: Point[] }

export interface AppState {
  imageDataUrl: string | null
  setImage: (dataUrl: string | null) => void

  contours: Polyline[]
  setContours: (polys: Polyline[]) => void
  
  isProcessing: boolean
  processingStatus: string
  setProcessing: (processing: boolean, status?: string) => void

  params: {
    cannyThreshold1: number
    cannyThreshold2: number
    approxEpsilon: number
    minArea: number
    rectilinearSnap: number
    angleToleranceDeg: number
    binarize: boolean
    invertBinary: boolean
    morphKernel: number
    maxDimension: number
  }
  setParam: (key: keyof AppState['params'], value: number | boolean) => void

  scale: number | null // pixels per meter
  setScale: (scale: number | null) => void

  measurement: {
    active: boolean
    p1: Point | null
    p2: Point | null
    realLength: number // in provided units
    units: string // e.g., m, ft, in, mm, cm
  }
  setMeasurementActive: (v: boolean) => void
  setMeasurementPoint: (which: 1 | 2, p: Point | null) => void
  setMeasurementInfo: (len: number, units: string) => void

  editMode: boolean
  setEditMode: (v: boolean) => void

  selected: { polyId: string, index: number } | null
  setSelected: (s: { polyId: string, index: number } | null) => void
  updateVertex: (polyId: string, index: number, p: Point) => void
  deleteVertex: (polyId: string, index: number) => void
}

export const useStore = create<AppState>()(immer((set) => ({
  imageDataUrl: null,
  setImage: (u) => set((s) => { s.imageDataUrl = u }),
  contours: [],
  setContours: (polys) => set((s) => { s.contours = polys }),
  isProcessing: false,
  processingStatus: '',
  setProcessing: (processing, status = '') => set((s) => { 
    s.isProcessing = processing
    s.processingStatus = status 
  }),
  // Backed-off defaults for large newspaper scans
  params: {
    cannyThreshold1: 70,
    cannyThreshold2: 140,
    approxEpsilon: 4.0,
    minArea: 1200,
    rectilinearSnap: 6,
    angleToleranceDeg: 12,
    binarize: true,
    invertBinary: false,
    morphKernel: 3,
    maxDimension: 1400,  // Reduced from 2200 for faster initial processing
  },
  setParam: (k, v) => set((s) => { (s.params as any)[k] = v as any }),
  scale: null,
  setScale: (v) => set((s) => { s.scale = v }),
  measurement: { active: false, p1: null, p2: null, realLength: 0, units: 'm' },
  setMeasurementActive: (v) => set((s) => { s.measurement.active = v; if (!v) { s.measurement.p1 = null; s.measurement.p2 = null } }),
  setMeasurementPoint: (which, p) => set((s) => { (which === 1 ? s.measurement.p1 = p : s.measurement.p2 = p) }),
  setMeasurementInfo: (len, units) => set((s) => { s.measurement.realLength = len; s.measurement.units = units })
  ,
  editMode: false,
  setEditMode: (v) => set((s) => { s.editMode = v }),
  selected: null,
  setSelected: (sel) => set((s) => { s.selected = sel }),
  updateVertex: (polyId, index, p) => set((s) => {
    const poly = s.contours.find(c => c.id === polyId)
    if (!poly) return
    poly.points[index] = p
  }),
  deleteVertex: (polyId, index) => set((s) => {
    const poly = s.contours.find(c => c.id === polyId)
    if (!poly) return
    if (poly.points.length > 3) poly.points.splice(index, 1)
  })
})))


