<script setup lang="ts">
import { computed } from 'vue'
import { useWindowScroll } from '@vueuse/core'

const { track }                    = useAnalytics()
const { y: scrollY }               = useWindowScroll()
const { theme, setTheme }          = useTheme()
const { lumenEnabled, toggleLumen } = useLumenPrefs()

const scrolled = computed(() => scrollY.value > 56)

defineEmits<{ 'toggle-palette': [] }>()

const THEMES = [
  { key: 'ember', label: 'Ember' },
  { key: 'frost', label: 'Frost' },
  { key: 'void',  label: 'Void'  },
] as const
</script>

<template>
  <nav
    class="fixed top-0 left-0 right-0 z-[90] flex justify-between items-center px-12 py-5 transition-[background,border-color,padding] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] border-b border-transparent md:px-6 sm:px-4"
    :class="{ 'nav-scrolled': scrolled }">

    <!-- Crack-light bottom border — replaces the plain border-b on scroll -->
    <Transition name="crack-fade">
      <div
        v-if="scrolled"
        class="crack-line absolute bottom-0 left-0 right-0 pointer-events-none"
        aria-hidden="true" />
    </Transition>

    <img
      src="https://media.ilytat.com/logo.png"
      alt="ILYTAT"
      class="block h-9 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity duration-200">

    <div class="flex items-center gap-4 sm:gap-3">

      <NuxtLink
        to="/blog"
        class="text-[10px] font-medium text-[#5a5650] no-underline tracking-[2px] uppercase transition-colors duration-200 hover:text-[var(--theme-text-hi)]">
        Blog
      </NuxtLink>

      <!-- Lumen light toggle — glows when on, dims when off -->
      <button
        class="hidden sm:flex items-center justify-center w-7 h-7 transition-all duration-300 cursor-pointer bg-transparent border-0 p-0"
        :class="lumenEnabled
          ? 'text-[var(--theme-accent)] drop-shadow-[0_0_6px_var(--theme-accent)]'
          : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-hi)]'"
        :title="lumenEnabled ? 'Disable light effects' : 'Enable light effects'"
        :aria-label="lumenEnabled ? 'Disable light effects' : 'Enable light effects'"
        @click="toggleLumen">
        <!-- 4-pointed kintsugi star — matches the crack/light aesthetic -->
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M7 0 C7 0 6.5 3.5 5 5 C3.5 6.5 0 7 0 7 C0 7 3.5 7.5 5 9 C6.5 10.5 7 14 7 14 C7 14 7.5 10.5 9 9 C10.5 7.5 14 7 14 7 C14 7 10.5 6.5 9 5 C7.5 3.5 7 0 7 0 Z"
            fill="currentColor" />
        </svg>
      </button>

      <!-- 3-color theme selector -->
      <div class="hidden sm:flex items-center rounded-none border border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] p-0.5 gap-0.5 backdrop-blur-md"
           style="clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))">
        <button
          v-for="t in THEMES"
          :key="t.key"
          :class="[
            'font-mono text-[8px] uppercase tracking-[1.5px] px-2.5 py-1.5 transition-all duration-200 relative',
            theme === t.key
              ? 'text-[var(--theme-accent)] bg-[var(--theme-accent)]/[0.12]'
              : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-hi)]',
          ]"
          :title="`Switch to ${t.label} theme`"
          @click="setTheme(t.key)">
          {{ t.label }}
          <span
            v-if="theme === t.key"
            class="absolute inset-x-1 bottom-0 h-px"
            style="background: var(--theme-accent); box-shadow: 0 0 4px var(--theme-accent);"
            aria-hidden="true" />
        </button>
      </div>

      <button
        class="hidden md:flex items-center gap-1.5 text-[10px] text-[#3f3c37] border border-[#221f1b] px-2.5 py-1.5 transition-[border-color,color] duration-200 hover:border-[var(--theme-accent)]/30 hover:text-[var(--theme-text-hi)] cursor-pointer bg-transparent tracking-[1.5px] uppercase"
        style="clip-path: polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))"
        title="Open command palette"
        aria-label="Open navigation palette"
        @click.stop="$emit('toggle-palette')">
        <span>Search</span>
        <kbd class="font-sans text-[9px] px-1 py-0.5 bg-[#14110e] border border-[#221f1b] text-[#3f3c37]">⌘K</kbd>
      </button>

      <a
        href="#contact"
        class="nav-cta-btn"
        style="clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 7px 100%, 0 calc(100% - 7px))"
        @click="track('cta_click', { label: 'Free Audit', location: 'nav' })">
        Free Audit
      </a>
    </div>
  </nav>
</template>

<style scoped>
.crack-fade-enter-active { transition: opacity 0.4s ease; }
.crack-fade-leave-active { transition: opacity 0.2s ease; }
.crack-fade-enter-from,
.crack-fade-leave-to { opacity: 0; }
</style>
