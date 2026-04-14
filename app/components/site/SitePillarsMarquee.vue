<script setup lang="ts">
import { siteConfig } from '~/config/site.config'

const { pillars } = siteConfig
</script>

<template>
  <div class="border-t border-b border-white/[0.04] bg-[#0b0906] py-4 overflow-hidden relative">
    <div
      class="absolute inset-y-0 left-0 w-20 z-10 pointer-events-none"
      style="background: linear-gradient(to right, #0b0906, transparent)"
      aria-hidden="true" />
    <div
      class="absolute inset-y-0 right-0 w-20 z-10 pointer-events-none"
      style="background: linear-gradient(to left, #0b0906, transparent)"
      aria-hidden="true" />
    <div class="animate-marquee" aria-hidden="true">
      <template v-for="n in 6" :key="n">
        <template v-for="p in pillars" :key="`${n}-${p.title}`">
          <span class="flex items-center gap-2.5 px-7 whitespace-nowrap">
            <UIcon :name="p.icon" class="w-3 h-3 text-[#f5c518]/25 flex-shrink-0" />
            <span class="font-mono text-[9.5px] tracking-[1.5px] uppercase text-[#3a3530]">{{ p.title }}</span>
          </span>
          <span class="text-[#2a2520] text-[10px] flex-shrink-0 select-none">·</span>
        </template>
      </template>
    </div>
  </div>
</template>
