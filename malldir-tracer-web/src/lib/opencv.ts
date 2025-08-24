import * as wasmFeatureDetect from 'wasm-feature-detect'

let cvPromise: Promise<any> | null = null

export async function loadOpenCV (): Promise<any> {
  if (cvPromise) return cvPromise
  cvPromise = (async () => {
    console.log('[loadOpenCV] Starting OpenCV load...')
    await wasmFeatureDetect.simd().catch(() => false)
    
    // Try local version first, then fallback to CDN
    const scriptUrls = ['/opencv.js', 'https://docs.opencv.org/4.x/opencv.js']
    
    for (const scriptUrl of scriptUrls) {
      console.log('[loadOpenCV] Trying:', scriptUrl)
      try {
        const cv = await new Promise<any>((resolve, reject) => {
          // Add timeout - reduced to 15 seconds for faster feedback
          const timeout = setTimeout(() => {
            reject(new Error(`OpenCV loading timeout for ${scriptUrl} (15s limit)`))
          }, 15000)
          
          const s = document.createElement('script')
          s.async = true
          s.src = scriptUrl
          s.onerror = () => {
            clearTimeout(timeout)
            reject(new Error(`Failed to load OpenCV.js from ${scriptUrl}`))
          }
          s.onload = () => {
            console.log('[loadOpenCV] Script loaded from:', scriptUrl)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cvAny: any = (window as any).cv
            if (!cvAny) { 
              clearTimeout(timeout)
              reject(new Error('cv not found on window')); 
              return 
            }
            console.log('[loadOpenCV] cv object found, waiting for runtime...')
            
            // Add progress updates during runtime initialization
            let progressInterval: NodeJS.Timeout
            let progressCount = 0
            
            const startProgress = () => {
              progressInterval = setInterval(() => {
                progressCount++
                console.log(`[loadOpenCV] Runtime initialization in progress... ${progressCount * 2}s elapsed`)
                // Dispatch custom event for UI updates
                window.dispatchEvent(new CustomEvent('opencv-progress', { 
                  detail: { message: `Initializing OpenCV runtime... ${progressCount * 2}s` }
                }))
              }, 2000)
            }
            
            const stopProgress = () => {
              if (progressInterval) clearInterval(progressInterval)
            }
            
            startProgress()
            
            cvAny['onRuntimeInitialized'] = () => {
              clearTimeout(timeout)
              stopProgress()
              console.log('[loadOpenCV] Runtime initialized successfully')
              resolve(cvAny)
            }
          }
          document.head.appendChild(s)
        })
        console.log('[loadOpenCV] Successfully loaded from:', scriptUrl)
        return cv
      } catch (e) {
        console.warn('[loadOpenCV] Failed to load from:', scriptUrl, e)
        if (scriptUrl === scriptUrls[scriptUrls.length - 1]) {
          throw e // Re-throw if this was the last URL
        }
      }
    }
  })()
  return cvPromise
}


