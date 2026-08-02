<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWindowScroll } from '@vueuse/core'

const { track }                     = useAnalytics()
const { y: scrollY }                = useWindowScroll()
const { lumenEnabled, toggleLumen } = useLumenPrefs()

const scrolled = computed(() => scrollY.value > 56)

// Section links — the header previously offered no route to any of these.
const links = [
  { label: 'Services', href: '#services'  },
  { label: 'Pricing',  href: '#pricing'   },
  { label: 'Work',     href: '#portfolio' },
  { label: 'About',    href: '#about'     },
]

const menuOpen = ref(false)

// Lock body scroll while the mobile panel is open so the page behind stays put.
watch(menuOpen, (open) => {
  if (import.meta.client) document.body.style.overflow = open ? 'hidden' : ''
})

onUnmounted(() => {
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<template>
  <nav
    class="site-nav sticky top-0 z-[90] h-(--nav-h) flex justify-between items-center px-4 md:px-6 lg:px-12 transition-[background,border-color] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] border-b border-transparent"
    :class="{ 'nav-scrolled': scrolled }">

    <!-- Crack-light bottom border — replaces the plain border-b on scroll -->
    <Transition name="crack-fade">
      <div
        v-if="scrolled"
        class="crack-line absolute bottom-0 left-0 right-0 pointer-events-none"
        aria-hidden="true" />
    </Transition>

    <a href="#top" class="flex items-center" aria-label="ILYTAT — back to top">
      <picture>
        <source
          type="image/webp"
          srcset="https://media.ilytat.com/logo-72.webp, https://media.ilytat.com/logo-144.webp 2x">
        <img
          src="https://media.ilytat.com/logo.png"
          alt="ILYTAT"
          width="120" height="36"
          class="block h-7 md:h-9 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity duration-200">
      </picture>
    </a>

    <!-- ── Desktop links ──────────────────────────────────────────────────── -->
    <div class="hidden md:flex items-center gap-6">
      <a
        v-for="link in links"
        :key="link.href"
        :href="link.href"
        class="text-[12px] font-medium text-(--theme-text-hi) no-underline tracking-[1.5px] uppercase transition-colors duration-200 hover:text-(--theme-accent)">
        {{ link.label }}
      </a>

      <NuxtLink
        to="/blog"
        class="text-[12px] font-medium text-(--theme-text-hi) no-underline tracking-[1.5px] uppercase transition-colors duration-200 hover:text-(--theme-accent)">
        Blog
      </NuxtLink>

      <!-- Lumen light toggle — glows when on, dims when off -->
      <button
        class="flex items-center justify-center w-7 h-7 transition-all duration-300 cursor-pointer bg-transparent border-0 p-0"
        :class="lumenEnabled
          ? 'text-[var(--theme-accent)] drop-shadow-[0_0_6px_var(--theme-accent)]'
          : 'text-[var(--theme-text-muted)] hover:text-(--theme-text-hi)'"
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

      <a
        href="#contact"
        class="nav-cta-btn"
        @click="track('cta_click', { label: 'Free Audit', location: 'nav' })">
        Free Audit
      </a>
    </div>

    <!-- ── Mobile trigger ─────────────────────────────────────────────────── -->
    <div class="flex md:hidden items-center gap-3">
      <a
        href="#contact"
        class="nav-cta-btn"
        @click="track('cta_click', { label: 'Free Audit', location: 'nav' })">
        Free Audit
      </a>

      <button
        class="flex items-center justify-center w-9 h-9 -mr-2 bg-transparent border-0 p-0 cursor-pointer text-(--theme-text-hi)"
        :aria-expanded="menuOpen"
        aria-controls="mobile-menu"
        :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
        @click="menuOpen = !menuOpen">
        <UIcon :name="menuOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'" class="w-6 h-6" />
      </button>
    </div>

    <!-- ── Mobile panel ───────────────────────────────────────────────────── -->
    <Transition name="menu-fade">
      <div
        v-if="menuOpen"
        id="mobile-menu"
        class="md:hidden fixed left-0 right-0 top-(--nav-h) bottom-0 z-[89] bg-[var(--theme-bg)] px-4 py-6 flex flex-col gap-1 overflow-y-auto">
        <a
          v-for="link in links"
          :key="link.href"
          :href="link.href"
          class="py-4 text-[17px] font-medium text-(--theme-text) no-underline border-b border-white/[0.06]"
          @click="menuOpen = false">
          {{ link.label }}
        </a>

        <NuxtLink
          to="/blog"
          class="py-4 text-[17px] font-medium text-(--theme-text) no-underline border-b border-white/[0.06]"
          @click="menuOpen = false">
          Blog
        </NuxtLink>

        <a
          href="#contact"
          class="btn-primary mt-6 justify-center"
          @click="menuOpen = false; track('cta_click', { label: 'Free Audit', location: 'mobile-menu' })">
          Get a Free Audit
        </a>
      </div>
    </Transition>
  </nav>
</template>

<style scoped>
.crack-fade-enter-active { transition: opacity 0.4s ease; }
.crack-fade-leave-active { transition: opacity 0.2s ease; }
.crack-fade-enter-from,
.crack-fade-leave-to { opacity: 0; }

.menu-fade-enter-active,
.menu-fade-leave-active { transition: opacity 0.2s ease; }
.menu-fade-enter-from,
.menu-fade-leave-to { opacity: 0; }
</style>
