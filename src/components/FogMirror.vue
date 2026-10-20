<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import gsap from 'gsap'
import AppIcon from './AppIcon.vue'
import type { MirrorLabels } from '../content'
import { WebGLFogRenderer, type MirrorPoint } from '../rendering/WebGLFogRenderer'

const props = withDefaults(defineProps<{
  mood?: string; dark?: boolean; inactive?: boolean; labels: MirrorLabels
}>(), { mood: 'morning', dark: false, inactive: false })
const canvas = ref<HTMLCanvasElement>()
const surface = ref<HTMLDivElement>()
const cursor = ref<HTMLSpanElement>()
const drawingMode = ref(false)
const hasCanvas = ref(true)
const ready = ref(false)
let renderer: WebGLFogRenderer | undefined
let resizeObserver: ResizeObserver | undefined
let visibilityObserver: IntersectionObserver | undefined
let photo: HTMLImageElement | undefined
let pointerId: number | undefined
let lastPoint: MirrorPoint | undefined
let lowPoint: MirrorPoint | undefined
let lastRadius = 13
let lastTimestamp = 0
let width = 1
let height = 1
let visible = true
let motionQuery: MediaQueryList | undefined
let events: AbortController | undefined
let heartTween: gsap.core.Tween | undefined
let breathTween: gsap.core.Timeline | undefined
let clearTween: gsap.core.Tween | undefined
let introduction: gsap.core.Tween | undefined
let themeBreath: gsap.core.Timeline | undefined
let moveX: ReturnType<typeof gsap.quickTo> | undefined
let moveY: ReturnType<typeof gsap.quickTo> | undefined

function invalidate() { renderer?.invalidate() }

function breatheForTheme() {
  if (!renderer || !visible || props.inactive || motionQuery?.matches) return
  themeBreath?.kill()
  // Optical lift only: never deposit mist into or erase the user's wipe field.
  themeBreath = gsap.timeline()
    .to(renderer, { themeMist: 1, duration: .22, ease: 'sine.out', onUpdate: invalidate })
    .to(renderer, { themeMist: 0, duration: .64, ease: 'sine.inOut', onUpdate: invalidate })
}

function finishPointer(depositWater = true) {
  const id = pointerId
  pointerId = undefined
  if (id !== undefined && canvas.value?.hasPointerCapture(id)) canvas.value.releasePointerCapture(id)
  if (depositWater && lowPoint) renderer?.finishStroke(lowPoint, lastRadius)
  lastPoint = undefined
  lowPoint = undefined
  if (cursor.value) gsap.to(cursor.value, { scale: 1, duration: motionQuery?.matches ? 0 : .2 })
}

function interruptAnimation() {
  introduction?.kill()
  heartTween?.kill()
  breathTween?.kill()
  clearTween?.kill()
}

function reset() {
  if (!renderer) return
  interruptAnimation()
  finishPointer(false)
  if (motionQuery?.matches) {
    renderer.refog(0, 1)
    renderer.amount = 1
    invalidate()
    return
  }
  const progress = { value: 0 }
  let previous = 0
  // The app spreads manual mist over several seconds. This adds optical mass
  // and fades the old wipe field only where the irregular front has arrived.
  breathTween = gsap.timeline()
    .to(renderer, { amount: 1, duration: 4.5, ease: 'power1.out', onUpdate: invalidate }, 0)
    .to(progress, {
      value: 1, duration: 4.5, ease: 'none',
      onUpdate: () => { renderer?.refog(previous, progress.value); previous = progress.value },
    }, 0)
}

function drawHeart() {
  if (!renderer) return
  interruptAnimation()
  finishPointer(false)
  if (renderer.amount < .01) {
    renderer.clearField()
    renderer.amount = 1
  }
  const size = Math.min(width, height)
  const center = { x: width > height ? .76 : .72, y: width > height ? .48 : .49 }
  const points: MirrorPoint[] = []
  for (let i = 0; i <= 120; i++) {
    const t = i / 120 * Math.PI * 2
    points.push({
      x: center.x + 16 * Math.sin(t) ** 3 * size / (width * 125),
      y: center.y - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * size / (height * 125),
    })
  }
  const radius = (index: number) => 10 + 2 * Math.sin(index / 120 * Math.PI)
  const draw = (from: number, to: number) => {
    for (let i = Math.max(1, from + 1); i <= to; i++) renderer?.stroke(points[i - 1]!, points[i]!, radius(i - 1), radius(i))
  }
  if (motionQuery?.matches) { draw(0, 120); return }
  const progress = { index: 0 }
  let previous = 0
  heartTween = gsap.to(progress, {
    index: 120, duration: 1.65, ease: 'power1.inOut',
    onUpdate: () => {
      const next = Math.floor(progress.index)
      draw(previous, next)
      previous = next
    },
    onComplete: () => {
      const bottom = points.reduce((a, b) => a.y > b.y ? a : b)
      renderer?.finishStroke(bottom, 11)
    },
  })
}

function clear() {
  if (!renderer) return
  interruptAnimation()
  finishPointer(false)
  clearTween = gsap.to(renderer, {
    amount: 0, duration: motionQuery?.matches ? 0 : 1.2, ease: 'power2.out',
    onUpdate: invalidate, onComplete: () => { renderer?.clearField(); invalidate() },
  })
}

function point(event: PointerEvent): MirrorPoint {
  const rect = canvas.value!.getBoundingClientRect()
  return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }
}

function start(event: PointerEvent) {
  if (!renderer || props.inactive || (event.pointerType === 'touch' && !drawingMode.value) || pointerId !== undefined || (event.pointerType === 'mouse' && event.button !== 0)) return
  interruptAnimation()
  pointerId = event.pointerId
  canvas.value?.setPointerCapture(event.pointerId)
  lastPoint = point(event)
  lowPoint = lastPoint
  lastTimestamp = event.timeStamp
  lastRadius = event.pointerType === 'pen' ? 5 + event.pressure * 17 : 13
  renderer.stroke(lastPoint, lastPoint, lastRadius, lastRadius)
  if (cursor.value) gsap.to(cursor.value, { scale: .65, duration: motionQuery?.matches ? 0 : .2 })
}

function move(event: PointerEvent) {
  const rect = surface.value!.getBoundingClientRect()
  if (event.pointerType === 'mouse') {
    moveX?.(event.clientX - rect.left)
    moveY?.(event.clientY - rect.top)
  }
  if (!renderer || !lastPoint || event.pointerId !== pointerId) return
  const next = point(event)
  const dt = Math.max(1, event.timeStamp - lastTimestamp)
  const speed = Math.hypot((next.x - lastPoint.x) * width, (next.y - lastPoint.y) * height) / dt * 1000
  const contact = Math.sqrt(Math.max(1, event.width * event.height))
  const targetRadius = event.pointerType === 'pen'
    ? 5 + Math.max(0, Math.min(1, event.pressure)) * 17
    : Math.max(5, Math.min(22, 13 + Math.min(6, contact * .2) - Math.min(5, speed * .007)))
  const radius = lastRadius + (targetRadius - lastRadius) * (1 - Math.exp(-dt / 65))
  renderer.stroke(lastPoint, next, lastRadius, radius)
  lastPoint = next
  lastRadius = radius
  lastTimestamp = event.timeStamp
  if (!lowPoint || next.y > lowPoint.y) lowPoint = next
}

function end(event: PointerEvent) {
  if (event.pointerId === pointerId) finishPointer(event.type !== 'pointercancel')
}

function toggleDrawing() {
  finishPointer()
  drawingMode.value = !drawingMode.value
}

function updateActive() { renderer?.setActive(visible && !props.inactive && !document.hidden) }

function updateMotion() {
  renderer?.setMotion(!motionQuery?.matches)
  if (motionQuery?.matches) {
    themeBreath?.progress(1)
    heartTween?.progress(1)
    breathTween?.progress(1)
    clearTween?.progress(1)
  }
}

function contextLost(event: Event) {
  event.preventDefault()
  interruptAnimation()
  finishPointer(false)
  themeBreath?.kill()
  renderer?.dispose()
  renderer = undefined
  ready.value = false
  hasCanvas.value = false
}

onMounted(() => {
  events = new AbortController()
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  try {
    renderer = new WebGLFogRenderer(canvas.value!)
  } catch (error) {
    console.warn('Foggy Mirror: optical rendering unavailable.', error)
    hasCanvas.value = false
    return
  }
  renderer.setStyle(props.mood, props.dark)
  renderer.setMotion(!motionQuery.matches)
  motionQuery.addEventListener('change', updateMotion)
  document.addEventListener('visibilitychange', updateActive, { signal: events.signal })
  photo = new Image()
  photo.onload = () => {
    renderer?.setScene(photo!)
    ready.value = true
  }
  // A sharp source is essential: the previous illustration already contained fog.
  photo.src = '/images/cat.jpg'
  resizeObserver = new ResizeObserver(() => {
    if (!surface.value || !renderer) return
    width = surface.value.clientWidth
    height = surface.value.clientHeight
    if (width && height) renderer.resize(width, height)
  })
  resizeObserver.observe(surface.value!)
  visibilityObserver = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? false
    updateActive()
  })
  visibilityObserver.observe(surface.value!)
  if (cursor.value) {
    const duration = motionQuery.matches ? 0 : .22
    moveX = gsap.quickTo(cursor.value, 'x', { duration, ease: 'power3.out' })
    moveY = gsap.quickTo(cursor.value, 'y', { duration, ease: 'power3.out' })
  }
  introduction = gsap.delayedCall(motionQuery.matches ? 0 : 1.2, drawHeart)
})

watch(() => [props.mood, props.dark], () => renderer?.setStyle(props.mood, props.dark))
watch(() => props.inactive, () => { if (props.inactive) finishPointer(false); updateActive() })
onBeforeUnmount(() => {
  themeBreath?.kill()
  interruptAnimation()
  resizeObserver?.disconnect()
  visibilityObserver?.disconnect()
  events?.abort()
  motionQuery?.removeEventListener('change', updateMotion)
  moveX?.tween.kill()
  moveY?.tween.kill()
  if (cursor.value) gsap.killTweensOf(cursor.value)
  if (photo) photo.onload = null
  renderer?.dispose()
})
defineExpose({ reset, drawHeart, breatheForTheme, finishDrawing: () => { finishPointer(); drawingMode.value = false } })
</script>

<template>
  <div class="fullscreen-mirror" role="group" :aria-label="labels.name" aria-describedby="mirror-instructions">
    <div ref="surface" class="mirror-expanse" :class="{ 'is-drawing': drawingMode }" @pointermove="move">
      <img class="mirror-scene" src="/images/cat.jpg" :alt="labels.imageAlt" width="667" height="1000" fetchpriority="high" />
      <canvas v-if="hasCanvas" ref="canvas" class="fog-canvas" :class="{ 'is-ready': ready }" aria-hidden="true" @pointerdown="start" @pointerup="end" @pointercancel="end" @lostpointercapture="end" @webglcontextlost="contextLost" />
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
