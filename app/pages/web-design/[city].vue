<script setup lang="ts">
/**
 * /web-design/{city} — one page per town served.
 *
 * `areaServed` in the structured data tells Google the towns are covered. It
 * does not give someone searching "web designer bourbonnais" a page to land on,
 * and Google ranks pages. These are those pages.
 *
 * The content differs by angle rather than by adjective — see the note on
 * `siteConfig.locations` for why that distinction is the whole point.
 */
import { siteConfig } from '~/config/site.config'

const route = useRoute()
const location = siteConfig.locations.find(l => l.slug === route.params.city)

if (!location) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}

const ORIGIN = 'https://sites.ilytat.com'
const canonical = `${ORIGIN}/web-design/${location.slug}`

/** Services this page leads with, in the order the config asks for. */
const featured = computed(() =>
  location.emphasis
    .map(slug => siteConfig.services.find(s => s.slug === slug))
    .filter((s): s is NonNullable<typeof s> => Boolean(s)),
)

/** The other towns, for internal links between these pages. */
const otherAreas = siteConfig.locations.filter(l => l.slug !== location.slug)

const { pricing, formatPrice } = usePricing()

useHead({
  title: location.metaTitle,
  meta: [
    { name: 'description', content: location.metaDescription },
    { property: 'og:title', content: location.metaTitle },
    { property: 'og:description', content: location.metaDescription },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: canonical },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: location.metaTitle },
    { name: 'twitter:description', content: location.metaDescription },
  ],
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: `Web Design in ${location.city}, IL`,
        description: location.metaDescription,
        serviceType: 'Web Design',
        areaServed: {
          '@type': 'City',
          name: location.city,
          containedInPlace: { '@type': 'AdministrativeArea', name: `${location.county}, IL` },
        },
        provider: {
          '@type': 'LocalBusiness',
          name: 'ILYTAT LLC',
          url: ORIGIN,
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Manteno',
            addressRegion: 'IL',
            addressCountry: 'US',
          },
          priceRange: siteConfig.priceRange,
          ...(siteConfig.profiles.googleBusiness
            ? { sameAs: [siteConfig.profiles.googleBusiness] }
            : {}),
        },
        url: canonical,
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'Service Areas', item: `${ORIGIN}/web-design` },
          { '@type': 'ListItem', position: 3, name: location.city, item: canonical },
        ],
      }),
    },
  ],
})
</script>

<template>
  <div v-if="location" class="bg-[var(--theme-bg)] text-(--theme-fg) font-sans leading-relaxed overflow-x-hidden">
    <SiteNav />

    <main>
      <section class="max-w-[1200px] mx-auto px-4 pt-14 pb-12 md:px-6 md:pt-20 lg:px-12">
        <nav aria-label="Breadcrumb" class="mb-8">
          <ol class="flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] uppercase text-(--theme-text-muted)">
            <li><NuxtLink to="/" class="no-underline hover:text-(--theme-accent) transition-colors">Home</NuxtLink></li>
            <li aria-hidden="true">/</li>
            <li><NuxtLink to="/web-design" class="no-underline hover:text-(--theme-accent) transition-colors">Service Areas</NuxtLink></li>
            <li aria-hidden="true">/</li>
            <li class="text-(--theme-text-hi)" aria-current="page">{{ location.city }}</li>
          </ol>
        </nav>

        <p class="eyebrow">{{ location.county }}, Illinois</p>
        <h1 class="font-display text-[clamp(34px,5.4vw,60px)] font-extrabold tracking-[-0.035em] leading-[1.05] text-(--theme-fg) max-w-[880px]">
          Web design in {{ location.city }}
        </h1>
        <p class="mt-4 font-display text-[clamp(17px,2.2vw,22px)] text-(--theme-accent) font-semibold">
          {{ location.angle }}
        </p>
        <p class="mt-6 text-[17px] md:text-[18px] leading-[1.7] text-(--theme-text-body) max-w-[640px]">
          {{ location.intro }}
        </p>

        <!-- Only rendered once a real local example exists. An empty
             "here's who I've worked with" is worse than not asking. -->
        <blockquote
          v-if="location.proof"
          class="mt-8 glass-card rounded-[var(--radius)] p-7 max-w-[640px] border-l-[3px] border-l-[var(--theme-accent)]">
          <p class="text-[16px] leading-[1.75] text-(--theme-text-body) italic">{{ location.proof }}</p>
        </blockquote>

        <div class="mt-9 flex flex-wrap items-center gap-4">
          <NuxtLink to="/#contact" class="btn-primary">Talk about your site</NuxtLink>
          <NuxtLink to="/tools/website-audit" class="btn-ghost">Check your current site free</NuxtLink>
        </div>

        <p class="mt-6 text-[14px] text-(--theme-text-muted)">
          Builds from {{ formatPrice(pricing.popUp) }}. Managed hosting {{ formatPrice(pricing.standardHosting) }}/month, first month free.
          You own the code either way.
        </p>
      </section>

      <!-- ── What tends to matter here ──────────────────────────────────── -->
      <section class="max-w-[1200px] mx-auto px-4 pb-16 md:px-6 lg:px-12">
        <h2 class="font-display text-[clamp(24px,3.2vw,36px)] font-extrabold tracking-[-0.03em] text-(--theme-fg) mb-8">
          What {{ location.city }} businesses usually need first
        </h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <NuxtLink
            v-for="(svc, i) in featured"
            :key="svc.slug"
            :to="`/services/${svc.slug}`"
            class="glass-card rounded-[var(--radius)] p-7 flex flex-col gap-3 no-underline transition-[border-color,box-shadow] duration-300 hover:border-[var(--glass-card-border)] hover:shadow-[var(--card-shadow)]"
            data-reveal
            :data-reveal-delay="i * 100">
            <span class="font-mono text-[10px] tracking-[0.12em] uppercase text-(--theme-accent)">{{ svc.tag }}</span>
            <h3 class="font-display text-[18px] font-bold tracking-[-0.01em] text-(--theme-fg)">{{ svc.title }}</h3>
            <p class="text-[14.5px] leading-[1.7] text-(--theme-text-body)">{{ svc.intro }}</p>
            <span class="font-mono text-[10px] tracking-[1.2px] uppercase text-(--theme-accent) mt-auto">See what's included →</span>
          </NuxtLink>
        </div>
      </section>

      <!-- ── Other areas: internal linking between the location pages ───── -->
      <section class="max-w-[1200px] mx-auto px-4 pb-20 md:px-6 lg:px-12">
        <div class="glass-deep rounded-[var(--radius)] px-6 py-9 md:px-10">
          <h2 class="font-display text-[20px] font-bold tracking-[-0.02em] text-(--theme-fg)">
            Also serving
          </h2>
          <p class="mt-2 text-[15px] text-(--theme-text-body)">
            Based in Manteno, working across {{ siteConfig.locations.length }} towns in Kankakee and Will County.
          </p>
          <div class="mt-5 flex flex-wrap gap-3">
            <NuxtLink
              v-for="area in otherAreas"
              :key="area.slug"
              :to="`/web-design/${area.slug}`"
              class="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--glass-card-border)] text-[14px] text-(--theme-text-hi) no-underline hover:border-[color-mix(in_srgb,var(--theme-accent)_45%,transparent)] hover:text-(--theme-accent) transition-colors">
              {{ area.city }}
            </NuxtLink>
          </div>
        </div>
      </section>
    </main>

    <SiteFooter />
  </div>
</template>
