<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWindowScroll, useMouseInElement } from '@vueuse/core'
import { siteConfig } from '~/config/site.config'

const { track } = useAnalytics()
const { monthlyRate } = siteConfig
const { y: scrollY } = useWindowScroll()

// heroRef is internal — parallax only affects elements within this section.
const heroRef = ref<HTMLElement | null>(null)
const { elementX: mouseX, elementY: mouseY, isOutside } = useMouseInElement(heroRef)

const blob1Style = computed(() => {
  const sy = scrollY.value * 0.08
  const mx = isOutside.value ? 0 : (mouseX.value - 540) * 0.012
  const my = isOutside.value ? 0 : (mouseY.value - 360) * 0.009
  return { translate: `${mx}px ${-sy + my}px` }
})
const blob2Style = computed(() => {
  const sy = scrollY.value * 0.05
  const mx = isOutside.value ? 0 : (mouseX.value - 540) * -0.007
  const my = isOutside.value ? 0 : (mouseY.value - 360) * 0.005
  return { translate: `${mx}px ${-sy + my}px` }
})
const blob3Style = computed(() => {
  const sy = scrollY.value * 0.13
  const mx = isOutside.value ? 0 : (mouseX.value - 540) * 0.016
  const my = isOutside.value ? 0 : (mouseY.value - 360) * -0.01
  return { translate: `${mx}px ${-sy + my}px` }
})
</script>

<template>
  <section
    ref="heroRef"
    class="relative min-h-screen flex flex-col justify-center px-12 pt-[120px] pb-24 overflow-hidden md:px-6 md:pt-[100px] sm:px-4 sm:pt-[88px]">
    <div class="hero-blob hero-blob-1" :style="blob1Style" aria-hidden="true" />
    <div class="hero-blob hero-blob-2" :style="blob2Style" aria-hidden="true" />
    <div class="hero-blob hero-blob-3" :style="blob3Style" aria-hidden="true" />

    <div class="relative z-[2] max-w-[1080px] mx-auto w-full">
      <div class="inline-flex items-center gap-2.5 px-4 py-2 mb-10 border border-[#f5c518]/[0.1] bg-[#f5c518]/[0.025] backdrop-blur-md rounded-sm [animation:fade-up_0.8s_ease_both]">
        <span class="w-1.5 h-1.5 rounded-full bg-[#f5c518] shadow-[0_0_10px_rgba(245,197,24,0.55)]" aria-hidden="true" />
        <span class="font-mono text-[9px] tracking-[3px] uppercase text-[#5e5a54]">Manteno, IL — Est. 2024</span>
      </div>

      <h1 class="mb-8">
        <span class="block font-display text-[clamp(48px,7.2vw,88px)] font-extrabold tracking-[-3px] leading-[0.97] text-[#f0ece6] [animation:fade-up_0.8s_0.1s_ease_both]">
          Agency-grade
        </span>
        <span class="block font-display text-[clamp(44px,6.8vw,82px)] font-light tracking-[-2.5px] leading-[1.05] text-[#4e4b48] [animation:fade-up_0.8s_0.18s_ease_both]">
          websites for
        </span>
        <em
          class="block font-headline italic text-[clamp(46px,7vw,86px)] leading-[1.08] hero-gold-text [animation:fade-up_0.8s_0.26s_ease_both]"
          style="letter-spacing: -2px">
          local business.
        </em>
      </h1>

      <p class="text-[15px] text-[#6a6761] max-w-[420px] mb-10 leading-[1.9] [animation:fade-up_0.8s_0.36s_ease_both]">
        Custom-built, not templated. You own every line of code. Managed hosting from {{ monthlyRate }}/month.
      </p>

      <div class="flex items-center gap-4 flex-wrap [animation:fade-up_0.8s_0.46s_ease_both]">
        <a
          href="#contact"
          class="btn-primary"
          @click="track('cta_click', { label: 'Get a Free Quote', location: 'hero' })">
          Get a Free Quote
        </a>
        <a
          href="#pricing"
          class="btn-ghost"
          @click="track('cta_click', { label: 'See Pricing', location: 'hero' })">
          See Pricing
        </a>
      </div>

      <div class="flex items-center gap-6 mt-16 [animation:fade-up_0.8s_0.62s_ease_both]">
        <div class="h-px w-12 bg-gradient-to-r from-[#f5c518]/20 to-transparent" />
        <span class="font-mono text-[9px] tracking-[2.5px] uppercase text-[#302d29]">
          Illinois-based · Custom-built · No contracts
        </span>
      </div>
    </div>

    <div class="absolute bottom-10 left-1/2 -translate-x-1/2 z-[2] flex flex-col items-center gap-3" aria-hidden="true">
      <span class="font-mono text-[8px] tracking-[3.5px] uppercase text-[#252118]">Scroll</span>
      <div class="w-px h-10 bg-gradient-to-b from-[#f5c518]/[0.14] to-transparent animate-bob" />
    </div>
  </section>
</template>
