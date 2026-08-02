<script setup lang="ts">
import { ref } from 'vue'

const { track } = useAnalytics()
const isDev = import.meta.dev

interface Reply { tone: string, text: string }

const review       = ref('')
const rating       = ref(0)
const businessName = ref('')
const token        = ref(isDev ? 'dev-bypass' : '')
const pending      = ref(false)
const error        = ref('')
const replies      = ref<Reply[]>([])
const copied       = ref<string | null>(null)

const TONE_LABELS: Record<string, string> = {
  gracious:   'Warm',
  apologetic: 'Apologetic',
  brief:      'Short and professional',
}

async function generate() {
  if (review.value.trim().length < 15 || pending.value) return
  pending.value = true
  error.value = ''
  replies.value = []
  track('tool_use', { tool: 'review-response', rating: rating.value })

  try {
    const res = await $fetch<{ replies: Reply[] }>('/api/tools/review-response', {
      method: 'POST',
      body: {
        review: review.value,
        rating: rating.value || undefined,
        businessName: businessName.value || undefined,
        cfTurnstileToken: token.value,
      },
    })
    replies.value = res.replies
  }
  catch (e) {
    const m = e as { statusMessage?: string, data?: { statusMessage?: string } }
    error.value = m?.data?.statusMessage || m?.statusMessage
      || 'Something went wrong. Try again in a moment.'
  }
  finally {
    pending.value = false
  }
}

async function copy(text: string, tone: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = tone
    setTimeout(() => { if (copied.value === tone) copied.value = null }, 2000)
  }
  catch {
    error.value = 'Could not copy automatically — select the text and copy it manually.'
  }
}

const canonical = 'https://sites.ilytat.com/tools/review-response'
const title = 'Free Google Review Response Generator | ILYTAT'
const description
  = 'Paste a customer review and get three ready-to-post replies in different tones. Free, no signup. Built for local business owners who dread replying to reviews.'

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
        name: 'Review Response Generator',
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
            <li class="text-(--theme-text-hi)" aria-current="page">Review Reply Writer</li>
          </ol>
        </nav>

        <p class="eyebrow">Free Tool</p>
        <h1 class="font-display text-[clamp(34px,5.4vw,60px)] font-extrabold tracking-[-0.035em] leading-[1.05] text-(--theme-fg) max-w-[880px]">
          Never stare at a bad review again
        </h1>
        <p class="mt-6 text-[17px] md:text-[18px] leading-[1.7] text-(--theme-text-body) max-w-[620px]">
          Paste any customer review and get three replies you can post as-is. Replying well is one of
          the cheapest things you can do for your local ranking — and the hardest to make yourself sit
          down and write.
        </p>

        <!-- ── Form ────────────────────────────────────────────────────────── -->
        <form class="mt-10 max-w-[760px]" @submit.prevent="generate">
          <label for="review" class="block font-mono text-[11px] tracking-[0.1em] uppercase text-(--theme-text-muted) mb-2">
            The review
          </label>
          <textarea
            id="review"
            v-model="review"
            rows="5"
            maxlength="3000"
            :disabled="pending"
            placeholder="Paste the customer's review here…"
            class="w-full bg-[var(--theme-surface)] border border-[var(--glass-card-border)] rounded-[var(--radius-sm)] px-4 py-3.5 text-[16px] text-(--theme-fg) outline-none resize-y transition-[border-color] focus:border-[color-mix(in_srgb,var(--theme-accent)_55%,transparent)]" />

          <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <span class="block font-mono text-[11px] tracking-[0.1em] uppercase text-(--theme-text-muted) mb-2">
                Star rating <span class="normal-case tracking-normal">(optional)</span>
              </span>
              <div class="flex items-center gap-1" role="group" aria-label="Star rating">
                <button
                  v-for="n in 5"
                  :key="n"
                  type="button"
                  class="p-1 bg-transparent border-0 cursor-pointer transition-colors"
                  :class="n <= rating ? 'text-(--theme-accent)' : 'text-(--theme-text-muted)'"
                  :aria-label="`${n} star${n > 1 ? 's' : ''}`"
                  :aria-pressed="n === rating"
                  @click="rating = rating === n ? 0 : n">
                  <UIcon :name="n <= rating ? 'i-heroicons-star-solid' : 'i-heroicons-star'" class="w-6 h-6" />
                </button>
              </div>
            </div>

            <div>
              <label for="biz" class="block font-mono text-[11px] tracking-[0.1em] uppercase text-(--theme-text-muted) mb-2">
                Business name <span class="normal-case tracking-normal">(optional)</span>
              </label>
              <input
                id="biz"
                v-model="businessName"
                type="text"
                maxlength="80"
                :disabled="pending"
                placeholder="Jane's Bakery"
                class="w-full bg-[var(--theme-surface)] border border-[var(--glass-card-border)] rounded-[var(--radius-sm)] px-4 py-3.5 text-[16px] text-(--theme-fg) outline-none transition-[border-color] focus:border-[color-mix(in_srgb,var(--theme-accent)_55%,transparent)]">
            </div>
          </div>

          <div class="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <NuxtTurnstile v-if="!isDev" v-model="token" class="self-start" />
            <button
              type="submit"
              class="btn-primary justify-center shrink-0"
              :disabled="pending || review.trim().length < 15 || (!isDev && !token)">
              {{ pending ? 'Writing…' : 'Write my replies' }}
            </button>
          </div>

          <p class="mt-4 text-[13px] text-(--theme-text-muted)">
            Nothing is stored. Read each reply before you post it — you know your customer, the model doesn't.
          </p>
        </form>

        <!-- ── States ──────────────────────────────────────────────────────── -->
        <div
          v-if="pending"
          class="mt-10 glass-deep rounded-[var(--radius)] p-8 max-w-[760px] flex items-center gap-4"
          role="status"
          aria-live="polite">
          <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-(--theme-accent)" />
          <p class="text-[15px] text-(--theme-text-body)">Drafting three replies…</p>
        </div>

        <div
          v-else-if="error"
          class="mt-10 glass-deep rounded-[var(--radius)] p-8 max-w-[760px] flex items-start gap-4"
          role="alert">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 shrink-0 mt-0.5 text-(--theme-accent)" />
          <p class="text-[15px] text-(--theme-text-body)">{{ error }}</p>
        </div>

        <!-- ── Replies ─────────────────────────────────────────────────────── -->
        <div v-if="replies.length && !pending" class="mt-12 max-w-[860px]">
          <h2 class="font-display text-[clamp(22px,3vw,30px)] font-extrabold tracking-[-0.03em] text-(--theme-fg) mb-6">
            Pick the one that sounds like you
          </h2>
          <div class="flex flex-col gap-4">
            <article
              v-for="reply in replies"
              :key="reply.tone"
              class="glass-deep rounded-[var(--radius)] p-7">
              <div class="flex items-center justify-between gap-4 mb-4">
                <span class="font-mono text-[11px] tracking-[0.12em] uppercase text-(--theme-accent)">
                  {{ TONE_LABELS[reply.tone] ?? reply.tone }}
                </span>
                <button
                  type="button"
                  class="flex items-center gap-2 text-[13px] font-semibold text-(--theme-text-hi) bg-transparent border-0 cursor-pointer hover:text-(--theme-accent) transition-colors"
                  @click="copy(reply.text, reply.tone)">
                  <UIcon
                    :name="copied === reply.tone ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
                    class="w-4 h-4" />
                  {{ copied === reply.tone ? 'Copied' : 'Copy' }}
                </button>
              </div>
              <p class="text-[16px] leading-[1.75] text-(--theme-text-body) whitespace-pre-line">{{ reply.text }}</p>
            </article>
          </div>

          <div class="mt-10 glass-card rounded-[var(--radius)] px-6 py-10 md:px-10 text-center">
            <h3 class="font-display text-[clamp(20px,2.6vw,28px)] font-extrabold tracking-[-0.03em] text-(--theme-fg) max-w-[520px] mx-auto">
              Reviews bring people to your listing. Where do they go next?
            </h3>
            <p class="mt-4 text-[15px] leading-[1.7] text-(--theme-text-body) max-w-[500px] mx-auto">
              A good reply earns you the click. A slow or missing website loses it again.
            </p>
            <div class="mt-7 flex flex-wrap items-center justify-center gap-4">
              <NuxtLink to="/tools/website-audit" class="btn-primary">Check your site speed</NuxtLink>
              <NuxtLink to="/#contact" class="btn-ghost">Talk to me</NuxtLink>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Explainer: indexable before any generation runs ───────────────── -->
      <section class="max-w-[1200px] mx-auto px-4 pb-20 md:px-6 lg:px-12">
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3 max-w-[1000px]">
          <div
            v-for="item in [
              { t: 'Why replying matters', b: 'Google has said publicly that responding to reviews improves your local visibility, and shoppers read owner replies as a signal that someone is paying attention. An unanswered one-star review is the loudest thing on your listing.' },
              { t: 'How to answer a bad one', b: 'Acknowledge the specific problem, take responsibility without grovelling, and move it offline. Never argue the facts in public — you will not win, and everyone reading is judging your tone, not the details.' },
              { t: 'Answer the good ones too', b: 'Most businesses only reply when something goes wrong. Thanking happy customers takes seconds, adds fresh text to your listing, and makes the occasional complaint look like the exception it is.' },
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
