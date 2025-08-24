// Classic worker. Loads OpenCV.js via importScripts, then performs Canny/contours/approx.
let cvReady = false
let cv

function ensureCV () {
  return new Promise((resolve, reject) => {
    console.log('[Worker] ensureCV called, cvReady:', cvReady)
    if (cvReady) { 
      console.log('[Worker] OpenCV already ready, returning cached')
      resolve(cv); 
      return 
    }
    
    // Add timeout for OpenCV initialization
    const timeout = setTimeout(() => {
      console.error('[Worker] OpenCV initialization timeout after 30s')
      reject(new Error('OpenCV initialization timeout'))
    }, 30000)
    
    console.log('[Worker] Starting importScripts for OpenCV.js...')
    const importStart = Date.now()
    
    try {
      // Try local version first, fallback to CDN if not available
      try {
        self.importScripts('/opencv.js')
        console.log('[Worker] importScripts completed (local) in', Date.now() - importStart, 'ms')
      } catch (localError) {
        console.warn('[Worker] Local OpenCV.js failed, trying CDN...', localError)
        self.importScripts('https://docs.opencv.org/4.x/opencv.js')
        console.log('[Worker] importScripts completed (CDN) in', Date.now() - importStart, 'ms')
      }
    } catch (e) {
      clearTimeout(timeout)
      console.error('[Worker] importScripts failed (both local and CDN):', e)
      reject(e); 
      return
    }
    
    // eslint-disable-next-line no-undef
    cv = self.cv
    if (!cv) { 
      clearTimeout(timeout)
      console.error('[Worker] cv object not found after import')
      reject(new Error('cv not found')); 
      return 
    }
    
    console.log('[Worker] cv object found, waiting for onRuntimeInitialized...')
    // eslint-disable-next-line no-undef
    cv['onRuntimeInitialized'] = () => {
      clearTimeout(timeout)
      console.log('[Worker] OpenCV runtime initialized')
      cvReady = true
      resolve(cv)
    }
  })
}

console.log('[Worker] Worker script loaded and ready')

self.onmessage = async (ev) => {
  const { type } = ev.data || {}
  console.log('[Worker] Received message, type:', type)
  
  // Send immediate acknowledgment
  self.postMessage({ type: 'ack', message: 'Worker received message' })
  
  try {
    if (type === 'ping') {
      console.log('[Worker] Received ping, sending pong')
      self.postMessage({ type: 'pong', message: 'Worker is responsive' })
      return
    }
    
    if (type === 'trace') {
      const { width, height, buffer, params } = ev.data
      console.log('[Worker] Trace params:', { width, height, bufferSize: buffer.byteLength, params })
      
      // Send status update
      self.postMessage({ type: 'status', message: 'Initializing OpenCV...' })
      
      const t0 = Date.now()
      await ensureCV()
      const t1 = Date.now()
      console.log('[Worker] OpenCV ready, took', t1 - t0, 'ms')
      
      // Send status update
      self.postMessage({ type: 'status', message: 'OpenCV loaded, processing image...' })
      
      console.log('[Worker] Creating Uint8ClampedArray from buffer...')
      const data = new Uint8ClampedArray(buffer)
      // Construct ImageData then Mat
      console.log('[Worker] Creating ImageData...')
      const imgData = new ImageData(data, width, height)
      // eslint-disable-next-line no-undef
      console.log('[Worker] Creating Mat from ImageData...')
      let mat = cv.matFromImageData(imgData)
      // Convert RGBA to Gray if needed (binary case can also be RGBA of 0/255)
      // It is cheap and ensures Canny gets a single channel
      // eslint-disable-next-line no-undef
      console.log('[Worker] Converting to grayscale...')
      cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY, 0)

      // eslint-disable-next-line no-undef
      const edges = new cv.Mat()
      // eslint-disable-next-line no-undef
      console.log('[Worker] Running Canny edge detection...')
      const cannyStart = Date.now()
      cv.Canny(mat, edges, params.cannyThreshold1, params.cannyThreshold2, 3, false)
      console.log('[Worker] Canny completed in', Date.now() - cannyStart, 'ms')
      
      // eslint-disable-next-line no-undef
      const contours = new cv.MatVector(); const hierarchy = new cv.Mat()
      // eslint-disable-next-line no-undef
      console.log('[Worker] Finding contours...')
      const contourStart = Date.now()
      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
      console.log('[Worker] Found', contours.size(), 'contours in', Date.now() - contourStart, 'ms')
      
      self.postMessage({ type: 'progress', phase: 'processing_contours', total: contours.size() })
      
      const polys = []
      console.log('[Worker] Processing contours with approxPolyDP...')
      const approxStart = Date.now()
      for (let i = 0; i < contours.size(); i++) {
        if (i % 100 === 0 && i > 0) {
          console.log('[Worker] Processed', i, '/', contours.size(), 'contours')
          self.postMessage({ type: 'progress', phase: 'processing_contours', current: i, total: contours.size() })
        }
        const cnt = contours.get(i)
        // eslint-disable-next-line no-undef
        const approx = new cv.Mat()
        // eslint-disable-next-line no-undef
        cv.approxPolyDP(cnt, approx, params.approxEpsilon, true)
        const pts = []
        for (let r = 0; r < approx.rows; r++) {
          const p = approx.intPtr(r)
          pts.push({ x: p[0], y: p[1] })
        }
        // eslint-disable-next-line no-undef
        const area = cv.contourArea(cnt)
        if (area >= params.minArea && pts.length >= 3) polys.push({ id: `c${i}`, points: pts })
        approx.delete(); cnt.delete()
      }
      console.log('[Worker] Contour processing completed in', Date.now() - approxStart, 'ms')
      console.log('[Worker] Filtered to', polys.length, 'polygons (minArea:', params.minArea, ')')
      
      mat.delete(); edges.delete(); contours.delete(); hierarchy.delete()
      const t2 = Date.now()
      // Send metrics and result
      console.log('[Worker] Total processing time:', t2 - t1, 'ms')
      self.postMessage({ type: 'metrics', opencvInitMs: t1 - t0, traceMs: t2 - t1, polys: polys.length })
      self.postMessage({ type: 'result', polygons: polys })
    }
  } catch (e) {
    console.error('[Worker] Error during processing:', e)
    self.postMessage({ type: 'error', message: String(e), stack: e.stack })
  }
}

self.onerror = (e) => {
  console.error('[Worker] Global error:', e)
  self.postMessage({ type: 'error', message: `Worker error: ${e.message}` })
}


