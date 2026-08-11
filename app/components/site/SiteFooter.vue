<script setup lang="ts">
import { siteContent } from '~/utils/siteContent'

const { founder, contact } = siteContent
const year = new Date().getFullYear()

// Same CDN fallback as the nav — never render a broken-image icon. The @error
// listener can miss a server-rendered image that already failed, so re-check
// the element once mounted.
const logoFailed = ref(false)
const logoRef    = ref<HTMLImageElement | null>(null)

onMounted(() => {
  const img = logoRef.value
  if (img?.complete && img.naturalWidth === 0) logoFailed.value = true
})
</script>

<template>
  <footer class="bg-[var(--theme-surface-deep)] relative overflow-hidden">
    <!-- Crack-light top border -->
    <div class="crack-line absolute top-0 left-0 right-0" aria-hidden="true" />

    <div class="max-w-[1200px] mx-auto px-4 py-16 md:px-6 lg:px-12 grid grid-cols-1 gap-10 sm:grid-cols-[1fr_auto_auto] sm:gap-16">
      <div>
        <img
          v-if="!logoFailed"
          ref="logoRef"
          src="https://media.ilytat.com/logo.png"
          alt="ILYTAT"
          width="120" height="28"
          class="h-7 w-auto object-contain mb-5 block opacity-50 hover:opacity-80 transition-opacity duration-300"
          @error="logoFailed = true">
        <span
          v-else
          class="font-display text-[18px] font-extrabold tracking-[-0.02em] mb-5 block text-(--theme-text-hi)">
          ILYTAT
        </span>
        <p class="text-[12px] leading-[1.8] max-w-[200px] text-(--theme-text-faint)">
          Websites for local businesses.<br />Manteno, IL · Kankakee County.
        </p>
        <a
          :href="contact.phoneHref"
          class="mt-3 block text-[12.5px] text-(--theme-text-muted) hover:text-(--theme-text-hi) transition-colors duration-200 no-underline">
          {{ contact.phone }}
        </a>
      </div>
      <div>
        <p class="font-mono text-[9px] tracking-[2.5px] uppercase mb-5 text-(--theme-text-ghost)">Navigate</p>
        <ul class="flex flex-col gap-3.5">
          <li><a href="#services"     class="text-[12.5px] no-underline transition-colors duration-200 text-(--theme-text-muted) hover:text-(--theme-text-hi)">Services</a></li>
          <li><a href="#how-it-works" class="text-[12.5px] no-underline transition-colors duration-200 text-(--theme-text-muted) hover:text-(--theme-text-hi)">How It Works</a></li>
          <li><a href="#pricing"      class="text-[12.5px] no-underline transition-colors duration-200 text-(--theme-text-muted) hover:text-(--theme-text-hi)">Pricing</a></li>
          <li><a href="#portfolio"    class="text-[12.5px] no-underline transition-colors duration-200 text-(--theme-text-muted) hover:text-(--theme-text-hi)">Portfolio</a></li>
          <li>
            <NuxtLink to="/blog" class="text-[12.5px] no-underline transition-colors duration-200 text-(--theme-text-muted) hover:text-(--theme-text-hi)">Blog</NuxtLink>
          </li>
          <li>
            <!-- Sitewide link so the town pages are one click from every page.
                 A page only the sitemap knows about gets crawled late and
                 weighted lightly. -->
            <NuxtLink to="/web-design" class="text-[12.5px] no-underline transition-colors duration-200 text-(--theme-text-muted) hover:text-(--theme-text-hi)">Service Areas</NuxtLink>
          </li>
        </ul>
      </div>
      <div>
        <p class="font-mono text-[9px] tracking-[2.5px] uppercase mb-5 text-(--theme-text-ghost)">Legal</p>
        <ul class="flex flex-col gap-3.5">
          <li>
            <NuxtLink to="/privacy" class="text-[12.5px] no-underline transition-colors duration-200 text-(--theme-text-muted) hover:text-(--theme-text-hi)">Privacy Policy</NuxtLink>
          </li>
          <li>
            <NuxtLink to="/terms" class="text-[12.5px] no-underline transition-colors duration-200 text-(--theme-text-muted) hover:text-(--theme-text-hi)">Terms of Service</NuxtLink>
          </li>
        </ul>
      </div>
    </div>

    <!-- Fortune Orb. Moved down here from the hero, where a rotating yin-yang
         dispensing fortune cookies was the first thing a prospect saw next to
         the pitch. It keeps its personality without fronting the sale. -->
    <div class="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-12 pb-12 flex justify-center">
      <SiteFortuneOrb />
    </div>

    <div class="border-t border-[var(--glass-card-border)] py-5">
      <div class="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-12 flex items-center justify-between flex-wrap gap-2">
        <span class="font-mono text-[11px] uppercase tracking-[0.12em] text-(--theme-text-faint)">© {{ year }} ILYTAT LLC</span>
        <span class="font-mono text-[11px] uppercase tracking-[0.12em] text-(--theme-text-faint)">Built by {{ founder.name }}</span>
      </div>
    </div>
  </footer>
</template>
