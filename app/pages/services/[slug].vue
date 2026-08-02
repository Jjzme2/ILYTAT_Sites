<script setup lang="ts">
import { siteConfig } from '~/config/site.config'
import { siteContent } from '~/utils/siteContent'

const route = useRoute()
const { services, steps, monthlyRate, priceRange } = siteConfig

const service = services.find(s => s.slug === route.params.slug)

// A bad slug must 404 rather than render an empty shell — otherwise every
// typo becomes a thin indexable page competing with the real ones.
if (!service) {
  throw createError({ statusCode: 404, statusMessage: 'Service not found' })
}

const otherServices = services.filter(s => s.slug !== service.slug)

const canonical = `https://sites.ilytat.com/services/${service.slug}`
const areas = ['Manteno', 'Bourbonnais', 'Bradley', 'Kankakee', 'Peotone']

useHead({
  title: service.metaTitle,
  meta: [
    { name: 'description', content: service.metaDescription },
    { property: 'og:title', content: service.metaTitle },
    { property: 'og:description', content: service.metaDescription },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: canonical },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: service.metaTitle },
    { name: 'twitter:description', content: service.metaDescription },
  ],
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: service.title,
        description: service.metaDescription,
        serviceType: service.tag,
        url: canonical,
        provider: {
          '@type': 'LocalBusiness',
          name: 'ILYTAT LLC',
          telephone: siteContent.contact.phone,
          priceRange,
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Manteno',
            addressRegion: 'IL',
            addressCountry: 'US',
          },
        },
        areaServed: areas.map(name => ({ '@type': 'City', name })),
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sites.ilytat.com/' },
          { '@type': 'ListItem', position: 2, name: 'Services', item: 'https://sites.ilytat.com/services' },
          { '@type': 'ListItem', position: 3, name: service.title, item: canonical },
        ],
      }),
    },
  ],
})

useReveal()
</script>

<template>
  <div class="bg-[var(--theme-bg)] text-(--theme-fg) font-sans leading-relaxed overflow-x-hidden">
    <SiteNav />

    <main>
      <!-- ── Hero ──────────────────────────────────────────────────────────── -->
      <section class="max-w-[1200px] mx-auto px-4 pt-14 pb-16 md:px-6 md:pt-20 md:pb-20 lg:px-12">
        <nav aria-label="Breadcrumb" class="mb-8">
          <ol class="flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] uppercase text-(--theme-text-muted)">
            <li><NuxtLink to="/" class="no-underline hover:text-(--theme-accent) transition-colors">Home</NuxtLink></li>
            <li aria-hidden="true">/</li>
            <li><NuxtLink to="/services" class="no-underline hover:text-(--theme-accent) transition-colors">Services</NuxtLink></li>
            <li aria-hidden="true">/</li>
            <li class="text-(--theme-text-hi)" aria-current="page">{{ service.title }}</li>
          </ol>
        </nav>

        <p class="eyebrow">{{ service.tag }}</p>
        <h1 class="font-display text-[clamp(34px,5.4vw,60px)] font-extrabold tracking-[-0.035em] leading-[1.05] text-(--theme-fg) max-w-[880px]">
          {{ service.headline }}
        </h1>
        <p class="mt-6 text-[17px] md:text-[18px] leading-[1.7] text-(--theme-text-body) max-w-[620px]">
          {{ service.intro }}
        </p>

        <div class="mt-10 flex flex-wrap items-center gap-4">
          <NuxtLink to="/#contact" class="btn-primary">Get a Free Audit</NuxtLink>
          <NuxtLink to="/#pricing" class="btn-ghost">See Pricing</NuxtLink>
        </div>
      </section>

      <!-- ── Problem / Solution ────────────────────────────────────────────── -->
      <section class="max-w-[1200px] mx-auto px-4 pb-16 md:px-6 md:pb-20 lg:px-12">
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div class="glass-deep rounded-[var(--radius)] p-8 md:p-10" data-reveal>
            <h2 class="font-display text-[22px] md:text-[26px] font-bold tracking-[-0.02em] text-(--theme-fg) mb-6">
              {{ service.problem.title }}
            </h2>
            <ul class="flex flex-col gap-4">
              <li
                v-for="point in service.problem.points"
                :key="point"
                class="flex gap-3 text-[15px] leading-[1.7] text-(--theme-text-body)">
                <UIcon name="i-heroicons-x-mark" class="w-5 h-5 shrink-0 mt-0.5 text-(--theme-text-muted)" />
                <span>{{ point }}</span>
              </li>
            </ul>
          </div>

          <div class="glass-deep rounded-[var(--radius)] p-8 md:p-10" data-reveal data-reveal-delay="80">
            <h2 class="font-display text-[22px] md:text-[26px] font-bold tracking-[-0.02em] text-(--theme-fg) mb-6">
              {{ service.solution.title }}
            </h2>
            <ul class="flex flex-col gap-4">
              <li
                v-for="point in service.solution.points"
                :key="point"
                class="flex gap-3 text-[15px] leading-[1.7] text-(--theme-text-body)">
                <UIcon name="i-heroicons-check" class="w-5 h-5 shrink-0 mt-0.5 text-(--theme-accent)" />
                <span>{{ point }}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- ── What's included ───────────────────────────────────────────────── -->
      <section class="max-w-[1200px] mx-auto px-4 pb-16 md:px-6 md:pb-20 lg:px-12">
        <header class="mb-10" data-reveal>
          <p class="eyebrow">What's Included</p>
          <h2 class="font-display text-[clamp(26px,3.4vw,40px)] font-extrabold tracking-[-0.03em] text-(--theme-fg) leading-[1.1]">
            Every build ships with this
          </h2>
        </header>
        <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-reveal>
          <li
            v-for="item in service.includes"
            :key="item"
            class="glass-card rounded-[var(--radius)] px-6 py-5 flex items-center gap-3 text-[15px] text-(--theme-text-hi)">
            <UIcon name="i-heroicons-check-circle" class="w-5 h-5 shrink-0 text-(--theme-accent)" />
            {{ item }}
          </li>
        </ul>
      </section>

      <!-- ── Process ───────────────────────────────────────────────────────── -->
      <section class="max-w-[1200px] mx-auto px-4 pb-16 md:px-6 md:pb-20 lg:px-12">
        <header class="mb-10" data-reveal>
          <p class="eyebrow">How It Works</p>
          <h2 class="font-display text-[clamp(26px,3.4vw,40px)] font-extrabold tracking-[-0.03em] text-(--theme-fg) leading-[1.1]">
            Three steps, no mystery
          </h2>
        </header>
        <ol class="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <li
            v-for="(step, i) in steps"
            :key="step.n"
            class="glass-deep rounded-[var(--radius)] p-8"
            data-reveal
            :data-reveal-delay="i * 90">
            <span class="font-mono text-[12px] tracking-[0.14em] text-(--theme-accent)">{{ step.n }}</span>
            <h3 class="mt-3 font-display text-[19px] font-bold tracking-[-0.01em] text-(--theme-fg)">
              {{ step.title }}
            </h3>
            <p class="mt-3 text-[15px] leading-[1.7] text-(--theme-text-body)">{{ step.body }}</p>
          </li>
        </ol>
      </section>

      <!-- ── CTA ───────────────────────────────────────────────────────────── -->
      <section class="max-w-[1200px] mx-auto px-4 pb-16 md:px-6 md:pb-20 lg:px-12">
        <div class="glass-deep rounded-[var(--radius)] px-6 py-14 md:px-12 text-center" data-reveal>
          <h2 class="font-display text-[clamp(26px,3.6vw,40px)] font-extrabold tracking-[-0.03em] text-(--theme-fg) leading-[1.15] max-w-[620px] mx-auto">
            Let's see where your site stands today
          </h2>
          <p class="mt-5 text-[16px] leading-[1.7] text-(--theme-text-body) max-w-[520px] mx-auto">
            Free audit, no obligation. Managed hosting from {{ monthlyRate }}/month once you're live.
          </p>
          <div class="mt-9 flex flex-wrap items-center justify-center gap-4">
            <NuxtLink to="/#contact" class="btn-primary">Get a Free Audit</NuxtLink>
            <NuxtLink to="/tools/website-audit" class="btn-ghost">Run an instant speed test</NuxtLink>
          </div>
        </div>
      </section>

      <!-- ── Other services ────────────────────────────────────────────────── -->
      <section class="max-w-[1200px] mx-auto px-4 pb-20 md:px-6 lg:px-12">
        <h2 class="font-mono text-[12px] tracking-[0.14em] uppercase text-(--theme-text-muted) mb-6">
          Other services
        </h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NuxtLink
            v-for="other in otherServices"
            :key="other.slug"
            :to="`/services/${other.slug}`"
            class="glass-card rounded-[var(--radius)] p-6 no-underline flex flex-col gap-2 transition-[border-color] duration-300 hover:border-[color-mix(in_srgb,var(--theme-accent)_40%,transparent)]">
            <span class="font-mono text-[10px] tracking-[0.14em] uppercase text-(--theme-accent)">{{ other.tag }}</span>
            <span class="font-display text-[16px] font-bold text-(--theme-fg) tracking-[-0.01em]">{{ other.title }}</span>
          </NuxtLink>
        </div>
      </section>
    </main>

    <SiteFooter />
  </div>
</template>
