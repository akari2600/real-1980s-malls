# Mall Directory Tracer – Open Issues

This file summarizes current problems observed while tracing high‑resolution newspaper scans and options to investigate.

## Symptoms
- UI becomes unresponsive after pasting an image and starting trace.
- Console shows paste logs and "[trace] auto kick" but nothing after, or stops at "worker-trace" with no metrics.
- Tracing can take >60s with no visible progress.

## Current Pipeline (as of this commit)
1. Paste/upload image → create HTMLImageElement
2. Downscale to `maxDimension` (default 2200) on a 2D canvas
3. GPU WebGL binarize (threshold + optional morphology)
4. Send ImageData to Web Worker
5. Worker loads OpenCV.js (WASM) and runs: grayscale → Canny → findContours → approxPolyDP → filter by area
6. Main thread receives polygons; rectilinear snapping is applied in the renderer

## Likely Bottlenecks
- Worker startup and OpenCV.js initialization inside worker (WASM compile/instantiate)
- Large ImageData transfer to worker (structured clone + transfer), still heavy at ~2200px dimension
- Canny/contours in WASM (single‑threaded build from docs site; no SIMD/threads)
- WebGL readback (GPU → CPU) after binarize

## Immediate Debug Tasks
- [ ] Log worker start/end, onerror, and measure time to first "metrics"
- [ ] Add log for bytes transferred to worker (ImageData length)
- [ ] Temporarily bypass GPU step and worker; run a tiny 800px trace to verify CV path
- [ ] Reduce `maxDimension` to 1400 and re‑measure

## Structural Fixes (next steps)
- [ ] Serve OpenCV.js locally and preload once on page load; reuse in worker via `SharedArrayBuffer` or pass `cv.dataFile` cache
- [ ] Provide a prebuilt OpenCV.js with SIMD and pthreads; enable COOP/COEP headers in Vite dev and build to allow threads
- [ ] Keep a persistent worker between traces; ping‑pong transferable buffers rather than recreating worker each time
- [ ] Optionally skip WebGL step and do `cv.threshold` if GPU readback dominates
- [ ] Implement progressive downscaling: trace at 1200px to preview, then refine at 1800–2200px on demand

## UX/Controls to Add
- [ ] Performance preset: Fast / Balanced / High detail (sets `maxDimension`, `minArea`, `approxEpsilon`, thresholds)
- [ ] "Preview first" checkbox: run fast/low‑res pass automatically, then queue high‑res
- [ ] Progress bar: emit phase markers from worker (init → canny → contours → approx)

## Notes
- WebGPU path would require a different stack for Canny/contours; not trivial but possible.
- Newspaper scans vary widely; robust path likely includes binarize + downscale + area filtering.

## Repro Info (from user)
- High‑res paste; console showed paste logs, then no further output for >60s; page busy.
