<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import { content, type Locale } from '../content'
import { screenshotUrl } from '../screenshots'
import AppIcon from './AppIcon.vue'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)
const props = defineProps<{ locale: Locale }>()
const emit = defineEmits<{ preview: [index: number] }>()
const copy = computed(() => content[props.locale].showcase)
const root = ref<HTMLElement>()
const stage = ref<HTMLElement>()
const viewport = ref<HTMLElement>()
const track = ref<HTMLElement>()
const animated = ref(false)
const progress = ref(0)
let media: gsap.MatchMedia | undefined
let horizontal: ScrollTrigger | undefined
let focusTween: gsap.core.Tween | undefined

function focusShot(index: number, event: FocusEvent) {
  if (!(event.target instanceof HTMLElement) || !event.target.matches(':focus-visible') || !horizontal) return
  if (viewport.value) viewport.value.scrollLeft = 0
  focusTween?.kill()
  focusTween = gsap.to(window, {
    scrollTo: { y: horizontal.start + (horizontal.end - horizontal.start) * index / 4, autoKill: true },
    duration: 0.45, ease: 'power2.out',
  })
}

watch(() => props.locale, async () => {
  await nextTick()
  ScrollTrigger.refresh()
})

onMounted(() => {
  media = gsap.matchMedia()
  media.add('(min-width: 1000px) and (min-height: 850px) and (prefers-reduced-motion: no-preference)', () => {
    animated.value = true
    const distance = () => Math.max(0, track.value!.scrollWidth - viewport.value!.clientWidth)
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: stage.value, pin: stage.value, start: 'top top',
        end: () => '+=' + Math.max(distance(), 800),
        scrub: 0.85, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: self => { progress.value = self.progress },
      },
    })
    timeline.to(track.value!, { x: () => -distance(), ease: 'none', duration: 1 })
    timeline.fromTo('.shot-device', {
      rotate: index => index % 2 === 0 ? -7 : 7,
      yPercent: index => index % 2 === 0 ? 7 : -2,
    }, { rotate: 0, yPercent: 0, duration: 1, ease: 'none' }, 0)
    horizontal = timeline.scrollTrigger
    return () => { animated.value = false; horizontal = undefined; progress.value = 0 }
  }, root.value)
})
onBeforeUnmount(() => { media?.revert(); focusTween?.kill() })
</script>

<template>
  <section ref="root" class="app-showcase" :class="{ 'has-scroll-timeline': animated }" aria-labelledby="showcase-title">
    <div ref="stage" class="showcase-pin">
      <div class="showcase-heading page-width">
        <div><p class="micro-label">{{ copy.label }}</p><h2 id="showcase-title"><span v-for="line in copy.title" :key="line">{{ line }}</span></h2></div>
        <div class="showcase-heading-note"><p>{{ copy.description }}</p><span>{{ copy.swipe }}<AppIcon name="right" :size="20" /></span></div>
        <span class="showcase-count" aria-hidden="true">01 — 05</span>
      </div>
      <div ref="viewport" class="showcase-viewport">
        <div ref="track" class="showcase-track">
          <article v-for="(item, index) in copy.items" :key="index" class="shot-item">
            <button class="shot-device" :aria-label="item.title + ' — ' + content[locale].hero.preview" @focus="focusShot(index, $event)" @click="emit('preview', index)">
              <img :src="screenshotUrl(locale, index)" :alt="item.alt" width="720" height="1470" loading="lazy" />
              <span class="shot-expand" aria-hidden="true"><AppIcon name="arrow" :size="22" /></span>
            </button>
            <div class="shot-description"><span class="shot-index">0{{ index + 1 }}</span><div><h3>{{ item.title }}</h3><p>{{ item.description }}</p></div></div>
          </article>
        </div>
      </div>
      <div class="showcase-footer page-width">
        <span>FOGGY MIRROR / THE LITTLE THINGS</span>
        <div class="showcase-progress" aria-hidden="true"><i :style="{ transform: 'scaleX(' + progress + ')' }"></i></div>
        <span>{{ content[locale].preview.caption }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.app-showcase { position: relative; background: var(--paper); padding-block: 70px 50px; }
.showcase-pin { position: relative; background: var(--paper); padding-block: 25px; }
.showcase-heading { position: relative; display: flex; align-items: flex-end; justify-content: space-between; gap: 35px; padding-bottom: 35px;
  .micro-label { font-size: 8px; color: var(--muted); }
  h2 { font-family: var(--serif); font-size: clamp(35px, 3.8vw, 55px); line-height: 1.3; font-weight: 400; margin-top: 18px; span { display: block; } }
}
.showcase-heading-note { max-width: 280px; padding-bottom: 8px;
  p { font-size: 12px; line-height: 2; color: var(--muted); }
  > span { display: flex; align-items: center; gap: 24px; margin-top: 17px; font-size: 10px; color: var(--accent); }
}
.showcase-count { font-family: Georgia, serif; font-size: 13px; padding-bottom: 9px; color: var(--faint); }
.showcase-viewport { overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: thin; scrollbar-color: var(--line) transparent; overscroll-behavior-x: contain; padding: 20px 0 35px; }
.showcase-track { display: flex; width: max-content; gap: clamp(35px, 5vw, 85px); padding-inline: max(56px, calc((100vw - 1240px) / 2)); }
.shot-item { width: clamp(235px, 22vw, 325px); flex-shrink: 0; scroll-snap-align: center; }
.shot-device { position: relative; display: block; padding: 0; width: 100%; transform-origin: 50% 75%; background: none;
  img { width: 100%; height: min(54svh, 550px); object-fit: contain; filter: drop-shadow(10px 15px 15px var(--shadow)); }
  &:hover .shot-expand, &:focus-visible .shot-expand { opacity: 1; transform: translateY(0); }
}
.shot-expand { position: absolute; left: calc(50% - 23px); top: 47%; width: 46px; height: 46px; border-radius: 50%; background: var(--acid); color: var(--acid-ink); display: grid; place-items: center; opacity: 0; transform: translateY(10px); transition: opacity .25s, transform .25s; pointer-events: none; }
.shot-description { display: flex; gap: 15px; margin: 24px 5px 0;
  h3 { font-size: 14px; font-weight: 500; line-height: 1.7; }
  p { font-size: 11px; color: var(--muted); line-height: 1.9; margin-top: 7px; }
}
.shot-index { color: var(--faint); font-family: Georgia, serif; font-size: 10px; margin-top: 5px; }
.showcase-footer { display: flex; align-items: center; justify-content: space-between; gap: 30px; padding-top: 26px; color: var(--faint); font-size: 8px; letter-spacing: .8px; }
.showcase-progress { display: none; flex: 1; max-width: 270px; height: 1px; background: var(--line);
  i { display: block; width: 100%; height: 1px; background: var(--ink); transform-origin: left; }
}
.has-scroll-timeline {
  padding-block: 0;
  .showcase-pin { min-height: 100svh; display: flex; flex-direction: column; justify-content: center; padding-block: 116px 25px; }
  .showcase-heading { padding-bottom: 24px; h2 { font-size: clamp(35px, 3vw, 46px); } }
  .shot-device img { height: min(43svh, 490px); }
  .showcase-viewport { overflow: hidden; scroll-snap-type: none; }
  .showcase-progress { display: block; }
}
@media (max-width: 650px) {
  .app-showcase { padding-block: 50px 25px; }
  .showcase-pin { padding-block: 15px; }
  .showcase-heading { display: block; padding-bottom: 25px;
    h2 { font-size: 36px; line-height: 1.4; }
    .micro-label { font-size: 7px; }
  }
  .showcase-heading-note { margin-top: 23px; p { font-size: 11px; } > span { font-size: 9px; margin-top: 9px; } }
  .showcase-count { position: absolute; right: 0; bottom: 42px; font-size: 11px; }
  .showcase-track { gap: 34px; padding-inline: 35px; }
  .shot-item { width: 70vw; max-width: 300px; }
  .shot-device img { height: min(57svh, 520px); }
  .shot-description { margin-top: 19px; gap: 12px; h3 { font-size: 13px; } p { font-size: 10px; } }
  .showcase-footer { font-size: 6px; letter-spacing: .3px; gap: 16px; line-height: 1.9; }
}
</style>
