<template>
  <div class="relative border-t border-b border-white/4 overflow-hidden" style="background: var(--theme-surface-alt)">

    <!-- Top crack glow -->
    <div
      class="absolute top-0 left-0 right-0 h-px pointer-events-none"
      style="background: linear-gradient(to right, transparent, color-mix(in srgb, var(--theme-accent) 28%, transparent) 20%, color-mix(in srgb, var(--theme-accent) 60%, white) 50%, color-mix(in srgb, var(--theme-accent) 28%, transparent) 80%, transparent); box-shadow: 0 0 12px 2px color-mix(in srgb, var(--theme-accent) 20%, transparent)"
      aria-hidden="true" />

    <div class="max-w-[1080px] mx-auto px-12 py-14 md:px-6 md:py-10 sm:px-4 sm:py-8">

      <!-- Eyebrow + headline -->
      <div class="flex flex-col items-center text-center mb-10 md:mb-8">
        <p class="eyebrow justify-center">Google PageSpeed Insights</p>
        <h2 class="font-display text-[clamp(22px,3vw,32px)] font-extrabold tracking-[-1px] text-(--theme-text) leading-[1.1] mt-1">
          Built fast. Verified.
        </h2>
        <p class="text-[13px] text-(--theme-text-body) mt-3 max-w-[460px] leading-[1.7]">
          Every ILYTAT site is built to score green on Google's real-device speed test — because a slow site loses customers before they read a single word.
        </p>
      </div>

      <!-- Mobile scores -->
      <div class="mb-6">
        <p class="font-mono text-[8px] tracking-[2.5px] uppercase text-(--theme-text-ghost) mb-3 flex items-center gap-3">
          <span>Mobile</span>
          <span class="flex-1 h-px" style="background: rgba(255,255,255,0.04)" />
        </p>
        <div class="grid grid-cols-4 gap-3 sm:grid-cols-2">
          <div
            v-for="score in mobile"
            :key="'m-' + score.label"
            class="flex flex-col items-center gap-1.5 py-5 px-3 glass-deep"
            style="clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))">
            <span
              class="font-headline italic font-light leading-none"
              :class="score.value === 100 ? 'text-(--theme-accent)' : 'text-(--theme-text)'"
              style="font-size: clamp(36px, 4.5vw, 54px)">{{ score.value }}</span>
            <span class="font-mono text-[7.5px] tracking-[2px] uppercase text-(--theme-text-ghost) text-center leading-[1.4]">{{ score.label }}</span>
          </div>
        </div>
      </div>

      <!-- Desktop scores -->
      <div class="mb-8">
        <p class="font-mono text-[8px] tracking-[2.5px] uppercase text-(--theme-text-ghost) mb-3 flex items-center gap-3">
          <span>Desktop</span>
          <span class="flex-1 h-px" style="background: rgba(255,255,255,0.04)" />
        </p>
        <div class="grid grid-cols-4 gap-3 sm:grid-cols-2">
          <div
            v-for="score in desktop"
            :key="'d-' + score.label"
            class="flex flex-col items-center gap-1.5 py-5 px-3 glass-deep"
            style="clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))">
            <span
              class="font-headline italic font-light leading-none"
              :class="score.value === 100 ? 'text-(--theme-accent)' : 'text-(--theme-text)'"
              style="font-size: clamp(36px, 4.5vw, 54px)">{{ score.value }}</span>
            <span class="font-mono text-[7.5px] tracking-[2px] uppercase text-(--theme-text-ghost) text-center leading-[1.4]">{{ score.label }}</span>
          </div>
        </div>
      </div>

      <!-- Attribution -->
      <p class="text-center font-mono text-[8px] tracking-[2px] uppercase text-(--theme-text-faint)">
        Lighthouse 13.3 &nbsp;·&nbsp; Slow 4G (Mobile) &nbsp;·&nbsp; Jun 2026
      </p>

    </div>

    <!-- Bottom border -->
    <div
      class="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
      style="background: linear-gradient(to right, transparent, rgba(255,255,255,0.04) 50%, transparent)"
      aria-hidden="true" />

  </div>
</template>

<script setup lang="ts">
const mobile = [
  { value: 97,  label: 'Performance' },
  { value: 97,  label: 'Accessibility' },
  { value: 100, label: 'Best Practices' },
  { value: 100, label: 'SEO' },
]

const desktop = [
  { value: 99,  label: 'Performance' },
  { value: 97,  label: 'Accessibility' },
  { value: 100, label: 'Best Practices' },
  { value: 100, label: 'SEO' },
]
</script>
