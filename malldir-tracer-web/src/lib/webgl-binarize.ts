// Minimal WebGL pipeline to binarize and optionally apply morphology on GPU.
// Returns ImageData with 8-bit RGBA where R=G=B is the binary mask.

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main(){
  v_uv = (a_pos + 1.0) * 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

const FRAG_THRESHOLD = `
precision mediump float;
uniform sampler2D u_img;
uniform float u_threshold; // 0..1
uniform bool u_invert;
varying vec2 v_uv;
void main(){
  vec4 c = texture2D(u_img, v_uv);
  float g = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  float v = step(u_threshold, g);
  if (u_invert) v = 1.0 - v;
  gl_FragColor = vec4(vec3(v), 1.0);
}`

const FRAG_MORPH = `
precision mediump float;
uniform sampler2D u_img;
uniform vec2 u_texel;
uniform int u_radius;
uniform int u_mode; // 0 erode, 1 dilate
varying vec2 v_uv;
void main(){
  float res = (u_mode == 0) ? 1.0 : 0.0;
  const int MAX_R = 8;
  for (int dy = -MAX_R; dy <= MAX_R; dy++){
    for (int dx = -MAX_R; dx <= MAX_R; dx++){
      if (abs(dy) > u_radius || abs(dx) > u_radius) continue;
      float s = texture2D(u_img, v_uv + vec2(float(dx), float(dy)) * u_texel).r;
      if (u_mode == 0) res = min(res, s); else res = max(res, s);
    }
  }
  gl_FragColor = vec4(vec3(res), 1.0);
}`

function createGL (w: number, h: number): WebGLRenderingContext {
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const gl = (canvas.getContext('webgl', { premultipliedAlpha: false }) || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
  if (!gl) throw new Error('WebGL not supported')
  return gl
}

function compile (gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(String(gl.getShaderInfoLog(sh)))
  return sh
}

function program (gl: WebGLRenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs))
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs))
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(String(gl.getProgramInfoLog(p)))
  return p
}

function createTextureFromBitmap (gl: WebGLRenderingContext, bmp: ImageBitmap) {
  const tex = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  // Upload by drawing into a 2D canvas then using texImage2D with pixels
  const c2d = document.createElement('canvas')
  c2d.width = bmp.width; c2d.height = bmp.height
  const ctx2d = c2d.getContext('2d')!
  ctx2d.drawImage(bmp, 0, 0)
  const imgData = ctx2d.getImageData(0, 0, bmp.width, bmp.height)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, bmp.width, bmp.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, imgData.data)
  return tex
}

function createFramebufferTexture (gl: WebGLRenderingContext, w: number, h: number) {
  const tex = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  const fb = gl.createFramebuffer()!
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  return { tex, fb }
}

function drawFullScreen (gl: WebGLRenderingContext, prog: WebGLProgram) {
  gl.useProgram(prog)
  const buf = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  // Tri-strip covering screen
  const verts = new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    1, 1,
  ])
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'a_pos')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  gl.disableVertexAttribArray(loc)
  gl.deleteBuffer(buf)
}

export type MorphOp = 'none' | 'open' | 'close'

export async function gpuBinarize (bmp: ImageBitmap, opts: { threshold?: number, invert?: boolean, morphKernel?: number, morphOp?: MorphOp } = {}): Promise<ImageData> {
  const width = bmp.width; const height = bmp.height
  const gl = createGL(width, height)
  gl.viewport(0, 0, width, height)

  const pThresh = program(gl, VERT, FRAG_THRESHOLD)
  const pMorph = program(gl, VERT, FRAG_MORPH)

  const inputTex = createTextureFromBitmap(gl, bmp)
  const a = createFramebufferTexture(gl, width, height)
  const b = createFramebufferTexture(gl, width, height)

  // Pass 1: threshold
  gl.bindFramebuffer(gl.FRAMEBUFFER, a.fb)
  gl.useProgram(pThresh)
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, inputTex)
  gl.uniform1i(gl.getUniformLocation(pThresh, 'u_img'), 0)
  gl.uniform1f(gl.getUniformLocation(pThresh, 'u_threshold'), (opts.threshold ?? 0.5))
  gl.uniform1i(gl.getUniformLocation(pThresh, 'u_invert'), opts.invert ? 1 : 0)
  drawFullScreen(gl, pThresh)

  // Morphology if requested
  const radius = Math.max(0, Math.min(8, Math.floor((opts.morphKernel ?? 0) / 2)))
  const op = opts.morphOp ?? 'none'
  if (radius > 0 && op !== 'none') {
    const texelLoc = gl.getUniformLocation(pMorph, 'u_texel')
    const radiusLoc = gl.getUniformLocation(pMorph, 'u_radius')
    const modeLoc = gl.getUniformLocation(pMorph, 'u_mode')
    // Helper to run one morph pass
    const runMorph = (srcTex: WebGLTexture, dstFb: WebGLFramebuffer, mode: number) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dstFb)
      gl.useProgram(pMorph)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, srcTex)
      gl.uniform1i(gl.getUniformLocation(pMorph, 'u_img'), 0)
      gl.uniform2f(texelLoc, 1 / width, 1 / height)
      gl.uniform1i(radiusLoc, radius)
      gl.uniform1i(modeLoc, mode)
      drawFullScreen(gl, pMorph)
    }
    if (op === 'open') {
      runMorph(a.tex, b.fb, 0) // erode
      runMorph(b.tex, a.fb, 1) // dilate
    } else if (op === 'close') {
      runMorph(a.tex, b.fb, 1) // dilate
      runMorph(b.tex, a.fb, 0) // erode
    }
  }

  // Read back
  const out = new Uint8Array(width * height * 4)
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, out)
  // Flip Y because WebGL has origin at bottom-left
  const row = width * 4
  const flipped = new Uint8ClampedArray(out.length)
  for (let y = 0; y < height; y++) {
    flipped.set(out.subarray((height - 1 - y) * row, (height - y) * row), y * row)
  }
  return new ImageData(flipped, width, height)
}


