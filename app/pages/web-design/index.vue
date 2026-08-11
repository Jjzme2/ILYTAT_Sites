<script setup lang="ts">
/**
 * /web-design — the hub the individual town pages hang off.
 *
 * Exists for two reasons beyond being a nice index: it gives the breadcrumb
 * trail on each town page a real destination, and it gives Google a single
 * place from which every location page is one click away. Orphan pages that
 * only the sitemap knows about get crawled late and weighted lightly.
 */
import { siteConfig } from '~/config/site.config'

const ORIGIN = 'https://sites.ilytat.com'
const canonical = `${ORIGIN}/web-design`
const title = 'Web Design Service Areas — Kankakee County, IL | ILYTAT'
const description
  = 'Custom websites for businesses in Manteno, Kankakee, Bourbonnais, Bradley and Peotone. Based in Manteno — local enough to meet in person.'

const { pricing, formatPrice } = usePricing()

useHead({
  title,
  meta: [
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: canonical },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Service areas',
        itemListElement: siteConfig.locations.map((l, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: `Web design in ${l.city}, IL`,
          url: `${ORIGIN}/web-design/${l.slug}`,
        })),
      }),
    },
  ],
})
</script>

<template>
  <div class="bg-[var(--theme-bg)] text-(--theme-fg) font-sans leading-relaxed overflow-x-hidden">
    <SiteNav />

    <main>
      <section class="max-w-[1200px] mx-auto px-4 pt-14 pb-12 md:px-6 md:pt-20 lg:px-12">
        <nav aria-label="Breadcrumb" class="mb-8">
          <ol class="flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] uppercase text-(--theme-text-muted)">
            <li><NuxtLink to="/" class="no-underline hover:text-(--theme-accent) transition-colors">Home</NuxtLink></li>
            <li aria-hidden="true">/</li>
            <li class="text-(--theme-text-hi)" aria-current="page">Service Areas</li>
          </ol>
        </nav>

        <p class="eyebrow">Where I Work</p>
        <h1 class="font-display text-[clamp(34px,5.4vw,60px)] font-extrabold tracking-[-0.035em] leading-[1.05] text-(--theme-fg) max-w-[880px]">
          Websites for Kankakee County<br class="hidden md:block"> and the towns around it
        </h1>
        <p class="mt-6 text-[17px] md:text-[18px] leading-[1.7] text-(--theme-text-body) max-w-[620px]">
          ILYTAT is one person in Manteno, not an agency in a city an hour away. Close enough to meet
          at your counter, and priced for a local business rather than a marketing budget.
        </p>

        <div class="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <NuxtLink
            v-for="(area, i) in siteConfig.locations"
            :key="area.slug"
            :to="`/web-design/${area.slug}`"
            class="glass-card rounded-[var(--radius)] p-7 flex flex-col gap-3 no-underline transition-[border-color,box-shadow] duration-300 hover:border-[var(--glass-card-border)] hover:shadow-[var(--card-shadow)]"
            data-reveal
            :data-reveal-delay="i * 80">
            <span class="font-mono text-[10px] tracking-[0.12em] uppercase text-(--theme-accent)">{{ area.county }}</span>
            <h2 class="font-display text-[20px] font-bold tracking-[-0.01em] text-(--theme-fg)">{{ area.city }}</h2>
            <p class="text-[14.5px] leading-[1.7] text-(--theme-text-body) flex-1">{{ area.angle }}</p>
            <span class="font-mono text-[10px] tracking-[1.2px] uppercase text-(--theme-accent)">Read more →</span>
          </NuxtLink>
        </div>

        <p class="mt-8 text-[14px] text-(--theme-text-muted)">
          Not on the list? Get in touch anyway — if you are near enough to drive to, I will say so.
          Builds from {{ formatPrice(pricing.popUp) }}, hosting {{ formatPrice(pricing.standardHosting) }}/month.
        </p>

        <div class="mt-8 flex flex-wrap items-center gap-4">
          <NuxtLink to="/#contact" class="btn-primary">Start a conversation</NuxtLink>
          <NuxtLink to="/services" class="btn-ghost">See what I build</NuxtLink>
        </div>
      </section>
    </main>

    <SiteFooter />
  </div>
</template>
