<script setup lang="ts">
defineProps<{
  testimonials: Array<{
    id: string
    name: string
    businessName: string
    quote: string
  }>
}>()
</script>

<template>
  <section
    class="max-w-[1080px] mx-auto px-12 pb-[100px] md:px-6 md:pb-20 sm:px-4 sm:pb-16">
    <header class="mb-16" data-reveal>
      <p class="eyebrow">What Clients Say</p>
      <h2 class="font-display text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-2px] text-[var(--theme-text)] leading-[1.05]">Built on real results</h2>
    </header>
    <div class="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
      <LumenSurface
        v-for="(t, i) in testimonials"
        :key="t.id"
        palette="rose-teal"
        class="glass-deep rounded-sm flex flex-col transition-[border-color,transform,box-shadow] duration-300 hover:border-white/[0.14] hover:-translate-y-1.5 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
        data-reveal
        :data-reveal-delay="i * 100">
        <span class="absolute top-0 right-5 font-serif text-[96px] leading-none text-[#f5c518]/[0.055] select-none pointer-events-none translate-y-[-8px]" aria-hidden="true">"</span>
        <div class="px-7 py-8 flex flex-col gap-5 flex-1">
          <p class="text-[14.5px] text-[#a09894]/85 leading-[1.92] flex-1 italic">"{{ t.quote }}"</p>
          <div class="pt-4 border-t border-white/[0.05]">
            <p class="text-[14px] font-semibold text-[#e8e2da] mb-0.5">{{ t.name }}</p>
            <p class="font-mono text-[9px] text-[#454250] tracking-[1.5px] uppercase">{{ t.businessName }}</p>
          </div>
        </div>
      </LumenSurface>
    </div>
  </section>
</template>
