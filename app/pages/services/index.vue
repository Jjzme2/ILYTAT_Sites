<script setup lang="ts">
import { siteConfig } from '~/config/site.config'

const { services } = siteConfig
const { pricing, formatPrice } = usePricing()

const canonical = 'https://sites.ilytat.com/services'
const title = 'Website Design Services — Kankakee County, IL | ILYTAT'
const description
  = 'Website design and custom software for local businesses in Manteno, Bourbonnais, Bradley, Kankakee and Peotone. Shops, restaurants, trades, events and custom builds.'

useHead({
  title,
  meta: [
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: canonical },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
  ],
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'ILYTAT services',
        itemListElement: services.map((s, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: s.title,
          url: `https://sites.ilytat.com/services/${s.slug}`,
        })),
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
      <section class="max-w-[1200px] mx-auto px-4 pt-14 pb-14 md:px-6 md:pt-20 lg:px-12">
        <nav aria-label="Breadcrumb" class="mb-8">
          <ol class="flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] uppercase text-(--theme-text-muted)">
            <li><NuxtLink to="/" class="no-underline hover:text-(--theme-accent) transition-colors">Home</NuxtLink></li>
            <li aria-hidden="true">/</li>
            <li class="text-(--theme-text-hi)" aria-current="page">Services</li>
          </ol>
        </nav>

        <p class="eyebrow">What I Build</p>
        <h1 class="font-display text-[clamp(34px,5.4vw,60px)] font-extrabold tracking-[-0.035em] leading-[1.05] text-(--theme-fg) max-w-[820px]">
          Websites and software for Kankakee County businesses
        </h1>
        <p class="mt-6 text-[17px] md:text-[18px] leading-[1.7] text-(--theme-text-body) max-w-[620px]">
          Every build is custom, mobile-first, and yours to keep. Managed hosting from {{ formatPrice(pricing.standardHosting) }}/month.
        </p>
      </section>

      <section class="max-w-[1200px] mx-auto px-4 pb-20 md:px-6 lg:px-12">
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <NuxtLink
            v-for="(svc, i) in services"
            :key="svc.slug"
            :to="`/services/${svc.slug}`"
            class="glass-deep rounded-[var(--radius)] p-8 md:p-10 no-underline flex flex-col gap-4 group transition-[border-color] duration-300 hover:border-[color-mix(in_srgb,var(--theme-accent)_40%,transparent)]"
            data-reveal
            :data-reveal-delay="i * 80">
            <span class="font-mono text-[11px] tracking-[0.14em] uppercase text-(--theme-accent)">
              {{ svc.tag }}
            </span>
            <h2 class="font-display text-[21px] font-bold tracking-[-0.015em] text-(--theme-fg)">
              {{ svc.title }}
            </h2>
            <p class="text-[15px] leading-[1.7] text-(--theme-text-body) flex-1">
              {{ svc.body }}
            </p>
            <span class="font-mono text-[12px] tracking-[0.12em] uppercase text-(--theme-accent) inline-flex items-center gap-2">
              Learn more
              <span class="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
            </span>
          </NuxtLink>
        </div>

        <div class="mt-12 flex flex-wrap items-center justify-center gap-4">
          <NuxtLink to="/#contact" class="btn-primary">Get a Free Audit</NuxtLink>
          <NuxtLink to="/tools/website-audit" class="btn-ghost">Run an instant speed test</NuxtLink>
        </div>
      </section>
    </main>

    <SiteFooter />
  </div>
</template>
