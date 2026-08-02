<script setup lang="ts">
import { ref, computed } from 'vue'
import { siteConfig } from '~/config/site.config'

const { monthlyRate } = siteConfig
const { track } = useAnalytics()

interface AuditResult {
  url: string
  strategy: string
  scores: {
    performance: number | null
    accessibility: number | null
    bestPractices: number | null
    seo: number | null
  }
  metrics: { lcp: string | null, cls: string | null, tbt: string | null, fcp: string | null }
  opportunities: { title: string, detail: string }[]
}

const url      = ref('')
const strategy = ref<'mobile' | 'desktop'>('mobile')
const pending  = ref(false)
const error    = ref('')
const result   = ref<AuditResult | null>(null)

const SCORES = [
  { key: 'performance',   label: 'Performance' },
  { key: 'accessibility', label: 'Accessibility' },
  { key: 'bestPractices', label: 'Best Practices' },
  { key: 'seo',           label: 'SEO' },
] as const

/** Lighthouse banding: >=90 good, >=50 needs work, below that poor. */
function band(score: number | null) {
  if (score === null) return { label: 'n/a', tone: 'text-(--theme-text-muted)' }
  if (score >= 90) return { label: 'Good', tone: 'text-(--status-good)' }
  if (score >= 50) return { label: 'Needs work', tone: 'text-(--status-warn)' }
  return { label: 'Poor', tone: 'text-(--status-bad)' }
}

const weakest = computed(() => {
  if (!result.value) return null
  const entries = SCORES
    .map(s => ({ ...s, value: result.value!.scores[s.key] }))
    .filter(s => typeof s.value === 'number') as { key: string, label: string, value: number }[]
  if (!entries.length) return null
  return entries.reduce((a, b) => (a.value <= b.value ? a : b))
})

async function runAudit() {
  if (!url.value.trim() || pending.value) return
  pending.value = true
  error.value = ''
  result.value = null
  track('audit_run', { strategy: strategy.value })

  try {
    result.value = await $fetch<AuditResult>('/api/audit', {
      method: 'POST',
      body: { url: url.value, strategy: strategy.value },
    })
  }
  catch (e) {
    const msg = (e as { statusMessage?: string, data?: { statusMessage?: string } })
    error.value = msg?.data?.statusMessage || msg?.statusMessage
      || 'Something went wrong running that audit. Try again in a moment.'
  }
  finally {
    pending.value = false
  }
}

const canonical = 'https://sites.ilytat.com/tools/website-audit'
const title = 'Free Website Speed Test & SEO Audit | ILYTAT'
const description
  = 'Check any website\'s speed, SEO, accessibility and best-practice scores with a free instant audit powered by Google PageSpeed Insights. No signup required.'

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
        '@type': 'WebApplication',
        name: 'Free Website Audit',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Any',
        url: canonical,
        description,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
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
            <li class="text-(--theme-text-hi)" aria-current="page">Website Audit</li>
          </ol>
        </nav>

        <p class="eyebrow">Free Tool</p>
        <h1 class="font-display text-[clamp(34px,5.4vw,60px)] font-extrabold tracking-[-0.035em] leading-[1.05] text-(--theme-fg) max-w-[820px]">
          How fast is your website, really?
        </h1>
        <p class="mt-6 text-[17px] md:text-[18px] leading-[1.7] text-(--theme-text-body) max-w-[620px]">
          Run a real Google PageSpeed audit on any site. No signup, no email required — you get the
          same scores Google uses when it decides where to rank you.
        </p>

        <!-- ── Form ────────────────────────────────────────────────────────── -->
        <form class="mt-10 max-w-[720px]" @submit.prevent="runAudit">
          <label for="audit-url" class="block font-mono text-[11px] tracking-[0.1em] uppercase text-(--theme-text-muted) mb-2">
            Website address
          </label>
          <div class="flex flex-col sm:flex-row gap-3">
            <input
              id="audit-url"
              v-model="url"
              type="text"
              inputmode="url"
              autocomplete="url"
              placeholder="yourbusiness.com"
              :disabled="pending"
              class="flex-1 bg-[var(--theme-surface)] border border-[var(--glass-card-border)] rounded-[var(--radius-sm)] px-4 py-3.5 text-[16px] text-(--theme-fg) outline-none transition-[border-color] focus:border-[color-mix(in_srgb,var(--theme-accent)_55%,transparent)]">
            <button type="submit" class="btn-primary justify-center shrink-0" :disabled="pending">
              {{ pending ? 'Auditing…' : 'Run free audit' }}
            </button>
          </div>

          <fieldset class="mt-4 flex items-center gap-4">
            <legend class="sr-only">Device</legend>
            <label
              v-for="opt in (['mobile', 'desktop'] as const)"
              :key="opt"
              class="flex items-center gap-2 text-[14px] text-(--theme-text-body) cursor-pointer">
              <input v-model="strategy" type="radio" :value="opt" :disabled="pending" class="accent-[var(--theme-accent)]">
              <span class="capitalize">{{ opt }}</span>
            </label>
          </fieldset>

          <p class="mt-4 text-[13px] text-(--theme-text-muted)">
            Audits take 10–30 seconds. Results come straight from Google PageSpeed Insights.
          </p>
        </form>

        <!-- ── Pending ─────────────────────────────────────────────────────── -->
        <div
          v-if="pending"
          class="mt-10 glass-deep rounded-[var(--radius)] p-8 max-w-[720px] flex items-center gap-4"
          role="status"
          aria-live="polite">
          <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-(--theme-accent)" />
          <p class="text-[15px] text-(--theme-text-body)">
            Running Lighthouse against {{ url }} — this takes up to half a minute.
          </p>
        </div>

        <!-- ── Error ───────────────────────────────────────────────────────── -->
        <div
          v-else-if="error"
          class="mt-10 glass-deep rounded-[var(--radius)] p-8 max-w-[720px] flex items-start gap-4"
          role="alert">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 shrink-0 mt-0.5 text-(--theme-accent)" />
          <p class="text-[15px] text-(--theme-text-body)">{{ error }}</p>
        </div>
      </section>

      <!-- ── Results ───────────────────────────────────────────────────────── -->
      <section v-if="result && !pending" class="max-w-[1200px] mx-auto px-4 pb-16 md:px-6 lg:px-12">
        <h2 class="font-display text-[clamp(24px,3.2vw,34px)] font-extrabold tracking-[-0.03em] text-(--theme-fg) mb-2">
          Results for {{ result.url }}
        </h2>
        <p class="font-mono text-[12px] tracking-[0.1em] uppercase text-(--theme-text-muted) mb-8">
          {{ result.strategy }} · Google PageSpeed Insights
        </p>

        <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div
            v-for="s in SCORES"
            :key="s.key"
            class="glass-deep rounded-[var(--radius)] px-6 py-7 flex flex-col gap-2">
            <span class="font-display text-[40px] font-extrabold leading-none tracking-[-0.03em] text-(--theme-fg)">
              {{ result.scores[s.key] ?? '—' }}
            </span>
            <span class="text-[14px] text-(--theme-text-hi)">{{ s.label }}</span>
            <span class="font-mono text-[11px] tracking-[0.1em] uppercase" :class="band(result.scores[s.key]).tone">
              {{ band(result.scores[s.key]).label }}
            </span>
          </div>
        </div>

        <!-- Core Web Vitals -->
        <div class="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div
            v-for="m in [
              { label: 'Largest Contentful Paint', value: result.metrics.lcp },
              { label: 'Cumulative Layout Shift', value: result.metrics.cls },
              { label: 'Total Blocking Time', value: result.metrics.tbt },
              { label: 'First Contentful Paint', value: result.metrics.fcp },
            ]"
            :key="m.label"
            class="glass-card rounded-[var(--radius)] px-6 py-5 flex flex-col gap-1">
            <span class="font-display text-[20px] font-bold text-(--theme-fg)">{{ m.value ?? '—' }}</span>
            <span class="text-[13px] text-(--theme-text-muted) leading-[1.5]">{{ m.label }}</span>
          </div>
        </div>

        <!-- Opportunities -->
        <div v-if="result.opportunities.length" class="mt-10">
          <h3 class="font-display text-[22px] font-bold tracking-[-0.02em] text-(--theme-fg) mb-5">
            What's slowing it down
          </h3>
          <ul class="flex flex-col gap-3 max-w-[820px]">
            <li
              v-for="o in result.opportunities"
              :key="o.title"
              class="glass-card rounded-[var(--radius)] px-6 py-5 flex items-start gap-3">
              <UIcon name="i-heroicons-wrench-screwdriver" class="w-5 h-5 shrink-0 mt-0.5 text-(--theme-accent)" />
              <div>
                <p class="text-[15px] text-(--theme-fg)">{{ o.title }}</p>
                <p v-if="o.detail" class="text-[13.5px] text-(--theme-text-muted) mt-1">{{ o.detail }}</p>
              </div>
            </li>
          </ul>
        </div>

        <!-- CTA -->
        <div class="mt-12 glass-deep rounded-[var(--radius)] px-6 py-12 md:px-12 text-center">
          <h3 class="font-display text-[clamp(24px,3.2vw,34px)] font-extrabold tracking-[-0.03em] text-(--theme-fg) leading-[1.15] max-w-[560px] mx-auto">
            <template v-if="weakest && weakest.value < 90">
              Want help fixing that {{ weakest.label.toLowerCase() }} score?
            </template>
            <template v-else>
              Solid scores. Want a site that converts as well as it loads?
            </template>
          </h3>
          <p class="mt-5 text-[16px] leading-[1.7] text-(--theme-text-body) max-w-[520px] mx-auto">
            I build fast, custom sites for local businesses in Kankakee County — managed hosting from
            {{ monthlyRate }}/month, and you own every line of code.
          </p>
          <div class="mt-8 flex flex-wrap items-center justify-center gap-4">
            <NuxtLink
              to="/#contact"
              class="btn-primary"
              @click="track('cta_click', { label: 'Audit result', location: 'website-audit' })">
              Talk to me about it
            </NuxtLink>
            <NuxtLink to="/services" class="btn-ghost">See what I build</NuxtLink>
          </div>
        </div>
      </section>

      <!-- ── Explainer (indexable content, present before any audit runs) ──── -->
      <section class="max-w-[1200px] mx-auto px-4 pb-20 md:px-6 lg:px-12">
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3 max-w-[1000px]">
          <div
            v-for="item in [
              { t: 'Why speed matters', b: 'More than half of mobile visitors leave a page that takes over three seconds to load. Google also uses speed as a ranking signal, so a slow site costs you twice.' },
              { t: 'What the scores mean', b: '90 and above is good, 50 to 89 needs work, and below 50 is costing you customers. Performance and SEO are the two that most directly affect whether people find and stay on your site.' },
              { t: 'What to do next', b: 'Most small-business sites lose points to oversized images, render-blocking scripts and bloated page builders. Those are fixable — often without a rebuild.' },
            ]"
            :key="item.t"
            class="glass-card rounded-[var(--radius)] p-8 flex flex-col gap-3">
            <h2 class="font-display text-[18px] font-bold tracking-[-0.01em] text-(--theme-fg)">{{ item.t }}</h2>
            <p class="text-[15px] leading-[1.7] text-(--theme-text-body)">{{ item.b }}</p>
          </div>
        </div>
      </section>
    </main>

    <SiteFooter />
  </div>
</template>
