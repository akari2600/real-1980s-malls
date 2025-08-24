import { useEffect, useRef } from 'react'
import { useStore } from '@/state/useStore'
import { Button } from './ui/Button'
import { Slider } from './ui/Slider'
import { loadOpenCV } from '@/lib/opencv'
import { Input } from './ui/Input'
import { gpuBinarize } from '@/lib/webgl-binarize'

function imageDataFromCanvas (canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext('2d')!
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

export function Controls () {
  const imageDataUrl = useStore(s => s.imageDataUrl)
  const setContours = useStore(s => s.setContours)
  const params = useStore(s => s.params)
  const setParam = useStore(s => s.setParam)
  const autoRef = useRef(true)
  const editMode = useStore(s => s.editMode)
  const setEditMode = useStore(s => s.setEditMode)
  const measurement = useStore(s => s.measurement)
  const setMeasurementActive = useStore(s => s.setMeasurementActive)
  const setMeasurementInfo = useStore(s => s.setMeasurementInfo)
  const setScale = useStore(s => s.setScale)
  const isProcessing = useStore(s => s.isProcessing)
  const processingStatus = useStore(s => s.processingStatus)
  const setProcessing = useStore(s => s.setProcessing)

  useEffect(() => { if (autoRef.current && imageDataUrl) { console.log('[trace] auto kick'); void trace() } }, [imageDataUrl, params])

  // Listen for OpenCV progress updates
  useEffect(() => {
    const handleProgress = (e: CustomEvent) => {
      console.log('[trace] OpenCV progress:', e.detail.message)
      setProcessing(true, e.detail.message)
    }
    window.addEventListener('opencv-progress', handleProgress as EventListener)
    return () => window.removeEventListener('opencv-progress', handleProgress as EventListener)
  }, [setProcessing])

  // Emergency escape hatch - press Escape key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isProcessing) {
        console.log('[trace] ESCAPE KEY - Force canceling process')
        setProcessing(false)
        alert('Process canceled via Escape key')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isProcessing, setProcessing])

  async function trace () {
    console.log('[trace] Function called, imageDataUrl exists:', !!imageDataUrl, 'isProcessing:', isProcessing)
    if (!imageDataUrl) { console.log('[trace] skipped: no image'); return }
    if (isProcessing) { console.log('[trace] skipped: already processing'); return }
    
    console.log('[trace] Setting processing state...')
    setProcessing(true, 'Starting trace...')
    console.log('[trace] Processing state set, loading OpenCV...')
    console.time('trace-total')
    console.time('load-opencv')
    
    try {
      const cv = await loadOpenCV()
      console.log('[trace] OpenCV loaded successfully, continuing...')
      console.timeEnd('load-opencv')
    } catch (e) {
      console.error('[trace] OpenCV loading failed:', e)
      setProcessing(false)
      alert(`OpenCV loading failed: ${e}`)
      return
    }

    console.log('[trace] Starting image processing...')
    setProcessing(true, 'Loading image...')
    console.time('load-image')
    console.log('[trace] Creating image element...')
    const img = document.createElement('img')
    img.src = imageDataUrl
    console.log('[trace] Decoding image...')
    await img.decode()
    console.log('[trace] Image decoded successfully')
    console.timeEnd('load-image')

    // Yield to event loop before continuing
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Downscale if larger than maxDimension
    setProcessing(true, 'Downscaling image...')
    console.time('downscale')
    const maxDim = params.maxDimension
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
    console.log('[trace] Creating canvas for downscaling...')
    const dCanvas = document.createElement('canvas')
    dCanvas.width = Math.round(img.width * scale)
    dCanvas.height = Math.round(img.height * scale)
    const dCtx = dCanvas.getContext('2d')!
    console.log('[trace] Drawing image to canvas...')
    dCtx.drawImage(img, 0, 0, dCanvas.width, dCanvas.height)
    console.log('[trace] original size', img.width, img.height, 'scaled to', dCanvas.width, dCanvas.height)
    console.timeEnd('downscale')

    // Yield to event loop again
    await new Promise(resolve => setTimeout(resolve, 10))

    let srcMat: any
    if (params.binarize) {
      setProcessing(true, 'Binarizing image (GPU)...')
      console.time('gpu-binarize')
      const bmp = await createImageBitmap(dCanvas)
      const binImg = await gpuBinarize(bmp, {
        threshold: 0.6,
        invert: params.invertBinary,
        morphKernel: params.morphKernel,
        morphOp: params.morphKernel > 0 ? 'open' : 'none'
      })
      const canvas = document.createElement('canvas')
      canvas.width = binImg.width; canvas.height = binImg.height
      const ctx = canvas.getContext('2d')!
      ctx.putImageData(binImg, 0, 0)
      srcMat = cv.imread(canvas)
      bmp.close()
      console.timeEnd('gpu-binarize')
    } else {
      setProcessing(true, 'Processing image...')
      console.time('grayscale+blur')
      const mat = cv.imread(dCanvas)
      cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY, 0)
      cv.GaussianBlur(mat, mat, new cv.Size(3, 3), 0, 0, cv.BORDER_DEFAULT)
      srcMat = mat
      console.timeEnd('grayscale+blur')
    }

    // Offload Canny + contours + approx to a Worker to avoid main thread stalls
    setProcessing(true, 'Initializing worker...')
    console.time('worker-trace')
    console.log('[trace] Creating worker...')
    
    let worker: Worker
    try {
      // Try to create a simple test worker first
      const testWorkerCode = `
        console.log('[TestWorker] Loading...');
        self.onmessage = function(e) {
          console.log('[TestWorker] Received:', e.data);
          self.postMessage({type: 'test_response', message: 'Test worker is working'});
        };
        console.log('[TestWorker] Ready');
      `
      const testBlob = new Blob([testWorkerCode], { type: 'application/javascript' })
      const testWorkerUrl = URL.createObjectURL(testBlob)
      
      console.log('[trace] Testing with inline worker first...')
      const testWorker = new Worker(testWorkerUrl)
      testWorker.postMessage({ type: 'test' })
      testWorker.onmessage = (e) => {
        console.log('[trace] Test worker response:', e.data)
        testWorker.terminate()
        URL.revokeObjectURL(testWorkerUrl)
        
        // If test worker works, try the real one
        console.log('[trace] Test worker successful, creating real worker...')
        const workerUrl = new URL('../workers/traceWorker.js', import.meta.url)
        console.log('[trace] Worker URL:', workerUrl.href)
        worker = new Worker(workerUrl, { type: 'classic', name: 'traceWorker' })
        console.log('[trace] Worker created successfully')
        
        // Continue with the rest of the function
        continueWithWorker()
      }
      testWorker.onerror = (e) => {
        console.error('[trace] Test worker failed:', e)
        setProcessing(false)
        alert(`Test worker failed: ${e.message}`)
      }
      
      return // Exit here, continue in the callback
    } catch (e) {
      console.error('[trace] Failed to create worker:', e)
      setProcessing(false)
      alert(`Failed to create worker: ${e}`)
      return
    }
    
    function continueWithWorker() {
      console.log('[trace] Preparing data...')
      const imgData = imageDataFromCanvas(dCanvas)
      console.log('[trace] Sending to worker - size:', imgData.width, 'x', imgData.height, 'buffer bytes:', imgData.data.buffer.byteLength)
      
      // Add timeout for worker
      const workerTimeout = setTimeout(() => {
        console.error('[trace] Worker timeout after 60s, terminating...')
        worker.terminate()
        console.timeEnd('worker-trace')
        console.timeEnd('trace-total')
        setProcessing(false)
        alert('Tracing timed out. Try reducing the Max Dimension parameter or disabling binarization.')
      }, 60000)
      
      // Test if worker is responsive first
      console.log('[trace] Testing worker responsiveness...')
      worker.postMessage({ type: 'ping' })
      
      // Wait a bit then send the actual trace message
      setTimeout(() => {
        console.log('[trace] Sending trace message...')
        setProcessing(true, 'Finding edges and contours...')
        worker.postMessage({ type: 'trace', width: imgData.width, height: imgData.height, buffer: imgData.data.buffer, params }, [imgData.data.buffer])
        console.log('[trace] Message posted to worker')
      }, 100)
      
      setupWorkerHandlers(worker, workerTimeout)
    }
    
    function setupWorkerHandlers(worker: Worker, workerTimeout: NodeJS.Timeout) {
      worker.onmessage = (ev) => {
        console.log('[trace] Worker message received:', ev.data.type, ev.data)
        if (ev.data.type === 'pong') {
          console.log('[trace] Worker responded to ping:', ev.data.message)
          setProcessing(true, 'Worker is responsive...')
        } else if (ev.data.type === 'ack') {
          console.log('[trace] Worker acknowledged:', ev.data.message)
          setProcessing(true, 'Worker initialized...')
        } else if (ev.data.type === 'status') {
          console.log('[trace] Worker status:', ev.data.message)
          setProcessing(true, ev.data.message)
        } else if (ev.data.type === 'progress') {
          const { phase, current, total } = ev.data
          const progressMsg = current ? `Processing contours ${current}/${total}...` : `Found ${total} contours...`
          setProcessing(true, progressMsg)
          console.log('[trace] Progress:', phase, current ? `${current}/${total}` : `total: ${total}`)
        } else if (ev.data.type === 'metrics') {
          const m = ev.data
          console.log('[worker metrics]', m)
        } else if (ev.data.type === 'result') {
          clearTimeout(workerTimeout)
          console.timeEnd('worker-trace')
          const polys = ev.data.polygons as ReturnType<typeof useStore.getState>['contours']
          console.log('[trace] poly count:', polys.length)
          setContours(polys)
          console.timeEnd('trace-total')
          worker.terminate()
          setProcessing(false)
        } else if (ev.data.type === 'error') {
          clearTimeout(workerTimeout)
          console.timeEnd('worker-trace')
          console.error('[worker error]', ev.data.message)
          worker.terminate()
          setProcessing(false)
          alert(`Tracing failed: ${ev.data.message}`)
        }
      }
      worker.onerror = (e) => {
        clearTimeout(workerTimeout)
        console.timeEnd('worker-trace')
        console.error('[worker onerror]', e.message, e)
        worker.terminate()
        setProcessing(false)
        alert(`Worker error: ${e.message}`)
      }
    }
  }

  return (
    <div className="space-y-3">
      {isProcessing && (
        <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded text-sm">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span>{processingStatus || 'Processing...'}</span>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button onClick={() => void trace()} disabled={isProcessing}>
          {isProcessing ? 'Processing...' : 'Trace'}
        </Button>
        {isProcessing && (
          <Button onClick={() => {
            console.log('[trace] Manual cancel requested')
            setProcessing(false)
          }}>
            Cancel
          </Button>
        )}
        <label className="text-xs flex items-center gap-2">
          <input type="checkbox" defaultChecked ref={el => { if (el) autoRef.current = el.checked }} onChange={(e) => { autoRef.current = e.target.checked }} />
          Auto-refresh
        </label>
      </div>
      <Slider label="Canny T1" min={0} max={255} value={params.cannyThreshold1} onChange={(v) => setParam('cannyThreshold1', v)} />
      <Slider label="Canny T2" min={0} max={255} value={params.cannyThreshold2} onChange={(v) => setParam('cannyThreshold2', v)} />
      <Slider label="Approx Epsilon" min={0} max={20} step={0.5} value={params.approxEpsilon} onChange={(v) => setParam('approxEpsilon', v)} />
      <Slider label="Min Area" min={0} max={5000} step={10} value={params.minArea} onChange={(v) => setParam('minArea', v)} />
      <Slider label="Rectilinear Grid" min={0} max={20} value={params.rectilinearSnap} onChange={(v) => setParam('rectilinearSnap', v)} />
      <div className="space-y-2 pt-2">
        <label className="text-xs flex items-center gap-2">
          <input type="checkbox" checked={params.binarize} onChange={(e) => setParam('binarize', e.target.checked)} /> Binarize (GPU threshold)
        </label>
        <Button onClick={() => {
          console.log('[trace] Manual bypass - skipping OpenCV, generating test contours')
          setProcessing(true, 'Generating test contours...')
          setTimeout(() => {
            const testContours = [
              { id: 'test1', points: [{ x: 100, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 200 }, { x: 100, y: 200 }] },
              { id: 'test2', points: [{ x: 300, y: 150 }, { x: 400, y: 150 }, { x: 400, y: 250 }, { x: 300, y: 250 }] }
            ]
            setContours(testContours)
            setProcessing(false)
            console.log('[trace] Test contours generated')
          }, 1000)
        }} disabled={isProcessing}>
          Generate Test Contours (Bypass OpenCV)
        </Button>
        <label className="text-xs flex items-center gap-2">
          <input type="checkbox" checked={params.invertBinary} onChange={(e) => setParam('invertBinary', e.target.checked)} /> Invert binary
        </label>
        <Slider label="Morph Kernel" min={0} max={7} value={params.morphKernel} onChange={(v) => setParam('morphKernel', v)} />
        <Slider label="Max Dimension" min={800} max={4000} step={100} value={params.maxDimension} onChange={(v) => setParam('maxDimension', v)} />
      </div>
      <hr className="border-neutral-200 dark:border-neutral-800" />
      <div className="flex items-center gap-2">
        <label className="text-xs flex items-center gap-2">
          <input type="checkbox" checked={editMode} onChange={(e) => setEditMode(e.target.checked)} /> Edit vertices (drag to move, Shift-click to delete)
        </label>
      </div>
      <div className="space-y-2">
        <label className="text-xs flex items-center gap-2">
          <input type="checkbox" checked={measurement.active} onChange={(e) => setMeasurementActive(e.target.checked)} /> Measurement mode (click two points)
        </label>
        <div className="grid grid-cols-2 gap-2 items-center">
          <span className="text-xs text-neutral-600 dark:text-neutral-300">Length</span>
          <Input type="number" step="0.001" value={measurement.realLength || ''} onChange={(e) => setMeasurementInfo(Number(e.target.value || 0), measurement.units)} />
          <span className="text-xs text-neutral-600 dark:text-neutral-300">Units</span>
          <Input value={measurement.units} onChange={(e) => setMeasurementInfo(measurement.realLength, e.target.value)} />
        </div>
        <Button onClick={() => {
          const { p1, p2, realLength } = measurement
          if (p1 && p2 && realLength > 0) {
            const pixels = Math.hypot(p2.x - p1.x, p2.y - p1.y)
            setScale(pixels / realLength)
          }
        }}>Compute scale</Button>
      </div>
    </div>
  )
}


