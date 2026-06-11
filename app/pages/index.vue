<script setup lang="ts">
  // ============================================================================
  // 01. IMPORTS & COMPOSABLES
  // ============================================================================
  import { ref } from "vue";
  import { siteConfig } from "~/config/site.config";
  import { siteContent } from "~/utils/siteContent";

  definePageMeta({ layout: false });

  const { track } = useAnalytics();

  // ============================================================================
  // 02. FETCH LIVE DATA
  // ============================================================================
  // promotion is above-fold (PromoBanner) — await so it SSR's in the initial HTML
  const { data: promotion } = await useFetch("/api/promotion");
  // projects and testimonials are below-fold — lazy so they don't block SSR TTFB
  const { data: projects } = useFetch("/api/projects", { lazy: true });
  const { data: testimonials } = useFetch("/api/testimonials", { lazy: true });

  // ============================================================================
  // 03. UI STATE
  // ============================================================================
  const prefilledService = ref("");

  function normalizeUrl(url: string): string {
    if (!url) return "";
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  }

  // ============================================================================
  // 04. SEO
  // ============================================================================
  const { monthlyRate, priceRange } = siteConfig;

  useHead({
    title: "ILYTAT — Web Design Kankakee County IL · Manteno, Bourbonnais, Bradley, Kankakee",
    meta: [
      {
        name: "description",
        content: `Custom websites for local businesses in Kankakee County, IL — Manteno, Bourbonnais, Bradley, Kankakee, Peotone. You own everything. Managed hosting from ${monthlyRate}/mo.`,
      },
      { property: "og:title", content: "ILYTAT — Web Design for Kankakee County Local Businesses" },
      {
        property: "og:description",
        content: `Professional websites for local businesses in Manteno, Bourbonnais, Bradley, Kankakee & Peotone. Custom-built, fast, and fully managed.`,
      },
      { property: "og:image", content: "https://media.ilytat.com/og-preview.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://sites.ilytat.com" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "ILYTAT — Web Design for Kankakee County Local Businesses",
      },
      {
        name: "twitter:description",
        content:
          "Professional websites for local businesses in Kankakee County, IL. Custom-built, fast, and fully managed.",
      },
      { name: "twitter:image", content: "https://media.ilytat.com/og-preview.png" },
    ],
    script: [
      {
        type: "application/ld+json",
        innerHTML: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "ILYTAT LLC",
          description: "Custom websites built for local businesses in Illinois",
          url: "https://sites.ilytat.com",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Manteno",
            addressRegion: "IL",
            addressCountry: "US",
          },
          telephone: siteContent.contact.phone,
          areaServed: [
            { "@type": "City", name: "Manteno", containedIn: "Kankakee County, IL" },
            { "@type": "City", name: "Bourbonnais", containedIn: "Kankakee County, IL" },
            { "@type": "City", name: "Bradley", containedIn: "Kankakee County, IL" },
            { "@type": "City", name: "Kankakee", containedIn: "Kankakee County, IL" },
            { "@type": "City", name: "Peotone", containedIn: "Will County, IL" },
          ],
          priceRange,
          serviceType: "Web Design",
        }),
      },
    ],
  });

  // Attaches IntersectionObserver to all [data-reveal] elements, including
  // those inside child components, since parent onMounted fires last.
  useReveal();
</script>

<template>
  <div
    class="relative min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] font-sans leading-relaxed overflow-x-hidden"
  >
    <div
      class="grain"
      aria-hidden="true"
    />

    <!-- Founding Five — hardcoded, dismissible via localStorage.
         Rendered in SSR so it's in initial HTML — avoids CLS from client-only insertion.
         PromoBanner starts visible:true and hides in onMounted if localStorage says dismissed. -->
    <PromoBanner
      :promotion="{
        id: 'founding-five-2025',
        message: 'Founding client rate available for the first 5 Kankakee County businesses.',
        ctaText: 'See pricing →',
        ctaUrl: '#pricing',
      }"
    />

    <PromoBanner
      v-if="promotion"
      :promotion="promotion"
    />

    <!-- Above fold: eager-loaded, on the critical render path -->
    <SiteNav />
    <main>
      <SiteHero />
      <SitePillarsMarquee />

      <!-- Below fold: Lazy prefix splits these into separate JS chunks.
         SSR still renders full HTML — only the client hydration JS is deferred,
         reducing initial bundle parse time without any visible pop-in. -->
      <LazySitePerformanceStrip />
      <LazySiteServices @select-service="prefilledService = $event" />
      <LazySiteProcess />
      <LazySitePricing />
      <LazyQuoteEstimator />

      <!-- ── Portfolio ──────────────────────────────────────────────────────── -->
      <section
        id="portfolio"
        class="max-w-[1080px] mx-auto px-12 py-[100px] md:px-6 md:py-20 sm:px-4 sm:py-16"
        style="content-visibility: auto; contain-intrinsic-block-size: auto 600px"
      >
        <header
          class="mb-16"
          data-reveal
        >
          <p class="eyebrow">Recent Work</p>
          <h2
            class="font-display text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-2px] text-(--theme-text) leading-[1.05]"
          >
            Built for businesses like yours
          </h2>
        </header>
        <div
          v-if="projects?.length"
          class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-reveal
        >
          <LumenSurface
            v-for="proj in projects"
            :key="proj.id"
            as="a"
            palette="azure-sand"
            class="glass-deep rounded-sm flex flex-col no-underline text-inherit transition-[border-color,box-shadow] duration-300 group"
            :class="
              proj.url
                ? 'hover:border-[rgba(245,197,24,0.22)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.4)]'
                : ''
            "
            :href="proj.url ? normalizeUrl(proj.url) : undefined"
            :target="proj.url ? '_blank' : undefined"
            :rel="proj.url ? 'noopener noreferrer' : undefined"
          >
            <div
              class="aspect-video bg-[#080810] flex items-center justify-center overflow-hidden relative shrink-0"
            >
              <img
                v-if="proj.imageUrl"
                :src="proj.imageUrl"
                :alt="proj.title"
                loading="lazy"
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <UIcon
                v-else
                name="i-heroicons-photo"
                class="w-8 h-8 opacity-[0.05]"
              />
              <div
                v-if="proj.imageUrl"
                class="absolute inset-0 bg-linear-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
            </div>
            <div class="px-6 pt-5 pb-6 flex flex-col gap-1.5">
              <span
                class="font-mono text-[8px] tracking-[2.5px] uppercase block"
                style="color: color-mix(in srgb, var(--theme-accent) 38%, transparent)"
                >{{ proj.industry }}</span
              >
              <h3 class="font-display text-[15px] font-bold text-[#f0ece6] tracking-[-0.3px]">
                {{ proj.title }}
              </h3>
              <p class="text-[12.5px] text-[#8a8278] leading-[1.78]">{{ proj.description }}</p>
            </div>
          </LumenSurface>
        </div>
        <div
          v-else
          class="py-20 px-8 glass-deep rounded-sm text-center"
          data-reveal
        >
          <p class="font-display text-[20px] font-bold text-[#f0ece6] mb-3 tracking-[-0.5px]">
            First projects in progress.
          </p>
          <p class="text-[14px] text-[#8a8278] max-w-[380px] mx-auto mb-8 leading-[1.85]">
            Ask about being an early client — discounted builds available for businesses in Kankakee
            County.
          </p>
          <a
            href="#contact"
            class="btn-ghost"
            >Let's talk &rarr;</a
          >
        </div>
      </section>

      <!-- ── Testimonials — hidden when empty, shown when there are entries ── -->
      <LazySiteTestimonials
        v-if="testimonials?.length"
        :testimonials="testimonials as any"
      />

      <LazySiteAbout />

      <!-- ── FAQ ───────────────────────────────────────────────────────────── -->
      <section
        id="faq"
        class="py-[100px] sm:py-16"
        style="content-visibility: auto; contain-intrinsic-block-size: auto 600px"
      >
        <div class="max-w-[1080px] mx-auto px-12 md:px-6 sm:px-4">
          <header
            class="mb-16"
            data-reveal
          >
            <p class="eyebrow">Common Questions</p>
            <h2
              class="font-display text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-2px] text-(--theme-text) leading-[1.05]"
            >
              Straight answers
            </h2>
          </header>
          <div class="max-w-[680px] flex flex-col gap-1">
            <details
              v-for="(item, i) in siteConfig.faqs"
              :key="item.q"
              class="faq-item"
              data-reveal
              :data-reveal-delay="i * 60"
            >
              <summary class="faq-q">{{ item.q }}</summary>
              <p class="faq-a">{{ item.a }}</p>
            </details>
          </div>
        </div>
      </section>

      <!-- ── CTA Band ───────────────────────────────────────────────────────── -->
      <div
        class="relative mx-12 my-[100px] overflow-hidden rounded-sm md:mx-6 md:my-16 sm:mx-4 sm:my-12"
        data-reveal
      >
        <div class="absolute inset-0 bg-white/[0.022] backdrop-blur-2xl border border-white/8" />
        <div
          class="absolute top-0 left-0 right-0 h-px"
          style="
            background: linear-gradient(to right, transparent, var(--theme-accent), transparent);
            opacity: 0.6;
          "
        />
        <div
          class="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/4 to-transparent"
        />
        <div
          class="absolute inset-0 pointer-events-none"
          style="
            background: radial-gradient(
              ellipse 55% 110% at 50% -10%,
              color-mix(in srgb, var(--theme-accent) 5.5%, transparent),
              transparent
            );
          "
          aria-hidden="true"
        />
        <div class="relative z-1 text-center px-12 py-24 sm:px-6 sm:py-16">
          <p class="eyebrow justify-center">Ready to start?</p>
          <h2
            class="font-display text-[clamp(28px,4.2vw,56px)] font-extrabold tracking-[-2.5px] mt-2 mb-5 leading-[1.04] text-(--theme-text)"
            style="white-space: pre-line"
          >
            {{ siteContent.cta.headline }}
          </h2>
          <p
            class="text-[15px] mb-10 max-w-[440px] mx-auto leading-[1.88]"
            style="color: var(--theme-text-body)"
          >
            {{ siteContent.cta.subtext }}
          </p>
          <a
            href="#contact"
            class="btn-primary"
            @click="
              track('cta_click', { label: siteContent.cta.buttonLabel, location: 'cta_band' })
            "
          >
            {{ siteContent.cta.buttonLabel }}
          </a>
        </div>
      </div>

      <LazySiteContact :prefilled-service="prefilledService" />
      <LazySiteFooter />
    </main>
  </div>
</template>
