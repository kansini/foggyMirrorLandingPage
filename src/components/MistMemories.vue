<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import gsap from 'gsap'
import AppIcon from './AppIcon.vue'
import { screenshotUrl } from '../screenshots'
import type { Locale, MemoriesContent } from '../content'
import { WebGLFogRenderer, type MirrorPoint } from '../rendering/WebGLFogRenderer'

const props = defineProps<{ copy: MemoriesContent; locale: Locale; dark: boolean }>()
const surface = ref<HTMLElement>()
const canvas = ref<HTMLCanvasElement>()
const ready = ref(false)
const unavailable = ref(false)
const reducedMotion = ref(false)
const playing = ref(false)
const seconds = ref(0)
const timecode = computed(() => '00:' + String(Math.floor(seconds.value)).padStart(2, '0'))
const appStoreUrl = 'https://apps.apple.com/us/app/%E9%9B%BE%E9%95%9C/id6821307625'
let renderer: WebGLFogRenderer | undefined
let timeline: gsap.core.Tween | undefined
let observer: IntersectionObserver | undefined
let resizeObserver: ResizeObserver | undefined
let events: AbortController | undefined
let motion: MediaQueryList | undefined
let photo: HTMLImageElement | undefined
let visible = false
let initialized = false
let width = 1
let height = 1
let cursor = 0
const clock = { value: 0 }
interface DemoSegment { start: MirrorPoint; end: MirrorPoint; time: number; radius: number }
let segments: DemoSegment[] = []

// Paths erase the fog field itself. No white lettering or illustration overlays.
function prepareStrokes() {
  const heart = 'M204 232C182 209 112 171 123 130C134 89 183 107 202 139C218 94 272 91 281 132C293 175 233 210 204 232'
  const writing = props.locale === 'zh'
    ? ['M133 282L112 327L150 343M111 305L153 305L145 335L115 361', 'M175 285L228 285L199 311L202 361L185 351', 'M168 325L241 318']
    : ['M128 276L121 356', 'M124 323C150 280 169 302 164 321L161 355', 'M203 305L199 352Q200 359 208 354', 'M204 281L204 282']
  const paths = [heart, ...writing, 'M165 413L165 416', 'M222 413L222 416', 'M160 444Q192 477 229 441']
  const totalWriting = writing.length
  segments = []
  paths.forEach((d, index) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', d)
    const length = path.getTotalLength()
    const count = Math.max(2, Math.ceil(length / 2))
    const startTime = index === 0 ? .8 : index <= totalWriting ? 4.4 + (index - 1) * 5.4 / totalWriting : 11 + (index - totalWriting - 1) * .65
    const duration = index === 0 ? 3 : index <= totalWriting ? 4.5 / totalWriting : .45
    for (let i = 1; i <= count; i++) {
      const a = path.getPointAtLength((i - 1) / count * length)
      const b = path.getPointAtLength(i / count * length)
      segments.push({
        start: { x: a.x / 400, y: a.y / 600 }, end: { x: b.x / 400, y: b.y / 600 },
        time: startTime + i / count * duration,
        radius: (index === 0 ? 7.5 : 4.4) * (1 + .1 * Math.sin(i / count * Math.PI)),
      })
    }
  })
  cursor = 0
}

function paintTo(time: number) {
  while (cursor < segments.length && segments[cursor]!.time <= time) {
    const segment = segments[cursor++]!
    const radius = segment.radius * Math.min(width / 400, height / 600)
    renderer?.stroke(segment.start, segment.end, radius, radius)
  }
  seconds.value = time
}

function updateActivity() {
  const active = visible && !document.hidden
  renderer?.setActive(active)
  if (active && playing.value) timeline?.resume()
  else timeline?.pause()
}

function replay() {
  if (!renderer || !ready.value) return
  timeline?.kill()
  renderer.clearField()
  prepareStrokes()
  clock.value = 0
  seconds.value = 0
  if (reducedMotion.value) { playing.value = false; paintTo(15); return }
  playing.value = true
  timeline = gsap.to(clock, {
    value: 15, duration: 15, ease: 'none', paused: true,
    onUpdate: () => paintTo(clock.value), onComplete: () => { playing.value = false },
  })
  updateActivity()
}

function togglePlayback() {
  if (seconds.value >= 15) { replay(); return }
  playing.value = !playing.value
  updateActivity()
}

function showFallback() {
  timeline?.kill()
  playing.value = false
  unavailable.value = true
  ready.value = false
  renderer?.dispose()
  renderer = undefined
  resizeObserver?.disconnect()
}

function initialize() {
  if (initialized || !canvas.value || !surface.value) return
  initialized = true
  try {
    renderer = new WebGLFogRenderer(canvas.value)
    renderer.setStyle('morning', props.dark)
    renderer.setMotion(false)
    const resize = () => {
      width = surface.value?.clientWidth || 1
      height = surface.value?.clientHeight || 1
      renderer?.resize(width, height)
    }
    resize()
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(surface.value)
    photo = new Image()
    photo.onload = () => {
      if (!renderer) return
      try {
        renderer.setScene(photo!)
        ready.value = true
        replay()
      } catch { showFallback() }
    }
    photo.onerror = showFallback
    photo.src = '/images/cat.jpg'
  } catch { showFallback() }
}

function updateMotion() {
  reducedMotion.value = motion?.matches ?? false
  if (reducedMotion.value && renderer) {
    timeline?.kill()
    playing.value = false
    paintTo(15)
  }
}

watch(() => props.dark, () => renderer?.setStyle('morning', props.dark))
watch(() => props.locale, () => {
  if (!renderer) return
  renderer.clearField()
  prepareStrokes()
  paintTo(seconds.value)
})

onMounted(() => {
  events = new AbortController()
  motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateMotion()
  motion.addEventListener('change', updateMotion, { signal: events.signal })
  document.addEventListener('visibilitychange', updateActivity, { signal: events.signal })
  canvas.value?.addEventListener('webglcontextlost', event => { event.preventDefault(); showFallback() }, { signal: events.signal })
  observer = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? false
    if (visible) initialize()
    updateActivity()
  }, { threshold: .15 })
  if (surface.value) observer.observe(surface.value)
})

onBeforeUnmount(() => {
  timeline?.kill()
  observer?.disconnect()
  resizeObserver?.disconnect()
  events?.abort()
  if (photo) { photo.onload = null; photo.onerror = null }
  renderer?.dispose()
})
</script>

<template>
  <section id="postcards" class="mist-memories page-width" aria-labelledby="memories-title">
    <header class="memories-heading" data-reveal>
      <div>
        <span class="micro-label">{{ copy.label }}</span>
        <h2 id="memories-title"><span v-for="line in copy.title" :key="line">{{ line }}</span></h2>
      </div>
      <p class="preserve-lines">{{ copy.description }}</p>
    </header>

    <div class="memories-layout">
      <figure class="moving-memory" data-reveal>
        <div class="memory-media-header"><span><AppIcon name="video" :size="16" />{{ copy.video }}</span><span>01 / IN MOTION</span></div>
        <div ref="surface" class="memory-film" :class="{ 'is-ready': ready, 'is-playing': playing }">
          <div v-if="!ready" class="actual-work" :class="{ 'is-english': locale === 'en' }">
            <img :src="screenshotUrl(locale, 3)" :alt="copy.imageAlt" width="956" height="1950" loading="lazy" />
          </div>
          <canvas ref="canvas" aria-hidden="true" />
          <template v-if="ready">
            <span class="film-demo-label">{{ copy.demo }}</span>
            <div class="film-time"><i aria-hidden="true" />{{ seconds >= 15 ? 'END' : 'DEMO' }}<span>{{ timecode }}</span></div>
            <p v-if="seconds >= 15" class="film-complete handwritten">{{ copy.complete }}</p>
            <div v-if="!reducedMotion" class="film-controls">
              <button type="button" :aria-label="seconds >= 15 ? copy.replay : playing ? copy.pause : copy.play" @click="togglePlayback">
                <AppIcon :name="seconds >= 15 ? 'replay' : playing ? 'pause' : 'play'" :size="18" />
              </button>
              <progress :value="seconds" max="15" :aria-label="copy.progress" />
              <span>00:15</span>
              <button type="button" :aria-label="copy.replay" @click="replay"><AppIcon name="replay" :size="17" /></button>
            </div>
          </template>
        </div>
        <figcaption>
          <div class="memory-caption-title"><h3>{{ copy.videoTitle }}</h3><span>{{ copy.duration }}</span></div>
          <p>{{ copy.videoDescription }}</p>
          <span v-if="unavailable" class="memory-source">{{ copy.actual }}</span>
        </figcaption>
      </figure>

      <div class="still-memory-column">
        <figure class="still-memory" data-reveal>
          <div class="memory-media-header"><span><AppIcon name="camera" :size="16" />{{ copy.photo }}</span><span>02 / A MOMENT</span></div>
          <div class="memory-photo actual-work" :class="{ 'is-english': locale === 'en' }">
            <img :src="screenshotUrl(locale, 3)" :alt="copy.imageAlt" width="956" height="1950" loading="lazy" />
          </div>
          <figcaption><h3>{{ copy.photoTitle }}</h3><p>{{ copy.photoDescription }}</p><span class="memory-source">{{ copy.actual }}</span></figcaption>
        </figure>
        <div class="memory-note" data-reveal>
          <span class="memory-duration">15<span>s</span><AppIcon name="video" :size="25" /></span>
          <p>{{ copy.duration }} · {{ copy.sound }}<br />{{ copy.save }}</p>
          <a class="text-link" :href="appStoreUrl" target="_blank" rel="noopener noreferrer">{{ copy.action }}<AppIcon name="arrow" :size="17" /></a>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.mist-memories { padding-block: 125px 110px; }
.memories-heading {
  display: flex; justify-content: space-between; align-items: flex-end; gap: 40px; margin-bottom: 68px;
  .micro-label { font-size: 9px; }
  h2 { font-family: var(--serif); font-size: clamp(38px, 4.4vw, 62px); font-weight: 400; line-height: 1.3; margin-top: 26px; letter-spacing: -.035em; }
  h2 span { display: block; }
  > p { color: var(--muted); font-size: 13px; line-height: 2; padding-bottom: 7px; max-width: 360px; }
}
.memories-layout { display: grid; grid-template-columns: minmax(0, 1.12fr) minmax(0, .74fr); gap: clamp(40px, 7vw, 100px); align-items: start; }
.memory-media-header { display: flex; align-items: center; justify-content: space-between; gap: 15px; margin-bottom: 15px; font-size: 11px; color: var(--ink);
  > span:first-child { display: flex; gap: 9px; align-items: center; }
  > span:last-child { font-size: 8px; letter-spacing: 1.5px; color: var(--faint); }
}
.memory-film { position: relative; aspect-ratio: 2 / 3; overflow: hidden; border-radius: 3px; background: var(--weather); color: #fffdf4; isolation: isolate;
  > canvas { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; }
  &.is-ready > canvas { opacity: 1; }
  &.is-ready::after { content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none; background: linear-gradient(#08131350, transparent 22%, transparent 72%, #08131390); }
  .actual-work { position: absolute; left: 0; right: 0; top: -8%; height: 129.75%; }
}
.actual-work { position: relative; overflow: hidden;
  // Only the exported artwork within the supplied App screenshot is framed.
  img { position: absolute; width: 160.4%; max-width: none; height: auto; left: -30%; top: -29.6%; }
  &.is-english img { width: 163.8%; left: -31.8%; top: -29.1%; }
}
.film-demo-label { position: absolute; z-index: 2; left: 22px; top: 22px; font-size: 9px; letter-spacing: 1px; }
.film-time { position: absolute; z-index: 2; right: 22px; top: 22px; display: flex; align-items: center; gap: 7px; font-size: 9px; font-variant-numeric: tabular-nums; letter-spacing: 1px;
  i { width: 5px; height: 5px; border-radius: 50%; background: #f1b9a9; }
  span { margin-left: 5px; }
}
.film-complete { position: absolute; z-index: 2; bottom: 100px; left: 0; width: 100%; text-align: center; font-size: 20px; transform: rotate(-4deg); }
.film-controls { position: absolute; z-index: 2; bottom: 18px; left: 18px; right: 18px; display: flex; align-items: center; gap: 14px;
  button { display: grid; place-items: center; width: 40px; height: 40px; flex-shrink: 0; color: inherit; background: #182a2e45; border: 1px solid #ffffff66; border-radius: 50%; cursor: pointer; transition: background .2s; &:hover { background: #182a2e85; } }
  progress { appearance: none; -webkit-appearance: none; display: block; flex: 1; min-width: 0; width: 100%; height: 2px; border: 0; background: #ffffff4d; color: #fffdf4; border-radius: 1px; }
  progress::-webkit-progress-bar { background: #ffffff4d; }
  progress::-webkit-progress-value { background: #fffdf4; }
  progress::-moz-progress-bar { background: #fffdf4; }
  > span { font-size: 9px; font-variant-numeric: tabular-nums; }
}
.memories-layout figcaption { padding-top: 22px;
  h3 { font-family: var(--serif); font-size: 23px; font-weight: 400; line-height: 1.5; }
  p { margin-top: 10px; font-size: 12px; line-height: 1.95; color: var(--muted); max-width: 420px; }
}
.memory-caption-title { display: flex; justify-content: space-between; align-items: baseline; gap: 20px;
  > span { font-size: 9px; color: var(--muted); flex-shrink: 0; }
}
.still-memory-column { padding-top: 115px; }
.memory-photo { aspect-ratio: 596 / 1160; border-radius: 3px; }
.memory-source { display: block; color: var(--faint); font-size: 8px; letter-spacing: .5px; margin-top: 16px; }
.memory-note { border-top: 1px solid var(--line); margin-top: 44px; padding-top: 27px;
  > p { color: var(--muted); font-size: 11px; line-height: 1.9; margin-top: 14px; }
  .text-link { font-size: 11px; line-height: 1.7; margin-top: 20px; gap: 14px; }
}
.memory-duration { display: flex; align-items: baseline; gap: 3px; font-family: var(--serif); font-size: 52px; line-height: 1;
  > span { font-size: 26px; }
  > svg { align-self: center; margin-left: auto; color: var(--muted); }
}
@media (max-width: 1000px) {
  .memories-layout { grid-template-columns: minmax(0, 1.1fr) minmax(0, .8fr); gap: 35px; }
  .memories-heading { gap: 25px; > p { font-size: 11px; } }
  .memory-caption-title { display: block; > span { display: block; margin-top: 8px; } }
  .memories-layout figcaption h3 { font-size: 20px; }
  .film-demo-label { top: 16px; left: 14px; font-size: 8px; }
  .film-time { top: 16px; right: 14px; font-size: 8px; }
  .film-controls { left: 12px; right: 12px; gap: 9px; }
}
@media (max-width: 600px) {
  .mist-memories { padding-block: 75px 65px; }
  .memories-heading { display: block; margin-bottom: 36px;
    .micro-label { font-size: 7px; }
    h2 { font-size: 37px; margin-top: 22px; line-height: 1.35; }
    > p { margin-top: 22px; font-size: 11px; }
  }
  .memories-layout { grid-template-columns: minmax(0, 1fr); gap: 42px; }
  .still-memory-column { padding-top: 0; }
  .still-memory { width: 78%; margin-left: auto; }
  .memory-media-header { font-size: 10px; > span:last-child { font-size: 7px; } }
  .memory-caption-title { display: flex; > span { margin-top: 0; } }
  .memories-layout figcaption { padding-top: 18px; h3 { font-size: 19px; } p { font-size: 11px; } }
  .memory-note { margin-top: 32px; }
  .film-demo-label, .film-time { font-size: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  .film-controls button { transition: none; }
}
</style>
