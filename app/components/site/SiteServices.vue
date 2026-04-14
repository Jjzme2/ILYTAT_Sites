<script setup lang="ts">
import { siteConfig } from '~/config/site.config'

const { services } = siteConfig

// Emits the clicked service title so the parent can pre-fill the contact form.
const emit = defineEmits<{ 'select-service': [name: string] }>()
</script>

<template>
  <section id="services" class="max-w-[1080px] mx-auto px-12 py-[100px] md:px-6 md:py-20 sm:px-4 sm:py-16">
    <header class="mb-16" data-reveal>
      <p class="eyebrow">What We Build</p>
      <h2 class="font-display text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-2px] text-[#f0ece6] leading-[1.05]">
        Sites that work as hard<br />
        <em class="font-headline italic text-[#f5c518]">as you do</em>
      </h2>
    </header>

    <div class="flex flex-col border-t border-white/[0.05]">
      <a
        v-for="(svc, i) in services"
        :key="svc.title"
        href="#contact"
        class="service-row group flex items-center justify-between py-10 pr-6 border-b border-white/[0.05] text-inherit no-underline pl-5"
        data-reveal
        :data-reveal-delay="i * 100"
        @click="emit('select-service', svc.title)">
        <div class="flex items-start gap-10 sm:gap-5">
          <span
            class="font-display text-[50px] font-extrabold text-white opacity-[0.03] leading-none group-hover:opacity-[0.1] transition-opacity duration-500 mt-1 md:text-[34px] sm:hidden">
            0{{ i + 1 }}
          </span>
          <div class="flex flex-col gap-1.5 mt-1">
            <span class="font-mono text-[9px] tracking-[2px] uppercase text-[#333040]">{{ svc.tag }}</span>
            <h3 class="font-display text-[22px] font-bold text-[#f0ece6] tracking-[-0.5px] sm:text-[18px]">{{ svc.title }}</h3>
            <p class="text-[14px] text-[#55524f] max-w-[520px] leading-[1.85] mt-1">{{ svc.body }}</p>
          </div>
        </div>
        <span class="text-[10px] font-semibold text-[#f5c518] tracking-[2.5px] uppercase opacity-0 -translate-x-3 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 hidden lg:block">
          Start &rarr;
        </span>
      </a>
    </div>
  </section>
</template>
