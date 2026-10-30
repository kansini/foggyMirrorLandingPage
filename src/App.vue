<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import AppIcon from './components/AppIcon.vue'
import FogMirror from './components/FogMirror.vue'
import AppShowcase from './components/AppShowcase.vue'
import MistMemories from './components/MistMemories.vue'
import ThemeMist from './components/ThemeMist.vue'
import { screenshotUrl } from './screenshots'
import { usePreferences } from './composables/usePreferences'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)
// Keep the pinned scene steady while mobile browser chrome retracts.
ScrollTrigger.config({ ignoreMobileResize: true })
const appStoreUrl = 'https://apps.apple.com/us/app/%E9%9B%BE%E9%95%9C/id6821307625'
const contactEmail = 'flood_flink@163.com'
const { locale, theme, copy: c, setLocale, toggleTheme } = usePreferences()
const root = ref<HTMLElement>()
const heroStage = ref<HTMLElement>()
const handoffPhone = ref<HTMLButtonElement>()
const mirror = ref<InstanceType<typeof FogMirror>>()
const themeMist = ref<InstanceType<typeof ThemeMist>>()
const inHandoff = ref(false)
const previewIndex = ref(1)
const menuOpen = ref(false)
const headerOnPaper = ref(false)
const heroCollapsed = ref(false)
const activeMood = ref('morning')
const privacyDialog = ref<HTMLDialogElement>()
const interfaceDialog = ref<HTMLDialogElement>()
const selectedMood = computed(() => c.value.moods.find(mood => mood.id === activeMood.value) || c.value.moods[0]!)
const navTargets = ['#play', '#story', '#weather', '#contact']
const otherApps = [
  { name: 'Art Detective', url: 'https://art-detective.netlify.app' },
  { name: 'Silver Salt', url: 'https://silver-salt.netlify.app' },
  { name: 'Oddletics', url: 'https://oddletics.cn' },
]
let animationContext: gsap.Context | undefined
let motion: gsap.MatchMedia | undefined
let events: AbortController | undefined
let refreshFrame = 0
let headerObserver: IntersectionObserver | undefined

function changeTheme(event: MouseEvent) {
  const source = event.currentTarget as HTMLElement
  const apply = async () => { toggleTheme(); await nextTick() }
  if (themeMist.value) void themeMist.value.run(source, theme.value !== 'dark', apply, () => mirror.value?.breatheForTheme())
  else void apply()
}

function closeMenu() { menuOpen.value = false }
function openPrivacy() { closeMenu(); privacyDialog.value?.showModal() }
function openInterface(index = 1) { previewIndex.value = index; interfaceDialog.value?.showModal() }
function dismissBackdrop(event: MouseEvent, dialog?: HTMLDialogElement) {
  if (event.target !== dialog) return
  const rect = dialog.getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close()
}

watch(locale, async () => {
  await nextTick()
  ScrollTrigger.refresh()
})

onMounted(() => {
  events = new AbortController()
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu()
  }, { signal: events.signal })
  headerObserver = new IntersectionObserver(entries => {
    headerOnPaper.value = !(entries[0]?.isIntersecting ?? false)
  }, { rootMargin: '-100px 0px 0px 0px', threshold: 0 })
  if (heroStage.value) headerObserver.observe(heroStage.value)
  animationContext = gsap.context(() => {
    motion = gsap.matchMedia()
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo('.mist-title-line', { y: 25, opacity: 0, filter: 'blur(18px)' }, {
        y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.65, stagger: 0.17,
        ease: 'power2.out', clearProps: 'transform,opacity,filter',
      })
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach(element => {
        gsap.fromTo(element, { y: 30, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.9, ease: 'power2.out',
          clearProps: 'transform,opacity',
          scrollTrigger: { trigger: element, start: 'top 93%', once: true },
        })
      })
      gsap.fromTo('.weather-window', { yPercent: 9, rotate: -7 }, {
        yPercent: -7, rotate: 3, ease: 'none',
        scrollTrigger: { trigger: '#weather', start: 'top bottom', end: 'bottom top', scrub: 1 },
      })
    })
    motion.add({
      spacious: '(min-width: 1000px) and (min-height: 700px)',
      animated: '(prefers-reduced-motion: no-preference)',
    }, context => {
      if (!context.conditions?.animated) return
      const compact = !context.conditions.spacious
      const aperture = () => {
        const stage = heroStage.value!
        const phone = handoffPhone.value!
        // Read layout dimensions rather than the animated screen rectangle so
        // the cutout matches the responsive phone in portrait and landscape.
        const top = phone.offsetTop - phone.offsetHeight / 2
        const left = phone.offsetLeft - phone.offsetWidth / 2
        const right = stage.clientWidth - left - phone.offsetWidth
        const bottom = stage.clientHeight - top - phone.offsetHeight
        const corner = Math.min(40, phone.offsetWidth * .12)
        return 'inset(' + top + 'px ' + right + 'px ' + bottom + 'px ' + left + 'px round ' + corner + 'px)'
      }
      const scene = gsap.timeline({
        scrollTrigger: {
          trigger: heroStage.value, pin: heroStage.value, start: 'top top',
          end: () => '+=' + Math.round(Math.min(heroStage.value!.clientHeight, window.innerHeight) * (compact ? .95 : 1.05)),
          scrub: compact ? .45 : 1, anticipatePin: 1,
          invalidateOnRefresh: true, refreshPriority: 10,
        },
      })
      scene.to('.mirror-intro', { yPercent: -10, autoAlpha: 0, duration: 0.28 }, 0)
        .fromTo('.fullscreen-mirror', { clipPath: 'inset(0px 0px 0px 0px round 0px)' }, { clipPath: aperture, duration: 0.72, ease: 'power2.inOut' }, 0.04)
        .fromTo('.handoff-word', { xPercent: -8, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 0.08, duration: 0.7 }, 0.2)
        .fromTo('.handoff-phone', { autoAlpha: 0, scale: 1.045 }, { autoAlpha: 1, scale: 1, duration: 0.28 }, 0.51)
        .to('.fullscreen-mirror', { autoAlpha: 0, duration: 0.2 }, 0.65)
        .fromTo('.handoff-copy', { y: compact ? 22 : 35, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.3 }, 0.63)
      // Follow the rendered timeline in both directions, including scrub easing.
      scene.eventCallback('onUpdate', () => {
        const next = scene.time() >= .45
        if (next && !inHandoff.value) mirror.value?.finishDrawing()
        inHandoff.value = next
        heroCollapsed.value = scene.time() >= .76
      })
      return () => { inHandoff.value = false; heroCollapsed.value = false }
    })
  }, root.value)
  refreshFrame = requestAnimationFrame(() => {
    ScrollTrigger.sort()
    ScrollTrigger.refresh()
  })
})

onBeforeUnmount(() => {
  cancelAnimationFrame(refreshFrame)
  motion?.revert()
  animationContext?.revert()
  events?.abort()
  headerObserver?.disconnect()
})
</script>

<template>
  <div ref="root" class="site-shell" :class="{ 'is-english': locale === 'en' }">
    <ThemeMist ref="themeMist" />
    <a class="skip-link" href="#main">{{ c.skip }}</a>

    <header class="site-header" :class="{ 'is-on-paper': headerOnPaper || heroCollapsed }">
      <div class="header-inner">
      <a href="#" class="brand" :aria-label="c.home" @click="closeMenu">
        <img src="/appicon.jpg" alt="" width="38" height="38" />
        <span>{{ c.brand }}<small>FOGGY MIRROR</small></span>
      </a>
      <nav class="desktop-nav" :aria-label="c.navigation">
        <a v-for="(label, index) in c.nav" :key="index" :href="navTargets[index]">
          <sup>0{{ index + 1 }}</sup>{{ label }}
        </a>
      </nav>
      <div class="header-tools">
        <div class="language-switch" role="group" :aria-label="c.language">
          <button :aria-pressed="locale === 'zh'" lang="zh-CN" @click="setLocale('zh')">中</button>
          <span aria-hidden="true">/</span>
          <button :aria-pressed="locale === 'en'" lang="en" @click="setLocale('en')">EN</button>
        </div>
        <button
          class="theme-toggle icon-button"
          :aria-label="theme === 'dark' ? c.light : c.dark"
          :title="theme === 'dark' ? c.light : c.dark"
          :aria-pressed="theme === 'dark'"
          :aria-busy="themeMist?.busy || undefined"
          @click="changeTheme"
        ><span class="theme-toggle-icon"><AppIcon :name="theme === 'dark' ? 'sun' : 'moon'" :size="20" /></span></button>
        <a class="header-download" :href="appStoreUrl" target="_blank" rel="noopener noreferrer">
          {{ c.download }}<AppIcon name="arrow" :size="16" />
        </a>
        <button
          class="menu-toggle icon-button"
          :aria-expanded="menuOpen" aria-controls="mobile-nav"
          :aria-label="menuOpen ? c.close : c.menu" @click="menuOpen = !menuOpen"
        ><AppIcon :name="menuOpen ? 'close' : 'menu'" :size="22" /></button>
      </div>
      <nav v-if="menuOpen" id="mobile-nav" class="mobile-nav" :aria-label="c.navigation">
        <a v-for="(label, index) in c.nav" :key="index" :href="navTargets[index]" @click="closeMenu">
          <span>0{{ index + 1 }} / {{ label }}</span><AppIcon name="arrow" :size="18" />
        </a>
      </nav>
      </div>
    </header>

    <main id="main">
      <section id="play" class="immersive-hero" aria-labelledby="hero-title">
        <div ref="heroStage" class="immersive-stage">
          <FogMirror ref="mirror" :mood="activeMood" :dark="theme === 'dark'" :labels="c.mirror" :inactive="inHandoff" :inert="inHandoff" />
          <div class="mirror-intro">
            <div class="mirror-edition"><span>FOGGY MIRROR / INTERACTIVE GLASS</span><span>{{ c.immersion.label }}</span></div>
            <div class="mirror-copy">
              <div class="mist-title">
              <span class="micro-label">{{ c.hero.label }}</span>
              <h1 id="hero-title"><span class="mist-title-line">{{ c.hero.lineOne }}</span><span class="mist-title-line">{{ c.hero.lineTwo }}</span></h1>
              <p class="handwritten">{{ c.hero.aside }}</p>
            </div>
            <div class="mirror-invitation">
              <p class="preserve-lines">{{ c.hero.description }}</p>
              <div class="immersive-actions">
                <a class="mist-store" :href="appStoreUrl" target="_blank" rel="noopener noreferrer"><AppIcon name="apple" :size="23" />{{ c.download }}<AppIcon name="arrow" :size="17" /></a>
                <button @click="openInterface()">{{ c.hero.preview }}<AppIcon name="arrow" :size="15" /></button>
              </div>
            </div>
            </div>
            <p class="mirror-side-note handwritten">{{ c.immersion.hint }}</p>
            <a class="mirror-scroll" href="#story"><span>{{ c.immersion.scroll }}</span><span class="scroll-line" aria-hidden="true"></span><AppIcon name="down" :size="17" /></a>
          </div>
          <span class="handoff-word" aria-hidden="true">POCKET WONDER.</span>
          <button ref="handoffPhone" class="handoff-phone" :inert="!inHandoff" :aria-label="c.hero.preview" @click="openInterface()">
            <img :src="screenshotUrl(locale, 1)" :alt="c.showcase.items[1]?.alt" width="720" height="1470" />
          </button>
          <div class="handoff-copy">
            <span class="micro-label">FROM A WINDOW TO YOUR WORLD</span>
            <h2><span v-for="line in c.immersion.handoff" :key="line">{{ line }}</span></h2>
            <p>{{ c.immersion.handoffNote }}</p>
          </div>
        </div>
      </section>

      <AppShowcase id="story" :locale="locale" @preview="openInterface" />

      <section id="weather" class="weather-section" :class="'weather-' + activeMood" aria-labelledby="weather-title">
        <div class="weather-top page-width" data-reveal>
          <span class="micro-label">{{ c.weather.label }}</span>
          <div><h2 id="weather-title">{{ c.weather.title }}</h2><p>{{ c.weather.subtitle }}</p></div>
          <span class="weather-symbol" aria-hidden="true"><AppIcon :name="selectedMood.icon" :size="37" /></span>
        </div>
        <div class="weather-stage page-width">
          <span class="weather-word" aria-hidden="true">{{ selectedMood.word }}</span>
          <div class="weather-selector" role="group" :aria-label="c.weather.select" data-reveal>
            <button v-for="(mood, index) in c.moods" :key="mood.id" :aria-pressed="activeMood === mood.id" @click="activeMood = mood.id">
              <span class="weather-selector-number">0{{ index + 1 }}</span>
              <AppIcon :name="mood.icon" :size="19" />
              <span>{{ mood.name }}</span><i aria-hidden="true">↗</i>
            </button>
          </div>
          <figure class="weather-window" data-reveal>
            <img src="/images/fog-friend.jpg" :alt="c.weather.imageAlt" width="1080" height="1920" loading="lazy" />
            <div class="weather-filter"></div>
            <figcaption class="handwritten">{{ c.weather.caption }}</figcaption>
            <span class="weather-clock" aria-hidden="true">{{ selectedMood.time }}</span>
          </figure>
          <div class="weather-reading" aria-live="polite" aria-atomic="true" data-reveal>
            <span class="weather-reading-index">/ 0{{ c.moods.indexOf(selectedMood) + 1 }}</span>
            <h3>{{ selectedMood.line }}</h3><p>{{ selectedMood.description }}</p>
            <a class="text-link" href="#play">{{ c.weather.preview }}<AppIcon name="arrow" :size="17" /></a>
          </div>
        </div>
        <div class="weather-bottom page-width"><span>FOGGY MIRROR / {{ selectedMood.word.toUpperCase() }}</span><span>{{ c.weather.note }}</span></div>
      </section>

      <MistMemories :copy="c.moments" :locale="locale" :dark="theme === 'dark'" />

      <section class="privacy-note page-width" data-reveal aria-labelledby="privacy-title">
        <span class="privacy-marker"><AppIcon name="shield" :size="29" /></span>
        <div><span class="micro-label">{{ c.privacy.label }}</span><h2 id="privacy-title">{{ c.privacy.title }}</h2><p>{{ c.privacy.summary }}</p></div>
        <button class="text-link" @click="openPrivacy">{{ c.privacy.more }}<AppIcon name="arrow" :size="17" /></button>
      </section>

      <section class="faq-section page-width" aria-labelledby="faq-title">
        <div class="faq-intro" data-reveal><span class="micro-label">{{ c.faq.label }}</span><h2 id="faq-title">{{ c.faq.title }}</h2><span class="handwritten" aria-hidden="true">Q & a.</span></div>
        <div class="faq-list" data-reveal>
          <details v-for="(faq, index) in c.faq.items" :key="index">
            <summary><span class="faq-number">0{{ index + 1 }}</span><span>{{ faq.question }}</span><AppIcon name="plus" :size="20" /></summary>
            <p>{{ faq.answer }}</p>
          </details>
        </div>
      </section>

      <section class="ending" aria-labelledby="ending-title">
        <div class="ending-aura" aria-hidden="true"></div>
        <div class="ending-inner page-width">
          <span class="micro-label" data-reveal>{{ c.ending.label }}</span>
          <h2 id="ending-title" data-reveal><span v-for="line in c.ending.title" :key="line">{{ line }}</span><span class="ending-asterisk" aria-hidden="true">✳</span></h2>
          <div class="ending-bottom" data-reveal>
            <div><p class="preserve-lines">{{ c.ending.description }}</p><span class="ending-platform">{{ c.ending.platform }}</span></div>
            <a class="ending-download" :href="appStoreUrl" target="_blank" rel="noopener noreferrer">
              <span><AppIcon name="apple" :size="24" />{{ c.download }}</span>
              <span class="ending-download-arrow"><AppIcon name="arrow" :size="33" /></span>
            </a>
          </div>
          <span class="ending-scribble handwritten" aria-hidden="true">{{ c.ending.note }}</span>
        </div>
      </section>
      <section id="contact" class="contact-section page-width" aria-labelledby="contact-title">
        <div class="contact-panel">
          <div class="contact-heading">
            <span class="micro-label">{{ c.contact }}</span>
            <h2 id="contact-title">{{ c.contactSection.title }}</h2>
            <p>{{ c.contactSection.description }}</p>
          </div>
          <address class="contact-method">
            <a class="contact-email" :href="'mailto:' + contactEmail" :aria-label="c.contact + ': ' + contactEmail">
              <AppIcon name="mail" :size="23" />
              <span class="contact-label">{{ c.contactSection.email }}</span>
              <span class="contact-address">{{ contactEmail }}</span>
            </a>
          </address>
        </div>
      </section>
    </main>

    <footer class="footer-wrap page-width">
      <nav class="footer-apps" :aria-label="c.moreApps.title">
        <span class="footer-apps-label">{{ c.moreApps.title }}</span>
        <ul>
          <li v-for="app in otherApps" :key="app.url">
            <a :href="app.url" target="_blank" rel="noopener noreferrer" :aria-label="app.name + ' · ' + c.moreApps.newTab">
              <span>{{ app.name }}</span><AppIcon name="arrow" :size="15" />
            </a>
          </li>
        </ul>
      </nav>
      <div class="site-footer">
        <a href="#" class="footer-brand">{{ c.brand }}<span>FOGGY MIRROR</span></a>
        <p>{{ c.footer }}</p>
        <div><button @click="openPrivacy">{{ c.privacy.more }}</button><span>© {{ new Date().getFullYear() }} FOGGY MIRROR</span></div>
      </div>
    </footer>

    <dialog ref="privacyDialog" class="content-dialog" aria-labelledby="privacy-dialog-title" @click="dismissBackdrop($event, privacyDialog)">
      <div class="dialog-content">
        <button class="dialog-close icon-button" :aria-label="c.close" @click="privacyDialog?.close()"><AppIcon name="close" /></button>
        <AppIcon name="shield" :size="35" />
        <p class="micro-label">{{ c.privacy.label }}</p><h2 id="privacy-dialog-title">{{ c.privacy.title }}</h2>
        <p v-for="paragraph in c.privacy.paragraphs" :key="paragraph">{{ paragraph }}</p>
        <a class="text-link" :href="appStoreUrl" target="_blank" rel="noopener noreferrer">{{ c.privacy.store }}<AppIcon name="arrow" :size="17" /></a>
      </div>
    </dialog>
    <dialog ref="interfaceDialog" class="content-dialog interface-dialog" aria-labelledby="interface-dialog-title" @click="dismissBackdrop($event, interfaceDialog)">
      <div class="dialog-content">
        <button class="dialog-close icon-button" :aria-label="c.close" @click="interfaceDialog?.close()"><AppIcon name="close" /></button>
        <p class="micro-label">{{ c.preview.label }}</p><h2 id="interface-dialog-title">{{ c.showcase.items[previewIndex]?.title }}</h2>
        <img :src="screenshotUrl(locale, previewIndex)" :alt="c.showcase.items[previewIndex]?.alt" width="720" height="1470" />
        <div class="screenshot-navigation">
          <button :aria-label="c.showcase.previous" @click="previewIndex = (previewIndex + 4) % 5"><AppIcon name="right" :size="21" /></button>
          <span>0{{ previewIndex + 1 }} / 05</span>
          <button :aria-label="c.showcase.next" @click="previewIndex = (previewIndex + 1) % 5"><AppIcon name="right" :size="21" /></button>
        </div>
        <p class="interface-caption">{{ c.preview.caption }}</p>
      </div>
    </dialog>
  </div>
</template>
