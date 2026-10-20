<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import gsap from 'gsap'

const vapor = ref<HTMLDivElement>()
const busy = ref(false)
const palette = ['paper', 'ink', 'muted', 'faint', 'line', 'surface', 'accent', 'acid', 'acid-ink', 'glass-edge', 'halo-a', 'halo-b', 'shadow', 'photo-paper', 'weather', 'photo-brightness'].map(name => '--' + name)
let sequence: gsap.core.Timeline | undefined
let blending: gsap.core.Tween | undefined
let transition: ViewTransition | undefined
let reveal: Animation | undefined
let veilAnimation: Animation | undefined
let button: HTMLElement | undefined
let icon: HTMLElement | null = null
let restorePalette: (() => void) | undefined
let disposed = false
let events: AbortController | undefined

function resetVisuals() {
  document.documentElement.classList.remove('theme-mist-transition')
  for (const name of ['--theme-x', '--theme-y', '--theme-feather']) document.documentElement.style.removeProperty(name)
  if (button) gsap.set(button, { clearProps: '--theme-breath' })
  if (icon) gsap.set(icon, { clearProps: 'opacity,filter,transform' })
  if (vapor.value) gsap.set(vapor.value, { opacity: 0 })
  restorePalette?.()
  restorePalette = undefined
  busy.value = false
}

async function blendPalette(apply: () => Promise<void>, duration: number) {
  const html = document.documentElement
  const computed = getComputedStyle(html)
  const before = palette.map(name => computed.getPropertyValue(name).trim())
  const inline = palette.map(name => html.style.getPropertyValue(name))
  await apply()
  if (disposed) return
  const after = getComputedStyle(html)
  const target: Record<string, string> = {}
  palette.forEach(name => { target[name] = after.getPropertyValue(name).trim() })
  palette.forEach((name, index) => html.style.setProperty(name, before[index]!))
  restorePalette = () => palette.forEach((name, index) => {
    if (inline[index]) html.style.setProperty(name, inline[index]!)
    else html.style.removeProperty(name)
  })
  blending = gsap.to(html, { ...target, duration, ease: 'sine.inOut' })
  await blending
}

async function run(source: HTMLElement, dark: boolean, apply: () => Promise<void>, breathe: () => void) {
  if (busy.value || disposed) return
  busy.value = true
  button = source
  icon = source.querySelector('.theme-toggle-icon')
  const html = document.documentElement
  let committed = false
  const commit = async () => {
    if (committed || disposed) return
    committed = true
    await apply()
    breathe()
  }
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await blendPalette(commit, .18)
      return
    }
    const rect = source.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    const feather = Math.min(180, Math.max(80, radius * .15))
    html.style.setProperty('--theme-x', x + 'px')
    html.style.setProperty('--theme-y', y + 'px')
    html.style.setProperty('--theme-feather', feather + 'px')
    if (vapor.value) {
      vapor.value.dataset.tone = dark ? 'night' : 'morning'
      vapor.value.style.setProperty('--vapor-x', x + 'px')
      vapor.value.style.setProperty('--vapor-y', y + 'px')
    }
    sequence = gsap.timeline()
      .to(source, { '--theme-breath': 1, duration: .16, ease: 'sine.out' }, 0)
    if (icon) sequence.to(icon, { opacity: .1, filter: 'blur(5px)', scale: .8, duration: .16 }, 0)
    await sequence
    if (disposed) return
    if (document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await commit()
      return
    }

    if (document.startViewTransition && typeof CSS.registerProperty === 'function') {
      // The new page is revealed through a feathered mask, rather than a hard circle.
      // View transitions capture the existing scene; neither canvas is remounted.
      html.classList.add('theme-mist-transition')
      if (vapor.value) gsap.set(vapor.value, { opacity: 1 })
      transition = document.startViewTransition(commit)
      const finished = transition.finished.catch(() => undefined)
      try {
        await transition.ready
        if (disposed) { transition.skipTransition(); return }
        reveal = html.animate([
          { '--theme-radius': '0px' },
          { '--theme-radius': radius + feather + 'px' },
        ], { duration: 680, easing: 'cubic-bezier(.24,.05,.26,1)', fill: 'both', pseudoElement: '::view-transition-new(root)' })
        // A separately named vapor layer floats above both theme snapshots.
        veilAnimation = html.animate([
          { opacity: 0 }, { opacity: .32, offset: .18 },
          { opacity: .2, offset: .55 }, { opacity: 0 },
        ], { duration: 680, easing: 'linear', fill: 'both', pseudoElement: '::view-transition-new(theme-vapor)' })
        sequence = gsap.timeline().to(source, { '--theme-breath': 0, duration: .4 })
        if (icon) sequence.to(icon, { opacity: 1, filter: 'blur(0px)', scale: 1, duration: .34 }, 0)
        await reveal.finished.catch(() => undefined)
      } catch {
        transition.skipTransition()
        await transition.updateCallbackDone.catch(() => undefined)
        await commit()
      } finally {
        if (vapor.value) gsap.set(vapor.value, { opacity: 0 })
        // Filling animations must be cancelled so the native transition can finish.
        reveal?.cancel()
        veilAnimation?.cancel()
      }
      await finished
    } else {
      // Older browsers retain the same mist and icon gestures with a palette dissolve.
      sequence = gsap.timeline().to(vapor.value!, { opacity: .25, duration: .15 })
      await sequence
      await blendPalette(commit, .5)
      sequence = gsap.timeline()
        .to(vapor.value!, { opacity: 0, duration: .18 }, 0)
        .to(source, { '--theme-breath': 0, duration: .18 }, 0)
      if (icon) sequence.to(icon, { opacity: 1, filter: 'blur(0px)', scale: 1, duration: .18 }, 0)
      await sequence
    }
  } catch {
    transition?.skipTransition()
    await commit()
  } finally {
    if (!disposed) resetVisuals()
    transition = undefined
  }
}

// A preference change or a hidden tab finishes the visual gesture immediately.
function finishEarly() {
  reveal?.cancel()
  veilAnimation?.cancel()
  transition?.skipTransition()
  sequence?.progress(1)
  blending?.progress(1)
}

// Installed lazily with the component so these listeners never outlive the page.
onMounted(() => {
  events = new AbortController()
  document.addEventListener('visibilitychange', () => { if (document.hidden) finishEarly() }, { signal: events.signal })
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => { if (event.matches) finishEarly() }, { signal: events.signal })
})
onBeforeUnmount(() => {
  disposed = true
  events?.abort()
  transition?.skipTransition()
  reveal?.cancel()
  veilAnimation?.cancel()
  sequence?.kill()
  blending?.kill()
  resetVisuals()
})
defineExpose({ run, busy })
</script>

<template>
  <Teleport to="body"><div ref="vapor" class="theme-mist-vapor" aria-hidden="true"><span /><span /><span /></div></Teleport>
</template>

<style lang="scss">
@property --theme-radius { syntax: '<length>'; inherits: false; initial-value: 0px; }
html.theme-mist-transition {
  &::view-transition { pointer-events: none; }
  &::view-transition-group(root), &::view-transition-group(theme-vapor),
  &::view-transition-image-pair(root), &::view-transition-image-pair(theme-vapor),
  &::view-transition-old(root), &::view-transition-new(root),
  &::view-transition-old(theme-vapor), &::view-transition-new(theme-vapor) {
    animation: none; mix-blend-mode: normal;
  }
  &::view-transition-group(root) { z-index: 0; }
  &::view-transition-group(theme-vapor) { z-index: 1; }
  &::view-transition-old(root) { z-index: 0; }
  &::view-transition-new(root) {
    z-index: 1;
    -webkit-mask-image: radial-gradient(circle at var(--theme-x) var(--theme-y), #000 max(0px, calc(var(--theme-radius) - var(--theme-feather))), transparent var(--theme-radius));
    mask-image: radial-gradient(circle at var(--theme-x) var(--theme-y), #000 max(0px, calc(var(--theme-radius) - var(--theme-feather))), transparent var(--theme-radius));
  }
  &::view-transition-old(theme-vapor) { opacity: 0; }
}
.theme-mist-vapor {
  --vapor-light: 230, 240, 244;
  --vapor-shade: 149, 181, 199;
  position: fixed; inset: 0; z-index: 2147483647; opacity: 0; overflow: hidden; pointer-events: none;
  view-transition-name: theme-vapor; contain: strict;
  &[data-tone='morning'] { --vapor-light: 253, 246, 225; --vapor-shade: 217, 228, 210; }
  background:
    radial-gradient(ellipse at var(--vapor-x) var(--vapor-y), rgba(var(--vapor-light), .85), rgba(var(--vapor-light), .3) 38%, transparent 78%),
    radial-gradient(ellipse at 30% 70%, rgba(var(--vapor-shade), .2), transparent 70%);
  > span { position: absolute; inset: 0; background-size: 173px 149px;
    background-image: radial-gradient(ellipse 1px 1.8px at 23px 41px, rgba(var(--vapor-light), .7) 25%, transparent 85%), radial-gradient(ellipse 1.3px 2px at 119px 103px, rgba(var(--vapor-light), .45) 20%, transparent 85%);
    mask-image: radial-gradient(ellipse at var(--vapor-x) var(--vapor-y), #000, transparent 70%);
    -webkit-mask-image: radial-gradient(ellipse at var(--vapor-x) var(--vapor-y), #000, transparent 70%);
  }
  > span:nth-child(2) { transform: translate(37px, 17px); opacity: .4; background-size: 127px 181px; }
  > span:nth-child(3) { transform: translate(-41px, 43px); opacity: .3; background-size: 229px 137px; }
}
.theme-toggle {
  position: relative; isolation: isolate;
  &::after { content: ''; position: absolute; inset: -2px; border-radius: inherit; pointer-events: none; opacity: var(--theme-breath, 0);
    background: radial-gradient(ellipse at 42% 34%, #f3f9f3eb, #c9dce2ab 42%, #dcebe433 75%, transparent);
    box-shadow: 0 0 14px 5px #dce8e42b; filter: blur(1px);
  }
}
.theme-toggle-icon { display: grid; place-items: center; }
@media (prefers-reduced-motion: reduce) {
  .theme-mist-vapor { display: none; }
}
</style>
