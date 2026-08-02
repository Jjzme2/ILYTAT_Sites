<script setup lang="ts">
import { ref, computed } from 'vue'

/**
 * Entirely client-side: no API, no key, no spend, no abuse surface. Every item
 * is something a business owner can check and fix themselves, weighted by how
 * much it actually moves local ranking.
 */
const SECTIONS = [
  {
    name: 'Google Business Profile',
    items: [
      { id: 'gbp-claimed', weight: 5, label: 'You have claimed and verified your Google Business Profile', why: 'Unclaimed listings can be edited by the public and rank below claimed ones.' },
      { id: 'gbp-category', weight: 4, label: 'Your primary category matches what you actually sell', why: 'Category is one of the strongest local ranking signals. "Restaurant" and "Pizza restaurant" compete in different searches.' },
      { id: 'gbp-hours', weight: 4, label: 'Hours are correct, including holidays', why: 'Wrong hours generate one-star reviews from people who drove to a closed door.' },
      { id: 'gbp-photos', weight: 3, label: 'At least 10 real photos, added within the last 3 months', why: 'Listings with recent photos get materially more clicks. Stock images do not count.' },
      { id: 'gbp-desc', weight: 2, label: 'The description says what you do and where, in plain words', why: 'This is read by humans deciding whether to call you.' },
    ],
  },
  {
    name: 'Reviews',
    items: [
      { id: 'rev-count', weight: 4, label: 'You have at least 10 reviews', why: 'Below roughly ten, buyers discount what they read as too small a sample.' },
      { id: 'rev-reply', weight: 4, label: 'You reply to reviews — good and bad', why: 'Google has said replying helps visibility, and an unanswered complaint is the loudest thing on your listing.' },
      { id: 'rev-recent', weight: 3, label: 'Your most recent review is under 3 months old', why: 'A stale review feed reads as a business that may have closed.' },
      { id: 'rev-asking', weight: 2, label: 'You have a routine for asking happy customers', why: 'Reviews do not accumulate on their own. The ask has to be part of the job.' },
    ],
  },
  {
    name: 'Your website',
    items: [
      { id: 'web-exists', weight: 5, label: 'You have a website you control — not only a Facebook page', why: 'A platform you do not own can change its rules, its reach, or disappear.' },
      { id: 'web-mobile', weight: 5, label: 'It works properly on a phone', why: 'Most local searches are mobile. Google indexes the mobile version first.' },
      { id: 'web-nap', weight: 4, label: 'Name, address and phone appear as text, matching your listing exactly', why: 'Inconsistent details across the web dilute the signal that they refer to one business.' },
      { id: 'web-speed', weight: 3, label: 'It loads in under 3 seconds', why: 'Over half of mobile visitors abandon a slower page. Speed is also a ranking factor.' },
      { id: 'web-title', weight: 3, label: 'Your homepage title names your service and your town', why: 'This is the single line Google weighs most when matching a local search.' },
      { id: 'web-ssl', weight: 3, label: 'It uses HTTPS, with no browser warning', why: 'A security warning ends the visit before the page renders.' },
    ],
  },
  {
    name: 'Being found elsewhere',
    items: [
      { id: 'cit-consistent', weight: 3, label: 'Your details are identical on Facebook, Yelp and Apple Maps', why: 'Search engines cross-check these. A stale old address undermines all of them.' },
      { id: 'cit-old', weight: 2, label: 'Old or duplicate listings have been claimed or removed', why: 'A duplicate with a disconnected number splits your signal and misroutes customers.' },
    ],
  },
] as const

const checked = ref<Record<string, boolean>>({})
const showResult = ref(false)

const maxScore = SECTIONS.flatMap(s => s.items).reduce((n, i) => n + i.weight, 0)
const score = computed(() =>
  SECTIONS.flatMap(s => s.items).filter(i => checked.value[i.id]).reduce((n, i) => n + i.weight, 0))
const pct = computed(() => Math.round((score.value / maxScore) * 100))

/** Unchecked items, worst-first — this is the actual deliverable. */
const gaps = computed(() =>
  SECTIONS.flatMap(s => s.items.map(i => ({ ...i, section: s.name })))
    .filter(i => !checked.value[i.id])
    .sort((a, b) => b.weight - a.weight))

const verdict = computed(() => {
  if (pct.value >= 85) return { label: 'Strong', tone: 'text-(--status-good)' }
  if (pct.value >= 55) return { label: 'Some gaps', tone: 'text-(--status-warn)' }
  return { label: 'Losing customers', tone: 'text-(--status-bad)' }
})

const canonical = 'https://sites.ilytat.com/tools/local-seo-checklist'
const title = 'Free Local SEO Checklist for Small Businesses | ILYTAT'
const description
  = 'Score your local search presence in two minutes. 17 weighted checks across Google Business Profile, reviews, your website and directory listings. No signup.'

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
        '@type': 'HowTo',
        name: 'Local SEO checklist for small businesses',
        description,
        url: canonical,
        step: SECTIONS.flatMap(s => s.items).map((i, n) => ({
          '@type': 'HowToStep',
          position: n + 1,
          name: i.label,
          text: i.why,
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
      <section class="max-w-[1200px] mx-auto px-4 pt-14 pb-10 md:px-6 md:pt-20 lg:px-12">
        <nav aria-label="Breadcrumb" class="mb-8">
          <ol class="flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] uppercase text-(--theme-text-muted)">
            <li><NuxtLink to="/" class="no-underline hover:text-(--theme-accent) transition-colors">Home</NuxtLink></li>
            <li aria-hidden="true">/</li>
            <li class="text-(--theme-text-hi)" aria-current="page">Local SEO Checklist</li>
          </ol>
        </nav>

        <p class="eyebrow">Free Tool</p>
        <h1 class="font-display text-[clamp(34px,5.4vw,60px)] font-extrabold tracking-[-0.035em] leading-[1.05] text-(--theme-fg) max-w-[880px]">
          Can customers actually find you?
        </h1>
        <p class="mt-6 text-[17px] md:text-[18px] leading-[1.7] text-(--theme-text-body) max-w-[620px]">
          Seventeen checks, weighted by how much each one really affects whether you show up in local
          search. Tick what you have. Two minutes, nothing stored.
        </p>
      </section>

      <!-- ── Checklist ────────────────────────────────────────────────────── -->
      <section class="max-w-[1200px] mx-auto px-4 pb-8 md:px-6 lg:px-12">
        <div class="max-w-[860px] flex flex-col gap-8">
          <fieldset v-for="section in SECTIONS" :key="section.name" class="border-0 p-0 m-0">
            <legend class="font-display text-[20px] font-bold tracking-[-0.02em] text-(--theme-fg) mb-4">
              {{ section.name }}
            </legend>
            <div class="flex flex-col gap-3">
              <label
                v-for="item in section.items"
                :key="item.id"
                class="glass-card rounded-[var(--radius)] p-5 flex gap-4 cursor-pointer transition-[border-color] hover:border-[color-mix(in_srgb,var(--theme-accent)_35%,transparent)]">
                <input
                  v-model="checked[item.id]"
                  type="checkbox"
                  class="mt-1 w-5 h-5 shrink-0 accent-[var(--theme-accent)] cursor-pointer">
                <span>
                  <span class="block text-[16px] text-(--theme-fg) leading-snug">{{ item.label }}</span>
                  <span class="block mt-1.5 text-[14px] text-(--theme-text-muted) leading-[1.6]">{{ item.why }}</span>
                </span>
              </label>
            </div>
          </fieldset>

          <button type="button" class="btn-primary self-start" @click="showResult = true">
            Show my score
          </button>
        </div>
      </section>

      <!-- ── Result ───────────────────────────────────────────────────────── -->
      <section v-if="showResult" class="max-w-[1200px] mx-auto px-4 pb-16 md:px-6 lg:px-12">
        <div class="max-w-[860px]">
          <div class="glass-deep rounded-[var(--radius)] p-8 md:p-10">
            <div class="flex flex-wrap items-baseline gap-4">
              <span class="font-display text-[56px] font-extrabold leading-none tracking-[-0.04em] text-(--theme-fg)">
                {{ pct }}%
              </span>
              <span class="font-mono text-[13px] tracking-[0.12em] uppercase" :class="verdict.tone">
                {{ verdict.label }}
              </span>
            </div>
            <div
              class="mt-6 h-2 w-full rounded-full overflow-hidden bg-[var(--theme-surface-deep)]"
              role="progressbar"
              :aria-valuenow="pct"
              aria-valuemin="0"
              aria-valuemax="100">
              <div class="h-full bg-[var(--theme-accent)] transition-[width] duration-500" :style="{ width: `${pct}%` }" />
            </div>
            <p class="mt-5 text-[15px] text-(--theme-text-body)">
              {{ score }} of {{ maxScore }} weighted points.
            </p>
          </div>

          <div v-if="gaps.length" class="mt-8">
            <h2 class="font-display text-[22px] font-bold tracking-[-0.02em] text-(--theme-fg) mb-2">
              Fix these first
            </h2>
            <p class="text-[15px] text-(--theme-text-muted) mb-5">Ordered by how much each one costs you.</p>
            <ul class="flex flex-col gap-3">
              <li
                v-for="gap in gaps.slice(0, 6)"
                :key="gap.id"
                class="glass-card rounded-[var(--radius)] p-5 flex gap-4">
                <UIcon name="i-heroicons-wrench-screwdriver" class="w-5 h-5 shrink-0 mt-0.5 text-(--theme-accent)" />
                <span>
                  <span class="block text-[15px] text-(--theme-fg)">{{ gap.label }}</span>
                  <span class="block mt-1 text-[13.5px] text-(--theme-text-muted)">{{ gap.section }} · {{ gap.why }}</span>
                </span>
              </li>
            </ul>
          </div>

          <div v-else class="mt-8 glass-card rounded-[var(--radius)] p-8">
            <p class="text-[16px] text-(--theme-fg)">
              Nothing left on this list. Worth re-checking your site speed — that one drifts as a site grows.
            </p>
          </div>

          <div class="mt-10 glass-card rounded-[var(--radius)] px-6 py-10 md:px-10 text-center">
            <h3 class="font-display text-[clamp(20px,2.6vw,28px)] font-extrabold tracking-[-0.03em] text-(--theme-fg) max-w-[520px] mx-auto">
              Want these handled for you?
            </h3>
            <p class="mt-4 text-[15px] leading-[1.7] text-(--theme-text-body) max-w-[500px] mx-auto">
              Local search setup and a Google Business Profile that matches your site are part of every
              build I do.
            </p>
            <div class="mt-7 flex flex-wrap items-center justify-center gap-4">
              <NuxtLink to="/#contact" class="btn-primary">Get a free audit</NuxtLink>
              <NuxtLink to="/services" class="btn-ghost">See what I build</NuxtLink>
            </div>
          </div>
        </div>
      </section>
    </main>

    <SiteFooter />
  </div>
</template>
