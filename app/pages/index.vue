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
  <div class="relative min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] font-sans leading-relaxed overflow-x-hidden">
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
        <h2 class="font-display text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-2px] text-[var(--theme-text)] leading-[1.05]">
          Built for businesses like yours
        </h2>
      </header>
      <div v-if="projects?.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-reveal>
        <LumenSurface
          v-for="proj in projects"
          :key="proj.id"
          as="a"
          palette="azure-sand"
          class="glass-deep rounded-sm flex flex-col no-underline text-inherit transition-[border-color,transform,box-shadow] duration-300 group"
          :class="proj.url ? 'hover:border-[rgba(245,197,24,0.22)] hover:-translate-y-1.5 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]' : ''"
          :href="proj.url || undefined"
          :target="proj.url ? '_blank' : undefined"
          :rel="proj.url ? 'noopener noreferrer' : undefined">
          <div class="aspect-video bg-[#080810] flex items-center justify-center overflow-hidden relative flex-shrink-0">
            <img v-if="proj.imageUrl" :src="proj.imageUrl" :alt="proj.title" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]">
            <UIcon v-else name="i-heroicons-photo" class="w-8 h-8 opacity-[0.05]" />
            <div v-if="proj.imageUrl" class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
          <div class="px-6 pt-5 pb-6 flex flex-col gap-1.5">
            <span class="font-mono text-[8px] tracking-[2.5px] uppercase block" style="color: color-mix(in srgb, var(--theme-accent) 38%, transparent)">{{ proj.industry }}</span>
            <h3 class="font-display text-[15px] font-bold text-[#f0ece6] tracking-[-0.3px]">{{ proj.title }}</h3>
            <p class="text-[12.5px] text-[#6a6761] leading-[1.78]">{{ proj.description }}</p>
          </div>
        </LumenSurface>
      </div>
      <div v-else class="py-20 px-8 glass-deep rounded-sm text-center" data-reveal>
        <p class="font-display text-[20px] font-bold text-[#f0ece6] mb-3 tracking-[-0.5px]">First projects in progress.</p>
        <p class="text-[14px] text-[#6a6761] max-w-[380px] mx-auto mb-8 leading-[1.85]">Ask about being an early client — discounted builds available for businesses in Kankakee County.</p>
        <a href="#contact" class="btn-ghost">Let's talk &rarr;</a>
      </div>
    </section>

    <!-- ── Testimonials ───────────────────────────────────────────────────── -->
    <section
      v-if="testimonials?.length"
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
          <!-- Large decorative quote — absolute relative to slot wrapper -->
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

    <SiteAbout />

    <!-- ── FAQ ───────────────────────────────────────────────────────────── -->
    <section id="faq" class="py-[100px] sm:py-16">
      <div class="max-w-[1080px] mx-auto px-12 md:px-6 sm:px-4">
        <header class="mb-16" data-reveal>
          <p class="eyebrow">Common Questions</p>
          <h2 class="font-display text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-2px] text-[var(--theme-text)] leading-[1.05]">Straight answers</h2>
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
      <div class="absolute inset-0 bg-white/[0.022] backdrop-blur-2xl border border-white/[0.08]" />
      <div class="absolute top-0 left-0 right-0 h-px" style="background: linear-gradient(to right, transparent, var(--theme-accent), transparent); opacity: 0.6" />
      <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
      <div
        class="absolute inset-0 pointer-events-none"
        style="background: radial-gradient(ellipse 55% 110% at 50% -10%, color-mix(in srgb, var(--theme-accent) 5.5%, transparent), transparent)"
        aria-hidden="true" />
      <div class="relative z-[1] text-center px-12 py-24 sm:px-6 sm:py-16">
        <p class="eyebrow justify-center">Ready to start?</p>
        <h2
          class="font-display text-[clamp(28px,4.2vw,56px)] font-extrabold tracking-[-2.5px] mt-2 mb-5 leading-[1.04] text-[var(--theme-text)]"
          style="white-space: pre-line">{{ siteContent.cta.headline }}</h2>
        <p class="text-[15px] mb-10 max-w-[440px] mx-auto leading-[1.88]" style="color: var(--theme-text-body)">{{ siteContent.cta.subtext }}</p>
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
