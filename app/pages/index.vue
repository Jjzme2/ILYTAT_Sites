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

  // Fallback banner shown only when the API has no live promotion. Kept short so
  // it stays on one or two lines at 375px instead of wrapping into a tall block.
  const foundingFivePromo = {
    id: "founding-five-2025",
    message: "Founding client rate — first 5 Kankakee County businesses.",
    ctaText: "See pricing",
    ctaUrl: "#pricing",
  };

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
          // Town centroid, not a street address — this is a service-area
          // business without a storefront, and claiming a precise building
          // would be a fabrication Google can check against the Business
          // Profile.
          geo: { "@type": "GeoCoordinates", latitude: 41.2503, longitude: -87.8384 },
          image: "https://media.ilytat.com/logo-144.webp",
          logo: "https://media.ilytat.com/logo-144.webp",
          // Links this site to the same business elsewhere — above all the
          // Google Business Profile, which is where the reviews and local
          // prominence live. Omitted entirely while empty: an empty sameAs is
          // worse than none, since it asserts the business exists nowhere else.
          ...(Object.values(siteConfig.profiles).filter(Boolean).length
            ? { sameAs: Object.values(siteConfig.profiles).filter(Boolean) }
            : {}),
        }),
      },
      {
        // The homepage has carried an FAQ section since it was built and never
        // marked it up. FAQ rich results occupy several extra lines of a search
        // listing, which for a local query is the difference between one line
        // and owning the top of the fold — and the answers already exist, so
        // this costs nothing but the markup.
        type: "application/ld+json",
        innerHTML: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: siteConfig.faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
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
    id="top"
    class="relative min-h-screen bg-[var(--theme-bg)] text-(--theme-fg) font-sans leading-relaxed overflow-x-hidden"
  >

    <!-- Exactly one banner ever renders. A live promotion from the API wins;
         the Founding Five copy is the fallback. Rendering both stacked two
         full-bleed yellow bars above the nav, which is what broke on mobile.
         The banner sits in normal flow and scrolls away; the nav below it is
         `position: sticky`, so the two can never overlap. -->
    <PromoBanner :promotion="promotion ?? foundingFivePromo" />

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
        class="max-w-[1200px] mx-auto px-4 py-16 md:px-6 md:py-20 lg:px-12 lg:py-[100px]"
        style="content-visibility: auto; contain-intrinsic-block-size: auto 600px"
      >
        <header
          class="mb-16"
          data-reveal
        >
          <p class="eyebrow">Recent Work</p>
          <h2
            class="font-display text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-2px] text-(--theme-fg) leading-[1.05]"
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
            class="glass-deep rounded-[var(--radius)] flex flex-col no-underline text-inherit transition-[border-color,box-shadow] duration-300 group"
            :class="
              proj.url
                ? 'hover:border-[color-mix(in_srgb,var(--theme-accent)_30%,transparent)] hover:shadow-[var(--card-shadow)]'
                : ''
            "
            :href="proj.url ? normalizeUrl(proj.url) : undefined"
            :target="proj.url ? '_blank' : undefined"
            :rel="proj.url ? 'noopener noreferrer' : undefined"
          >
            <div
              class="aspect-video bg-[var(--theme-surface-deep)] flex items-center justify-center overflow-hidden relative shrink-0"
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
              <h3 class="font-display text-[15px] font-bold text-(--theme-fg) tracking-[-0.3px]">
                {{ proj.title }}
              </h3>
              <p class="text-[12.5px] text-(--theme-text-body) leading-[1.78]">{{ proj.description }}</p>
            </div>
          </LumenSurface>
        </div>
        <!-- Empty state. Previously this read "First projects in progress." —
             so a prospect comparing vendors side by side saw an empty
             portfolio. It now shows what actually ships in a build, which is
             the argument that has to land when there is no gallery yet. -->
        <div
          v-else
          data-reveal
        >
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div
              v-for="deliverable in siteConfig.deliverables"
              :key="deliverable.title"
              class="glass-deep rounded-[var(--radius)] p-8 flex flex-col gap-3"
            >
              <UIcon
                :name="deliverable.icon"
                class="w-6 h-6 text-(--theme-accent)"
              />
              <h3 class="font-display text-[17px] font-bold text-(--theme-fg) tracking-[-0.01em]">
                {{ deliverable.title }}
              </h3>
              <p class="text-[14px] text-(--theme-text-body) leading-[1.7]">
                {{ deliverable.body }}
              </p>
            </div>
          </div>

          <div class="mt-10 flex flex-col sm:flex-row sm:items-center gap-5 justify-center text-center">
            <p class="text-[15px] text-(--theme-text-body)">
              Founding-client pricing is open for the first five Kankakee County businesses.
            </p>
            <a
              href="#contact"
              class="btn-ghost shrink-0"
              @click="track('cta_click', { label: 'Portfolio empty state', location: 'portfolio' })"
              >Start a project &rarr;</a
            >
          </div>
        </div>
      </section>

      <!-- ── Testimonials — hidden when empty, shown when there are entries ── -->
      <LazySiteTestimonials
        v-if="testimonials?.length"
        :testimonials="testimonials as any"
      />

      <LazySiteAbout />

      <!-- ── Service areas ───────────────────────────────────────────────────
           The town pages were reachable only from the footer. Google weights
           links in main content well above footer links, and a visitor asking
           "does he even cover my town?" should not have to scroll to the very
           bottom to find out. -->
      <section
        id="areas"
        class="max-w-[1200px] mx-auto px-4 pb-16 md:px-6 md:pb-20 lg:px-12 lg:pb-[100px]">
        <header class="mb-10" data-reveal>
          <p class="eyebrow">Where I Work</p>
          <h2 class="font-display text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-2px] text-(--theme-fg) leading-[1.05]">
            Serving Kankakee County<br class="hidden md:block"> and the towns around it
          </h2>
          <p class="mt-5 text-[16px] leading-[1.7] text-(--theme-text-body) max-w-[560px]">
            Based in Manteno — close enough to meet at your counter, priced for a local
            business rather than a marketing budget.
          </p>
        </header>
        <div class="flex flex-wrap gap-3" data-reveal>
          <NuxtLink
            v-for="area in siteConfig.locations"
            :key="area.slug"
            :to="`/web-design/${area.slug}`"
            class="px-5 py-3 rounded-[var(--radius-sm)] border border-[var(--glass-card-border)] no-underline transition-colors hover:border-[color-mix(in_srgb,var(--theme-accent)_45%,transparent)] group">
            <span class="block text-[15px] font-semibold text-(--theme-fg) group-hover:text-(--theme-accent) transition-colors">{{ area.city }}</span>
            <span class="block font-mono text-[9px] tracking-[1.4px] uppercase text-(--theme-text-ghost) mt-0.5">{{ area.county }}</span>
          </NuxtLink>
        </div>
      </section>

      <!-- Sits after About and before the FAQ: the founder section establishes
           who is doing the work, the posts are the evidence, and the FAQ then
           answers whatever is left. Renders nothing when no post is published. -->
      <LazySiteBlogPreview />

      <!-- ── FAQ ───────────────────────────────────────────────────────────── -->
      <section
        id="faq"
        class="py-16 lg:py-[100px]"
        style="content-visibility: auto; contain-intrinsic-block-size: auto 600px"
      >
        <div class="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-12">
          <header
            class="mb-16"
            data-reveal
          >
            <p class="eyebrow">Common Questions</p>
            <h2
              class="font-display text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-2px] text-(--theme-fg) leading-[1.05]"
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
        class="relative mx-4 my-12 overflow-hidden rounded-[var(--radius)] md:mx-6 md:my-16 lg:mx-12 lg:my-[100px]"
        data-reveal
      >
        <div class="absolute inset-0 bg-[var(--glass-card-bg)] backdrop-blur-2xl border border-[var(--glass-card-border)]" />
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
        <div class="relative z-1 text-center px-6 py-16 lg:px-12 lg:py-24">
          <p class="eyebrow justify-center">Ready to start?</p>
          <h2
            class="font-display text-[clamp(28px,4.2vw,56px)] font-extrabold tracking-[-2.5px] mt-2 mb-5 leading-[1.04] text-(--theme-fg)"
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
