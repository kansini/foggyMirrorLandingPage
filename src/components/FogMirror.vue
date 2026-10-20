<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import gsap from 'gsap'
import AppIcon from './AppIcon.vue'
import type { MirrorLabels } from '../content'

const props = withDefaults(defineProps<{ mood?: string; dark?: boolean; labels: MirrorLabels }>(), {
  mood: 'morning', dark: false,
})
const canvas = ref<HTMLCanvasElement>()
const surface = ref<HTMLDivElement>()
const cursor = ref<HTMLSpanElement>()
const wave = ref<HTMLSpanElement>()
const drawingMode = ref(false)
const hasCanvas = ref(true)
type Point = { x: number; y: number }
let strokes: Point[][] = []
let activeStroke: Point[] | undefined
let observer: ResizeObserver | undefined
let photo: HTMLImageElement | undefined
let texture: HTMLCanvasElement | undefined
let pointerId: number | undefined
let width = 1
let height = 1
let ratio = 1
let heartTween: gsap.core.Tween | undefined
let breathTween: gsap.core.Timeline | undefined
let introduction: gsap.core.Tween | undefined
let moveX: ReturnType<typeof gsap.quickTo> | undefined
let moveY: ReturnType<typeof gsap.quickTo> | undefined
let reducedMotion: MediaQueryList | undefined

function erase(points: Point[]) {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx || !points.length) return
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.lineWidth = Math.min(width, height) * 0.057
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(points[0]!.x * width, points[0]!.y * height)
  if (points.length === 1) ctx.lineTo(points[0]!.x * width + 0.1, points[0]!.y * height + 0.1)
  else points.slice(1).forEach(p => ctx.lineTo(p.x * width, p.y * height))
  ctx.stroke()
  ctx.restore()
}

function repaint() {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx || !texture) return
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(texture, 0, 0, width, height)
  strokes.forEach(erase)
}

function buildTexture() {
  if (!canvas.value) return
  texture ??= document.createElement('canvas')
  texture.width = canvas.value.width
  texture.height = canvas.value.height
  const ctx = texture.getContext('2d')
  if (!ctx) return
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  if (photo?.complete && photo.naturalWidth) {
    const scale = Math.max(width / photo.naturalWidth, height / photo.naturalHeight)
    const w = photo.naturalWidth * scale
    const h = photo.naturalHeight * scale
    ctx.save()
    ctx.filter = 'blur(24px)'
    ctx.drawImage(photo, (width - w) / 2 - 30, (height - h) * 0.4 - 30, w + 60, h + 60)
    ctx.restore()
  }
  const light: Record<string, [string, string]> = {
    morning: ['rgba(171, 195, 202, .84)', 'rgba(112, 148, 164, .87)'],
    rain: ['rgba(130, 160, 177, .90)', 'rgba(76, 113, 140, .94)'],
    vintage: ['rgba(194, 182, 153, .88)', 'rgba(137, 135, 118, .93)'],
    moon: ['rgba(151, 169, 199, .90)', 'rgba(91, 112, 153, .94)'],
  }
  const dark: Record<string, [string, string]> = {
    morning: ['rgba(48, 79, 90, .94)', 'rgba(24, 48, 62, .97)'],
    rain: ['rgba(36, 66, 89, .96)', 'rgba(18, 35, 57, .98)'],
    vintage: ['rgba(82, 77, 62, .95)', 'rgba(40, 47, 45, .98)'],
    moon: ['rgba(53, 66, 104, .96)', 'rgba(26, 33, 61, .98)'],
  }
  const palette = props.dark ? dark : light
  const colors = palette[props.mood] || palette.morning!
  const fog = ctx.createLinearGradient(0, 0, width, height)
  fog.addColorStop(0, colors[0])
  fog.addColorStop(1, colors[1])
  ctx.fillStyle = fog
  ctx.fillRect(0, 0, width, height)
  let seed = 17
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const drops = Math.min(3200, Math.round(width * height / 360))
  for (let i = 0; i < drops; i++) {
    const x = random() * width
    const y = random() * height
    const r = 0.4 + random() ** 3 * 3.8
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * 1.3, -0.15, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(236, 248, 250,' + (0.08 + random() * 0.2) + ')'
    ctx.fill()
    if (r > 1.4) {
      ctx.beginPath()
      ctx.ellipse(x, y + 0.7, r, r * 1.3, -0.15, 0, Math.PI)
      ctx.strokeStyle = 'rgba(25, 54, 75, .18)'
      ctx.lineWidth = 0.7
      ctx.stroke()
    }
  }
  repaint()
}

function finishPointer() {
  if (pointerId !== undefined && canvas.value?.hasPointerCapture(pointerId)) canvas.value.releasePointerCapture(pointerId)
  pointerId = undefined
  activeStroke = undefined
  if (cursor.value) gsap.to(cursor.value, { scale: 1, duration: 0.2 })
}

function interruptAnimation() {
  introduction?.kill()
  heartTween?.kill()
  breathTween?.kill()
  if (canvas.value) gsap.set(canvas.value, { clearProps: 'clipPath,opacity' })
}

function reset() {
  interruptAnimation()
  finishPointer()
  strokes = []
  repaint()
  if (reducedMotion?.matches || !canvas.value) return
  breathTween = gsap.timeline()
    .fromTo(canvas.value, { clipPath: 'circle(0% at 50% 52%)' }, {
      clipPath: 'circle(150% at 50% 52%)', duration: 1.65, ease: 'power2.out',
      clearProps: 'clipPath',
    }, 0)
  if (wave.value) {
    breathTween.fromTo(wave.value, { scale: 0.1, opacity: 0.65 }, {
      scale: 5, opacity: 0, duration: 1.6, ease: 'power2.out',
    }, 0)
  }
}

function drawHeart() {
  interruptAnimation()
  if (strokes.length >= 80) { strokes = []; repaint() }
  const size = Math.min(width, height)
  const center = { x: width > height ? 0.76 : 0.72, y: width > height ? 0.48 : 0.49 }
  const points: Point[] = []
  for (let i = 0; i <= 120; i++) {
    const t = i / 120 * Math.PI * 2
    points.push({
      x: center.x + (16 * Math.sin(t) ** 3) * size / (width * 125),
      y: center.y - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * size / (height * 125),
    })
  }
  const stroke: Point[] = [points[0]!]
  strokes.push(stroke)
  if (reducedMotion?.matches) { stroke.push(...points.slice(1)); repaint(); return }
  const progress = { index: 0 }
  let previous = 0
  heartTween = gsap.to(progress, {
    index: 120, duration: 1.55, ease: 'power1.inOut',
    onUpdate: () => {
      const next = Math.floor(progress.index)
      if (next > previous) {
        erase(points.slice(previous, next + 1))
        stroke.push(...points.slice(previous + 1, next + 1))
        previous = next
      }
    },
  })
}

function clear() {
  interruptAnimation()
  finishPointer()
  gsap.to(canvas.value!, { opacity: 0, duration: reducedMotion?.matches ? 0 : 0.9, ease: 'power2.out' })
}

function point(event: PointerEvent): Point {
  const rect = canvas.value!.getBoundingClientRect()
  return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }
}

function start(event: PointerEvent) {
  if ((event.pointerType === 'touch' && !drawingMode.value) || pointerId !== undefined || (event.pointerType === 'mouse' && event.button !== 0)) return
  interruptAnimation()
  if (strokes.length >= 80) { strokes = []; repaint() }
  pointerId = event.pointerId
  canvas.value?.setPointerCapture(event.pointerId)
  activeStroke = [point(event)]
  strokes.push(activeStroke)
  erase(activeStroke)
  if (cursor.value) gsap.to(cursor.value, { scale: 0.65, duration: 0.2 })
}

function move(event: PointerEvent) {
  const rect = surface.value!.getBoundingClientRect()
  if (event.pointerType === 'mouse') {
    moveX?.(event.clientX - rect.left)
    moveY?.(event.clientY - rect.top)
  }
  if (!activeStroke || event.pointerId !== pointerId || activeStroke.length >= 1800) return
  const last = activeStroke[activeStroke.length - 1]!
  const next = point(event)
  activeStroke.push(next)
  erase([last, next])
}

function end(event: PointerEvent) {
  if (event.pointerId === pointerId) finishPointer()
}

function toggleDrawing() {
  finishPointer()
  drawingMode.value = !drawingMode.value
}

onMounted(() => {
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (!canvas.value?.getContext('2d')) { hasCanvas.value = false; return }
  photo = new Image()
  photo.onload = buildTexture
  photo.src = '/images/fog-friend.jpg'
  observer = new ResizeObserver(() => {
    if (!surface.value || !canvas.value) return
    width = surface.value.clientWidth
    height = surface.value.clientHeight
    if (!width || !height) return
    // Cap raster work at two million pixels on wide and high-density displays.
    ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(2_000_000 / (width * height)))
    canvas.value.width = Math.round(width * ratio)
    canvas.value.height = Math.round(height * ratio)
    canvas.value.getContext('2d')!.setTransform(ratio, 0, 0, ratio, 0, 0)
    buildTexture()
  })
  observer.observe(surface.value!)
  if (cursor.value) {
    moveX = gsap.quickTo(cursor.value, 'x', { duration: 0.22, ease: 'power3.out' })
    moveY = gsap.quickTo(cursor.value, 'y', { duration: 0.22, ease: 'power3.out' })
  }
  introduction = gsap.delayedCall(reducedMotion.matches ? 0 : 1.2, drawHeart)
})

watch(() => [props.mood, props.dark], buildTexture)
onBeforeUnmount(() => {
  observer?.disconnect()
  introduction?.kill()
  heartTween?.kill()
  breathTween?.kill()
  moveX?.tween.kill()
  moveY?.tween.kill()
  if (canvas.value) gsap.killTweensOf(canvas.value)
  if (cursor.value) gsap.killTweensOf(cursor.value)
  if (photo) photo.onload = null
})
defineExpose({ reset, drawHeart, finishDrawing: () => { finishPointer(); drawingMode.value = false } })
</script>

<template>
  <div class="fullscreen-mirror" role="group" :aria-label="labels.name" aria-describedby="mirror-instructions">
    <div ref="surface" class="mirror-expanse" :class="{ 'is-drawing': drawingMode }" @pointermove="move">
      <img class="mirror-scene" src="/images/fog-friend.jpg" :alt="labels.imageAlt" width="1080" height="1920" fetchpriority="high" />
      <canvas v-if="hasCanvas" ref="canvas" class="fog-canvas" aria-hidden="true" @pointerdown="start" @pointerup="end" @pointercancel="end" @lostpointercapture="end" />
      <span ref="wave" class="breath-wave" aria-hidden="true"></span>
      <span ref="cursor" class="glass-cursor" aria-hidden="true">+</span>
    </div>
    <div class="mirror-toolbar">
      <div class="mirror-instruction"><span>{{ labels.demo }}</span><p id="mirror-instructions">{{ hasCanvas ? (drawingMode ? labels.stopDrawing : labels.hint) : labels.fallback }}</p></div>
      <div v-if="hasCanvas" class="mirror-tools">
        <button :aria-label="drawingMode ? labels.stopDrawing : labels.draw" :title="drawingMode ? labels.stopDrawing : labels.draw" :aria-pressed="drawingMode" @click="toggleDrawing"><AppIcon :name="drawingMode ? 'check' : 'pen'" :size="19" /></button>
        <button :aria-label="labels.reset" :title="labels.reset" @click="reset"><AppIcon name="wind" :size="20" /></button>
        <button :aria-label="labels.heart" :title="labels.heart" @click="drawHeart"><AppIcon name="heart" :size="19" /></button>
        <button :aria-label="labels.clear" :title="labels.clear" @click="clear"><AppIcon name="sun" :size="20" /></button>
      </div>
    </div>
  </div>
</template>
