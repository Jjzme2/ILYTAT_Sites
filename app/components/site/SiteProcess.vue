<script setup lang="ts">
import { siteConfig } from '~/config/site.config'

const { steps } = siteConfig
</script>

<template>
  <section id="how-it-works" class="bg-[#0e0c0a] section-layer py-[100px] sm:py-16">
    <div class="max-w-[1080px] mx-auto px-12 md:px-6 sm:px-4">
      <header class="mb-20" data-reveal>
        <p class="eyebrow">How It Works</p>
        <h2 class="font-display text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-2px] text-[#f0ece6] leading-[1.05] mt-2">
          Simple from day one.
        </h2>
        <p class="text-[14px] text-[#55524f] mt-4 leading-[1.85] max-w-[400px]">
          No mystery timelines. No confusing agency process.
        </p>
      </header>

      <div class="relative">
        <div
          class="hidden lg:block absolute top-[22px] left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
          aria-hidden="true" />
        <div class="grid grid-cols-1 gap-14 lg:grid-cols-3 lg:gap-10">
          <div
            v-for="(step, i) in steps"
            :key="step.n"
            class="flex flex-col items-start lg:items-center lg:text-center group"
            data-reveal
            :data-reveal-delay="i * 120">
            <div class="w-[44px] h-[44px] rounded-full border border-white/[0.08] bg-[#0c0c0e] flex items-center justify-center mb-6 relative z-10 transition-all duration-400 group-hover:border-[#f5c518]/25 group-hover:shadow-[0_0_20px_rgba(245,197,24,0.07)]">
              <div class="w-2 h-2 rounded-full bg-[#f5c518]/30 group-hover:bg-[#f5c518]/70 transition-colors duration-400" />
            </div>
            <span class="font-mono text-[9px] tracking-[2.5px] uppercase text-[#f5c518]/40 mb-3">Phase {{ step.n }}</span>
            <h3 class="font-display text-[17px] font-bold text-[#f0ece6] mb-3 tracking-[-0.3px]">{{ step.title }}</h3>
            <p class="text-[13.5px] text-[#55524f] leading-[1.9] max-w-[260px] lg:mx-auto">{{ step.body }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
