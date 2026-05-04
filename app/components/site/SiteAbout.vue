<script setup lang="ts">
/**
 * SiteAbout — founder story, philosophy, stats, and phone CTA.
 *
 * Phone href is assembled client-side from char codes to avoid
 * exposing the number as plain text to scrapers in the HTML source.
 * Founder photo is verified with a HEAD request before rendering —
 * if the file is absent, the founder's initial is shown instead.
 */
import { ref, computed, onMounted } from 'vue'
import { siteContent } from '~/utils/siteContent'
import { siteConfig } from '~/config/site.config'

const { founder } = siteContent
const { aboutStats } = siteConfig

// Char codes for the phone number — assembled only in the browser.
const PHONE_CHARS = [55, 48, 56, 54, 50, 55, 49, 56, 53, 52]
const phoneHref   = computed(() => `tel:+1${String.fromCharCode(...PHONE_CHARS)}`)

const FOUNDER_PHOTO_PATH = '/founder.jpg'
const founderPhotoExists = ref(false)
const founderPhotoSrc    = ref('')

onMounted(async () => {
  try {
    const res = await fetch(FOUNDER_PHOTO_PATH, { method: 'HEAD' })
    if (res.ok) {
      founderPhotoSrc.value    = FOUNDER_PHOTO_PATH
      founderPhotoExists.value = true
    }
  } catch {
    founderPhotoExists.value = false
  }
})
</script>

<template>
  <section id="about" class="bg-[var(--theme-surface)] section-layer">
    <div class="max-w-[1080px] mx-auto px-12 py-[100px] md:px-6 md:py-20 sm:px-4 sm:py-16">
      <div class="grid grid-cols-1 gap-16 items-start lg:grid-cols-[1fr_1fr] lg:gap-28" data-reveal>

        <!-- Left: pull quote + founder identity (sticky on desktop) -->
        <div class="lg:sticky lg:top-32">
          <div class="flex items-center gap-4 mb-8">
            <div class="crack-line w-8 flex-shrink-0" />
            <p class="eyebrow mb-0">The Philosophy</p>
          </div>
          <blockquote class="font-display text-[clamp(20px,2.8vw,32px)] font-bold tracking-[-1px] text-[var(--theme-text)] leading-[1.3] pl-6 mb-10 relative">
            <!-- Crack-light left edge — replaces the plain border-l -->
            <div class="crack-line-v absolute left-0 top-0 bottom-0 h-full" aria-hidden="true" />
            {{ founder.philosophy }}
          </blockquote>
          <div class="flex items-center gap-4">
            <div class="w-[56px] h-[56px] overflow-hidden flex-shrink-0 bg-[var(--glass-deep-bg)] flex items-center justify-center border border-[var(--glass-card-border)]"
               style="clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))">
              <img v-if="founderPhotoExists" :src="founderPhotoSrc" :alt="founder.name" class="w-full h-full object-cover">
              <em v-else class="font-serif italic font-light text-[var(--theme-accent)] text-2xl select-none">{{ founder.name.charAt(0) }}</em>
            </div>
            <div>
              <p class="font-semibold text-[var(--theme-text-hi)] text-[14px]">{{ founder.name }}</p>
              <p class="font-mono text-[9px] text-[var(--theme-text-ghost)] uppercase tracking-[1.5px] mt-0.5">{{ founder.title }}</p>
            </div>
          </div>
        </div>

        <!-- Right: full story, deal list, stats, phone CTA -->
        <div>
          <h2 class="font-display text-[clamp(20px,2.5vw,28px)] font-extrabold tracking-[-1px] text-[var(--theme-text)] mb-7 leading-[1.2]">
            Built by someone who lives here too.
          </h2>
          <div class="flex flex-col gap-4 mb-8">
            <p class="text-[14.5px] text-[var(--theme-text-body)] leading-[1.9]">{{ founder.intro }}</p>
            <p class="text-[14.5px] text-[var(--theme-text-body)] leading-[1.9]">{{ founder.origin }}</p>
            <p class="text-[14.5px] text-[var(--theme-text-body)] leading-[1.9]">{{ founder.problem }}</p>
          </div>
          <p class="font-mono text-[9px] uppercase tracking-[2px] text-[var(--theme-text-ghost)] mb-5">Here's the deal</p>
          <ul class="flex flex-col gap-4 mb-10">
            <li
              v-for="(item, idx) in founder.deal"
              :key="item.label"
              class="flex gap-4 text-[14px] text-[var(--theme-text-body)] leading-[1.85]">
              <span class="font-mono font-bold flex-shrink-0 mt-px text-[10px] text-[var(--theme-accent)] opacity-40">{{ String(idx + 1).padStart(2, '0') }}</span>
              <span><strong class="text-[var(--theme-text-hi)] font-semibold">{{ item.label }}:</strong> {{ item.body }}</span>
            </li>
          </ul>
          <p class="text-[14px] font-medium text-[var(--theme-text)]/50 border-t border-[var(--glass-card-border)] pt-7 mb-8 leading-[1.85]">{{ founder.closing }}</p>
          <div class="grid grid-cols-3 gap-6 mb-10 pb-8">
            <div v-for="stat in aboutStats" :key="stat.label" class="flex flex-col gap-2">
              <p class="font-headline italic font-light text-[32px] text-[var(--theme-accent)] leading-none">{{ stat.value }}</p>
              <p class="font-mono text-[9px] uppercase tracking-[1.5px] text-[var(--theme-text-ghost)]">{{ stat.label }}</p>
              <div class="crack-line w-10" />
            </div>
          </div>
          <ClientOnly>
            <a :href="phoneHref" class="btn-primary">
              <UIcon name="i-heroicons-phone" class="w-3.5 h-3.5 flex-shrink-0" /> Call or Text
            </a>
          </ClientOnly>
        </div>

      </div>
    </div>
  </section>
</template>
