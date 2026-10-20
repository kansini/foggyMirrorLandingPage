<script setup lang="ts">
defineProps<{ name: string; size?: number }>()
const paths: Record<string, string> = {
  arrow: 'M7 17 17 7M7 7h10v10',
  right: 'M4 12h16m-6-6 6 6-6 6',
  down: 'M12 4v16m-6-6 6 6 6-6',
  wind: 'M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h5a3 3 0 1 1-3 3',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  sparkle: 'm12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3ZM20 2v4m-2-2h4',
  camera: 'M8 5 6 8H3v12h18V8h-3l-2-3ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6',
  layers: 'm12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
  moon: 'M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z',
  drop: 'M12 2s-7 8-7 13a7 7 0 0 0 14 0c0-5-7-13-7-13Zm-3 13a3 3 0 0 0 3 3',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'm6 6 12 12M6 18 18 6',
  plus: 'M12 5v14M5 12h14',
  check: 'm5 12 4 4L19 6',
  pen: 'm15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14l-1 7 6-2',
}
</script>

<template>
  <svg v-if="name === 'apple'" :width="size || 24" :height="size || 24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.1 12.5c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.8-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.6 2.2 2.8 2.1 1.1 0 1.6-.7 3-.7s1.8.7 3 .7 1.9-1.1 2.7-2.2a10 10 0 0 0 1.2-2.5c-.1 0-2.4-.9-2.4-3.9ZM14.9 5.9A4.3 4.3 0 0 0 15.9 3a4.3 4.3 0 0 0-2.8 1.5 4 4 0 0 0-1 2.8c1.1.1 2.1-.5 2.8-1.4Z" />
  </svg>
  <svg v-else :width="size || 24" :height="size || 24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name] || paths.sparkle" /></svg>
</template>
