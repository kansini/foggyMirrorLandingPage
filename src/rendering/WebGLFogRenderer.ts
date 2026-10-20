import fullscreenVertex from './shaders/fullscreen.vert.glsl?raw'
import fogFragment from './shaders/fog.frag.glsl?raw'
import blurFragment from './shaders/blur.frag.glsl?raw'
import brushVertex from './shaders/brush.vert.glsl?raw'
import brushFragment from './shaders/brush.frag.glsl?raw'
import depositFragment from './shaders/deposit.frag.glsl?raw'

export interface MirrorPoint { x: number; y: number }
interface Program { handle: WebGLProgram; locations: Map<string, WebGLUniformLocation | null> }
interface Target { texture: WebGLTexture; framebuffer: WebGLFramebuffer; width: number; height: number }
interface WaterDrop {
  point: MirrorPoint; radius: number; born: number; delay: number; lifetime: number
  phase: number; gravity: number; travel: number; velocity: number; nextPin: number; pinnedUntil: number
}

/**
 * Browser adaptation of the iOS FogRenderer / FogShaders optical pipeline.
 * Sharp and Gaussian-blurred scene textures share a persistent wipe/deposit field.
 * Red = wipe coverage, green = accumulated optical mass. No colored fog overlay.
 */
export class WebGLFogRenderer {
  amount = 1
  themeMist = 0
  private readonly fogDensity = .93
  private readonly fogSoftness = 1.18
  private readonly canvas: HTMLCanvasElement
  private readonly gl: WebGL2RenderingContext
  private readonly programs: Program[] = []
  private readonly textures = new Set<WebGLTexture>()
  private readonly framebuffers = new Set<WebGLFramebuffer>()
  private readonly floatingFields: boolean
  private fog!: Program
  private brush!: Program
  private deposit!: Program
  private blur!: Program
  private sharp!: WebGLTexture
  private fields: Target[] = []
  private blurred: Target[] = []
  private current = 0
  private width = 1
  private height = 1
  private source?: HTMLImageElement
  private dark = false
  private style = 0
  private active = true
  private motion = true
  private disposed = false
  private frame = 0
  private drops: WaterDrop[] = []
  private lastTime = 0
  private readonly waterOrigin = new Float32Array(16)
  private readonly waterMotion = new Float32Array(16)

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const gl = canvas.getContext('webgl2', {
      alpha: true, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: false, powerPreference: 'low-power',
    })
    if (!gl) throw new Error('WebGL 2 is unavailable')
    this.gl = gl
    this.floatingFields = Boolean(gl.getExtension('EXT_color_buffer_float'))
    try {
      this.fog = this.program(fullscreenVertex, fogFragment)
      this.brush = this.program(brushVertex, brushFragment)
      this.deposit = this.program(fullscreenVertex, depositFragment)
      this.blur = this.program(fullscreenVertex, blurFragment)
      this.sharp = this.texture()
      gl.disable(gl.DEPTH_TEST)
      gl.disable(gl.DITHER)
    } catch (error) {
      this.dispose()
      throw error
    }
  }

  private program(vertex: string, fragment: string): Program {
    const gl = this.gl
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)
      if (!shader) throw new Error('Unable to allocate shader')
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader)
        gl.deleteShader(shader)
        throw new Error('Fog shader compilation failed: ' + message)
      }
      return shader
    }
    const vs = compile(gl.VERTEX_SHADER, vertex)
    let fs: WebGLShader | undefined
    let handle: WebGLProgram | null = null
    try {
      fs = compile(gl.FRAGMENT_SHADER, fragment)
      handle = gl.createProgram()
      if (!handle) throw new Error('Unable to allocate shader program')
      gl.attachShader(handle, vs)
      gl.attachShader(handle, fs)
      gl.linkProgram(handle)
      if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) throw new Error('Fog shader linking failed: ' + gl.getProgramInfoLog(handle))
      const program = { handle, locations: new Map<string, WebGLUniformLocation | null>() }
      this.programs.push(program)
      return program
    } catch (error) {
      if (handle) gl.deleteProgram(handle)
      throw error
    } finally {
      gl.deleteShader(vs)
      if (fs) gl.deleteShader(fs)
    }
  }

  private uniform(program: Program, name: string) {
    if (!program.locations.has(name)) program.locations.set(name, this.gl.getUniformLocation(program.handle, name))
    return program.locations.get(name)!
  }

  private texture() {
    const gl = this.gl
    const texture = gl.createTexture()
    if (!texture) throw new Error('Unable to allocate fog texture')
    this.textures.add(texture)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return texture
  }

  private target(width: number, height: number, floating = false): Target {
    const gl = this.gl
    const texture = this.texture()
    gl.texImage2D(gl.TEXTURE_2D, 0, floating ? gl.RGBA16F : gl.RGBA8, width, height, 0, gl.RGBA, floating ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null)
    const framebuffer = gl.createFramebuffer()
    if (!framebuffer) throw new Error('Unable to allocate fog framebuffer')
    this.framebuffers.add(framebuffer)
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Incomplete fog framebuffer')
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    return { texture, framebuffer, width, height }
  }

  private release(target: Target) {
    this.gl.deleteTexture(target.texture)
    this.gl.deleteFramebuffer(target.framebuffer)
    this.textures.delete(target.texture)
    this.framebuffers.delete(target.framebuffer)
  }

  private bind(program: Program, name: string, texture: WebGLTexture, unit: number) {
    const gl = this.gl
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.uniform1i(this.uniform(program, name), unit)
  }

  resize(width: number, height: number) {
    if (this.disposed || width <= 0 || height <= 0) return
    const gl = this.gl
    this.width = width
    this.height = height
    const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(1_250_000 / (width * height)), maxSize / width, maxSize / height)
    const w = Math.max(1, Math.round(width * ratio))
    const h = Math.max(1, Math.round(height * ratio))
    if (this.fields.length && this.canvas.width === w && this.canvas.height === h) {
      this.invalidate()
      return
    }
    const old = this.fields[this.current]
    this.canvas.width = w
    this.canvas.height = h
    gl.disable(gl.BLEND)
    gl.colorMask(true, true, true, true)
    // Half-float accumulation retains the small increments of a slow breath.
    const next = [this.target(w, h, this.floatingFields), this.target(w, h, this.floatingFields)]
    if (old) {
      // GPU resampling preserves chronological wipe/refog history on resize.
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, old.framebuffer)
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, next[0]!.framebuffer)
      gl.blitFramebuffer(0, 0, old.width, old.height, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.LINEAR)
    }
    this.fields.forEach(target => this.release(target))
    this.blurred.forEach(target => this.release(target))
    this.fields = next
    this.current = 0
    this.blurred = [this.target(w, h), this.target(w, h)]
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    if (this.source) this.prepareScene()
  }

  setScene(source: HTMLImageElement) {
    this.source = source
    if (this.fields.length) this.prepareScene()
  }

  private prepareScene() {
    if (!this.source) return
    const gl = this.gl
    const fitted = document.createElement('canvas')
    fitted.width = this.canvas.width
    fitted.height = this.canvas.height
    const ctx = fitted.getContext('2d')
    if (!ctx) throw new Error('Unable to prepare scene pixels')
    const scale = Math.max(fitted.width / this.source.naturalWidth, fitted.height / this.source.naturalHeight)
    const w = this.source.naturalWidth * scale
    const h = this.source.naturalHeight * scale
    ctx.drawImage(this.source, (fitted.width - w) / 2, (fitted.height - h) * .4, w, h)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.sharp)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fitted)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.viewport(0, 0, fitted.width, fitted.height)
    gl.disable(gl.BLEND)
    gl.useProgram(this.blur.handle)
    const radius = (8 + 13 * this.fogDensity) * .5 * this.fogSoftness
    for (let pass = 0; pass < 2; pass++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.blurred[pass]!.framebuffer)
      this.bind(this.blur, 'u_source', pass === 0 ? this.sharp : this.blurred[0]!.texture, 0)
      gl.uniform2f(this.uniform(this.blur, 'u_axis'), pass === 0 ? radius / this.width : 0, pass === 1 ? radius / this.height : 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    this.invalidate()
  }

  setStyle(mood: string, dark: boolean) {
    this.style = Math.max(0, ['morning', 'rain', 'vintage', 'moon'].indexOf(mood))
    this.dark = dark
    this.invalidate()
  }

  stroke(start: MirrorPoint, end: MirrorPoint, startRadius: number, endRadius: number) {
    if (this.disposed || !this.fields.length) return
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fields[this.current]!.framebuffer)
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.useProgram(this.brush.handle)
    gl.uniform2f(this.uniform(this.brush, 'u_points'), this.width, this.height)
    gl.uniform4f(this.uniform(this.brush, 'u_segment'), start.x, start.y, end.x, end.y)
    gl.uniform3f(this.uniform(this.brush, 'u_brush'), startRadius, endRadius, Math.max(.65, endRadius * .08))
    gl.enable(gl.BLEND)
    gl.blendEquation(gl.MAX)
    gl.blendFunc(gl.ONE, gl.ONE)
    gl.colorMask(true, false, false, false)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    gl.colorMask(true, true, true, true)
    gl.disable(gl.BLEND)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    this.invalidate()
  }

  refog(previous: number, progress: number) {
    if (this.disposed || !this.fields.length || progress <= previous) return
    const gl = this.gl
    const next = 1 - this.current
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fields[next]!.framebuffer)
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.disable(gl.BLEND)
    gl.useProgram(this.deposit.handle)
    this.bind(this.deposit, 'u_field', this.fields[this.current]!.texture, 0)
    gl.uniform2f(this.uniform(this.deposit, 'u_points'), this.width, this.height)
    gl.uniform2f(this.uniform(this.deposit, 'u_progress'), previous, progress)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    this.current = next
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    this.invalidate()
  }

  clearField() {
    if (this.disposed) return
    const gl = this.gl
    this.drops = []
    gl.colorMask(true, true, true, true)
    gl.clearColor(0, 0, 0, 1)
    for (const target of this.fields) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    this.invalidate()
  }

  finishStroke(point: MirrorPoint, radius: number) {
    if (!this.motion || this.amount < .01) return
    const now = performance.now() / 1000
    this.drops.push({
      point: { x: point.x, y: Math.min(.97, point.y + radius * .8 / this.height) },
      radius, born: now, delay: .3 + Math.random() * .5, lifetime: 23 + Math.random() * 8,
      phase: Math.random() * 100, gravity: 22 + Math.random() * 12,
      travel: 0, velocity: 0, nextPin: 12 + Math.random() * 16, pinnedUntil: 0,
    })
    if (this.drops.length > 4) this.drops.shift()
    this.invalidate()
  }

  private updateWater(time: number) {
    const dt = Math.min(.08, Math.max(0, time - (this.lastTime || time)))
    this.lastTime = time
    this.drops = this.drops.filter(drop => time - drop.born < drop.lifetime)
    this.waterOrigin.fill(0)
    this.waterMotion.fill(0)
    this.drops.forEach((drop, index) => {
      const age = time - drop.born
      if (age <= drop.delay) return
      const limit = Math.max(0, Math.min(this.height * .45, (1 - drop.point.y) * this.height - 24))
      if (time > drop.pinnedUntil && drop.travel < limit) {
        drop.velocity = Math.max(0, drop.velocity + (drop.gravity - .9 * drop.velocity) * dt)
        drop.travel = Math.min(limit, drop.travel + drop.velocity * dt)
        if (drop.travel > drop.nextPin) {
          drop.velocity *= .08
          drop.pinnedUntil = time + .25 + Math.random() * .6
          drop.nextPin = drop.travel + 14 + Math.random() * 20
        }
      }
      const evaporation = Math.max(0, Math.min(1, (drop.lifetime - age) / 5))
      const width = (2.2 + (drop.phase % 1) * 1.2) * Math.max(.35, evaporation)
      const emergence = Math.min(1, (age - drop.delay) / .3)
      this.waterOrigin.set([drop.point.x, drop.point.y, width, drop.phase], index * 4)
      this.waterMotion.set([drop.travel, evaporation * emergence, 2.4 + width, 0], index * 4)
    })
  }

  setMotion(enabled: boolean) {
    this.motion = enabled
    if (!enabled) this.drops = []
    this.invalidate()
  }

  setActive(active: boolean) {
    this.active = active
    this.lastTime = 0
    if (!active) { cancelAnimationFrame(this.frame); this.frame = 0 }
    else this.invalidate()
  }

  invalidate = () => {
    if (!this.disposed && this.active && !this.frame && this.source && this.fields.length) this.frame = requestAnimationFrame(this.draw)
  }

  private draw = (milliseconds: number) => {
    this.frame = 0
    if (this.disposed || !this.active || !this.source || !this.fields.length) return
    const gl = this.gl
    this.updateWater(milliseconds / 1000)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.disable(gl.BLEND)
    gl.useProgram(this.fog.handle)
    this.bind(this.fog, 'u_sharp', this.sharp, 0)
    this.bind(this.fog, 'u_blurred', this.blurred[1]!.texture, 1)
    this.bind(this.fog, 'u_field', this.fields[this.current]!.texture, 2)
    gl.uniform2f(this.uniform(this.fog, 'u_points'), this.width, this.height)
    gl.uniform1f(this.uniform(this.fog, 'u_density'), Math.min(.99, this.fogDensity + this.themeMist * .04))
    gl.uniform1f(this.uniform(this.fog, 'u_amount'), this.amount)
    gl.uniform1f(this.uniform(this.fog, 'u_dark'), this.dark ? 1 : 0)
    gl.uniform1i(this.uniform(this.fog, 'u_style'), this.style)
    gl.uniform1i(this.uniform(this.fog, 'u_waterCount'), this.drops.length)
    gl.uniform4fv(this.uniform(this.fog, 'u_waterOrigin[0]'), this.waterOrigin)
    gl.uniform4fv(this.uniform(this.fog, 'u_waterMotion[0]'), this.waterMotion)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    if (this.drops.length) this.invalidate()
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    cancelAnimationFrame(this.frame)
    this.programs.forEach(program => this.gl.deleteProgram(program.handle))
    this.textures.forEach(texture => this.gl.deleteTexture(texture))
    this.framebuffers.forEach(framebuffer => this.gl.deleteFramebuffer(framebuffer))
    this.programs.length = 0
    this.textures.clear()
    this.framebuffers.clear()
    this.source = undefined
    this.drops = []
  }
}
