<script setup lang="ts">
// ============================================================================
// 01. IMPORTS & COMPOSABLES
// ============================================================================
import { ref, onMounted } from 'vue'
import { useMagicKeys } from '@vueuse/core'
import { siteConfig } from '~/config/site.config'
import { siteContent } from '~/utils/siteContent'

definePageMeta({ layout: false })

const { track } = useAnalytics()
const toast = useToast()
const { Meta_K, Ctrl_K } = useMagicKeys()

// ============================================================================
// 02. FETCH LIVE DATA
// ============================================================================
const { data: projects }     = await useFetch('/api/projects')
const { data: promotion }    = await useFetch('/api/promotion')
const { data: testimonials } = await useFetch('/api/testimonials')

// ============================================================================
// 03. UI STATE
// ============================================================================
const paletteOpen      = ref(false)
const prefilledService = ref('')

// ============================================================================
// 04. SEO
// ============================================================================
const { monthlyRate, priceRange } = siteConfig

useHead({
  title: 'ILYTAT — Professional Websites for Local Business',
  meta: [
    {
      name:    'description',
      content: `Custom websites built for local businesses in Illinois. You own everything. Managed hosting from ${monthlyRate}/mo.`,
    },
    { property: 'og:image', content: 'https://media.ilytat.com/logo.png' },
  ],
  script: [
    {
      type:      'application/ld+json',
      innerHTML: JSON.stringify({
        '@context':   'https://schema.org',
        '@type':      'LocalBusiness',
        name:         'ILYTAT LLC',
        description:  'Custom websites built for local businesses in Illinois',
        url:          'https://ilytat.com',
        address: {
          '@type':         'PostalAddress',
          addressLocality: 'Manteno',
          addressRegion:   'IL',
          addressCountry:  'US',
        },
        areaServed:  { '@type': 'State', name: 'Illinois' },
        priceRange,
        serviceType: 'Web Design',
      }),
    },
  ],
})

// ============================================================================
// 05. METHODS
// ============================================================================
function togglePalette(): void {
  paletteOpen.value = !paletteOpen.value
}

// useMagicKeys handles Cmd/Ctrl+K — SSR-safe and no manual listener cleanup.
watch([Meta_K, Ctrl_K], ([mk, ck]) => { if (mk || ck) togglePalette() })

// ============================================================================
// 06. LIFECYCLE
// ============================================================================
onMounted(() => {
  // When Stripe redirects back after a cancelled checkout, the server appends
  // ?checkout=cancelled to the URL. Detect it, fire an analytics event, show
  // a toast, then clean the URL so a refresh doesn't re-trigger the notice.
  const params = new URLSearchParams(window.location.search)
  if (params.get('checkout') === 'cancelled') {
    track('checkout_abandoned', {
      packageName:  params.get('pkg')   || '',
      billingCycle: params.get('cycle') || '',
    })
    toast.add({
      title:       'Checkout cancelled',
      description: 'No charge was made. Feel free to reach out if you have questions.',
      icon:        'i-heroicons-information-circle',
      color:       'neutral',
    })
    // Preserve the hash (e.g. #pricing) while removing the query string.
    window.history.replaceState({}, '', window.location.pathname + window.location.hash)
  }
})

// Attaches IntersectionObserver to all [data-reveal] elements, including
// those inside child components, since parent onMounted fires last.
useReveal()
</script>

<template>
  <div class="relative min-h-screen bg-[#0d0b09] text-[#f0ece6] font-sans leading-relaxed overflow-x-hidden">
    <div class="grain" aria-hidden="true" />

    <ClientOnly>
      <PromoBanner v-if="promotion" :promotion="promotion" />
    </ClientOnly>

    <SiteNav @toggle-palette="togglePalette" />
    <SiteHero />
    <SitePillarsMarquee />
    <SiteServices @select-service="prefilledService = $event" />
    <SiteProcess />
    <SitePricing />

    <!-- ── Portfolio ──────────────────────────────────────────────────────── -->
    <section id="portfolio" class="max-w-[1080px] mx-auto px-12 py-[100px] md:px-6 md:py-20 sm:px-4 sm:py-16">
      <header class="mb-16" data-reveal>
        <p class="eyebrow">Recent Work</p>
        <h2 class="font-display text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-2px] text-[#f0ece6] leading-[1.05]">
          Built for businesses like yours
        </h2>
      </header>
      <div v-if="projects?.length" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-reveal>
        <a
          v-for="proj in projects"
          :key="proj.id"
          :href="proj.url || undefined"
          :target="proj.url ? '_blank' : undefined"
          :rel="proj.url ? 'noopener noreferrer' : undefined"
          class="glass-deep rounded-sm overflow-hidden flex flex-col no-underline text-inherit transition-[border-color,transform] duration-300"
          :class="proj.url ? 'hover:border-[rgba(245,197,24,0.18)] hover:-translate-y-1' : ''">
          <div class="aspect-video bg-[#0a0a0c] flex items-center justify-center overflow-hidden">
            <img v-if="proj.imageUrl" :src="proj.imageUrl" :alt="proj.title" loading="lazy" class="w-full h-full object-cover">
            <UIcon v-else name="i-heroicons-photo" class="w-8 h-8 opacity-[0.06]" />
          </div>
          <div class="px-5 pt-5 pb-6">
            <span class="font-mono text-[8.5px] tracking-[2px] uppercase text-[#f5c518]/40 block mb-2">{{ proj.industry }}</span>
            <h3 class="font-display text-[15px] font-bold text-[#f0ece6] mb-1.5 tracking-[-0.3px]">{{ proj.title }}</h3>
            <p class="text-[12.5px] text-[#55524f] leading-[1.75]">{{ proj.description }}</p>
          </div>
        </a>
      </div>
      <div v-else class="py-20 px-8 glass-deep rounded-sm text-center" data-reveal>
        <p class="font-display text-[20px] font-bold text-[#f0ece6] mb-3 tracking-[-0.5px]">First projects in progress.</p>
        <p class="text-[14px] text-[#55524f] max-w-[380px] mx-auto mb-8 leading-[1.85]">Ask about being an early client — discounted builds available for businesses in Kankakee County.</p>
        <a href="#contact" class="btn-ghost">Let's talk &rarr;</a>
      </div>
    </section>

    <!-- ── Testimonials ───────────────────────────────────────────────────── -->
    <section
      v-if="testimonials?.length"
      class="max-w-[1080px] mx-auto px-12 pb-[100px] md:px-6 md:pb-20 sm:px-4 sm:pb-16">
      <header class="mb-16" data-reveal>
        <p class="eyebrow">What Clients Say</p>
        <h2 class="font-display text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-2px] text-[#f0ece6] leading-[1.05]">Built on real results</h2>
      </header>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
        <div
          v-for="(t, i) in testimonials"
          :key="t.id"
          class="glass-deep rounded-sm px-7 py-8 flex flex-col gap-5 relative overflow-hidden transition-[border-color,transform] duration-300 hover:border-white/[0.13] hover:-translate-y-1"
          data-reveal
          :data-reveal-delay="i * 100">
          <span class="absolute top-2 right-5 font-serif text-[80px] leading-none text-[#f5c518]/[0.06] select-none pointer-events-none" aria-hidden="true">"</span>
          <p class="text-[14.5px] text-[#c8c4be]/75 leading-[1.9] flex-1 italic relative z-[1]">"{{ t.quote }}"</p>
          <div class="pt-4 border-t border-white/[0.05] relative z-[1]">
            <p class="text-[14px] font-semibold text-[#f0ece6] mb-0.5">{{ t.name }}</p>
            <p class="font-mono text-[9.5px] text-[#333040] tracking-[1px] uppercase">{{ t.businessName }}</p>
          </div>
        </div>
      </div>
    </section>

    <SiteAbout />

    <!-- ── FAQ ───────────────────────────────────────────────────────────── -->
    <section id="faq" class="py-[100px] sm:py-16">
      <div class="max-w-[1080px] mx-auto px-12 md:px-6 sm:px-4">
        <header class="mb-16" data-reveal>
          <p class="eyebrow">Common Questions</p>
          <h2 class="font-display text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-2px] text-[#f0ece6] leading-[1.05]">Straight answers</h2>
        </header>
        <div class="max-w-[680px] flex flex-col gap-1">
          <details
            v-for="(item, i) in siteConfig.faqs"
            :key="item.q"
            class="faq-item"
            data-reveal
            :data-reveal-delay="i * 60">
            <summary class="faq-q">{{ item.q }}</summary>
            <p class="faq-a">{{ item.a }}</p>
          </details>
        </div>
      </div>
    </section>

    <!-- ── CTA Band ───────────────────────────────────────────────────────── -->
    <div class="relative mx-12 my-[100px] overflow-hidden rounded-sm md:mx-6 md:my-16 sm:mx-4 sm:my-12" data-reveal>
      <div class="absolute inset-0 bg-white/[0.025] backdrop-blur-2xl border border-white/[0.07]" />
      <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f5c518]/50 to-transparent" />
      <div
        class="absolute inset-0 pointer-events-none"
        style="background: radial-gradient(ellipse 60% 120% at 50% 0%, rgba(245,197,24,0.04), transparent)"
        aria-hidden="true" />
      <div class="relative z-[1] text-center px-12 py-20 sm:px-6 sm:py-14">
        <p class="eyebrow">Ready to start?</p>
        <h2
          class="font-display text-[clamp(28px,4.2vw,54px)] font-extrabold tracking-[-2.5px] mt-2 mb-5 leading-[1.05] text-[#f0ece6]"
          style="white-space: pre-line">{{ siteContent.cta.headline }}</h2>
        <p class="text-[15px] text-[#55524f] mb-10 max-w-[440px] mx-auto leading-[1.85]">{{ siteContent.cta.subtext }}</p>
        <a
          href="#contact"
          class="btn-primary"
          @click="track('cta_click', { label: siteContent.cta.buttonLabel, location: 'cta_band' })">
          {{ siteContent.cta.buttonLabel }}
        </a>
      </div>
    </div>

    <SiteContact :prefilled-service="prefilledService" />
    <SiteFooter />

    <!-- ── Mobile explore button ─────────────────────────────────────────── -->
    <button
      class="fixed bottom-5 left-1/2 -translate-x-1/2 z-[150] md:hidden flex items-center gap-2 text-[10px] font-semibold text-[#6e6b5f] bg-[#13100d] border border-[#211e1a] px-4 py-2.5 rounded-sm shadow-[0_4px_24px_rgba(0,0,0,.6)] transition-[transform,box-shadow] duration-200 active:scale-95 hover:border-white/[0.12] tracking-[2px] uppercase"
      aria-label="Open navigation"
      @click="togglePalette">
      <UIcon name="i-heroicons-magnifying-glass" class="w-3.5 h-3.5 text-[#4e4843]" />
      <span>Explore</span>
    </button>

    <ClientOnly>
      <Teleport to="body">
        <SiteCommandPalette v-if="paletteOpen" @close="paletteOpen = false" />
      </Teleport>
    </ClientOnly>
  </div>
</template>
