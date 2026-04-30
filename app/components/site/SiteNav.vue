<script setup lang="ts">
import { computed } from 'vue'
import { useWindowScroll } from '@vueuse/core'

const { track } = useAnalytics()
const { y: scrollY } = useWindowScroll()

// Threshold matches nav height — triggers the frosted-glass effect on scroll.
const scrolled = computed(() => scrollY.value > 56)

defineEmits<{ 'toggle-palette': [] }>()
</script>

<template>
  <nav
    class="fixed top-0 left-0 right-0 z-[90] flex justify-between items-center px-12 py-5 transition-[background,border-color,padding] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] border-b border-transparent md:px-6 sm:px-4"
    :class="{ 'nav-scrolled': scrolled }">
    <img src="https://media.ilytat.com/logo.png" alt="ILYTAT" class="block h-9 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity duration-200">
    <div class="flex items-center gap-5 sm:gap-3">
      <NuxtLink
        to="/blog"
        class="text-[10px] font-medium text-[#5a5650] no-underline tracking-[2px] uppercase transition-colors duration-200 hover:text-[#c8c4be]">
        Blog
      </NuxtLink>
      <button
        class="hidden md:flex items-center gap-1.5 text-[10px] text-[#3f3c37] border border-[#221f1b] rounded-sm px-2.5 py-1.5 transition-[border-color,color] duration-200 hover:border-[#353028] hover:text-[#6e6b5f] cursor-pointer bg-transparent tracking-[1.5px] uppercase"
        title="Open command palette"
        aria-label="Open navigation palette"
        @click.stop="$emit('toggle-palette')">
        <span>Search</span>
        <kbd class="font-sans text-[9px] px-1 py-0.5 rounded-sm bg-[#14110e] border border-[#221f1b] text-[#3f3c37]">⌘K</kbd>
      </button>
      <a
        href="#contact"
        class="nav-cta-btn"
        @click="track('cta_click', { label: 'Nav CTA', location: 'nav' })">
        Get a Quote
      </a>
    </div>
  </nav>
</template>
