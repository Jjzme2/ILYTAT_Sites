<script setup lang="ts">
/**
 * SitePricing — pricing cards with billing cycle and hosting tier controls.
 *
 * Hosting tier (Standard / Premium) is a single global toggle rendered once
 * above the card grid — not inside each card. Previously each card rendered
 * its own duplicate controls all mutating the same ref, which was both
 * visually redundant and confusing.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { siteConfig } from '~/config/site.config'
import { useCheckout } from '~/composables/useCheckout'

const { packages, subscriptions, overageRate } = siteConfig

// Every figure below comes from Stripe when it can be read and verified, and
// from site.config.ts otherwise. Nothing here reads a committed price
// directly — that is what let the page advertise $1,499 while Stripe billed
// $999.
const { pricing, packagePrice, formatPrice } = usePricing()

// The feature list for whichever hosting tier is selected.
const hostingFeatures = computed(() =>
  hostingTier.value === 'premium'
    ? subscriptions.PREMIUM_HOSTING.features
    : subscriptions.STANDARD_HOSTING.features,
)
const { billingCycle, hostingTier } = useCheckout()
const { track } = useAnalytics()

// Derive the displayed hosting rate from the selected tier — prevents
// showing a hardcoded $89 when premium ($149) is actively selected.
const hostingMonthlyRate = computed(() =>
  formatPrice(hostingTier.value === 'premium'
    ? pricing.value.premiumHosting
    : pricing.value.standardHosting),
)
const hostingYearlyRate = computed(() =>
  `${formatPrice(hostingTier.value === 'premium'
    ? pricing.value.premiumHostingYearly
    : pricing.value.standardHostingYearly)}/yr`,
)

// Track when the pricing section first enters the viewport — fires once.
// Observer stored in a ref so onUnmounted can clean it up correctly.
const pricingObserver = ref<IntersectionObserver | null>(null)

onMounted(() => {
  const section = document.getElementById('pricing')
  if (!section) return

  pricingObserver.value = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        track('pricing_viewed')
        pricingObserver.value?.disconnect()
        pricingObserver.value = null
      }
    },
    { threshold: 0.2 },
  )
  pricingObserver.value.observe(section)
})

onUnmounted(() => pricingObserver.value?.disconnect())
</script>

<template>
  <section id="pricing" class="relative overflow-hidden">
    <div class="pricing-bg" aria-hidden="true" />
    <div class="relative max-w-[1200px] mx-auto px-4 py-16 md:px-6 md:py-20 lg:px-12 lg:py-[100px]">
      <header class="mb-14" data-reveal>
        <p class="eyebrow">Pricing</p>
        <h2
          class="font-display text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-2px] text-(--theme-fg) leading-[1.05] mt-2">
          One build price.<br />
          <em class="font-headline italic text-(--theme-accent)">One monthly rate.</em>
        </h2>
        <p class="text-[14px] text-(--theme-text-muted) mt-4 leading-[1.85]">
          Pick your package — then {{ hostingMonthlyRate }}/month covers everything else.
        </p>
      </header>

      <!-- Global controls: billing cycle + hosting tier -->
      <div class="flex flex-wrap items-center gap-6 mb-12" data-reveal>
        <!-- Billing cycle toggle -->
        <div class="flex items-center gap-3">
          <span class="font-mono text-[10px] tracking-[1.5px] uppercase transition-colors duration-200"
            :class="billingCycle === 'monthly' ? 'text-(--theme-text-hi)' : 'text-(--theme-text-ghost)'">Monthly</span>
          <button
            class="relative w-10 h-[22px] rounded-full transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]/20"
            :class="billingCycle === 'yearly' ? 'bg-[var(--theme-accent)]' : 'bg-[var(--theme-surface-deep)]'"
            :aria-label="billingCycle === 'yearly' ? 'Switch to monthly' : 'Switch to yearly'"
            @click="billingCycle = billingCycle === 'monthly' ? 'yearly' : 'monthly'">
            <span
              class="absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
              :class="billingCycle === 'yearly' ? 'translate-x-[18px]' : 'translate-x-0'" />
          </button>
          <span class="font-mono text-[10px] tracking-[1.5px] uppercase transition-colors duration-200"
            :class="billingCycle === 'yearly' ? 'text-(--theme-text-hi)' : 'text-(--theme-text-ghost)'">
            Yearly
            <span
              class="ml-1.5 font-mono text-[8.5px] font-bold text-(--theme-cta-text) bg-[var(--theme-accent-bright)] px-1.5 py-0.5 rounded-[var(--radius)] uppercase tracking-[0.5px]">Save
              2 months</span>
          </span>
        </div>

        <!-- Hosting tier selector -->
        <div class="flex items-center gap-2">
          <span class="font-mono text-[9px] uppercase text-(--theme-text-ghost) tracking-[1.5px]">Hosting:</span>
          <button class="font-mono text-[9px] uppercase transition-colors px-2 py-1"
            :class="hostingTier === 'standard' ? 'text-(--theme-accent) border border-[var(--theme-accent)]/20 rounded-[var(--radius)]' : 'text-(--theme-text-ghost) hover:text-(--theme-text-muted)'"
            @click="hostingTier = 'standard'">Standard</button>
          <span class="text-(--theme-text-ghost) text-[9px]">/</span>
          <button class="font-mono text-[9px] uppercase transition-colors px-2 py-1"
            :class="hostingTier === 'premium' ? 'text-(--theme-accent) border border-[var(--theme-accent)]/20 rounded-[var(--radius)]' : 'text-(--theme-text-ghost) hover:text-(--theme-text-muted)'"
            @click="hostingTier = 'premium'">Premium</button>
        </div>
      </div>

      <!-- What the hosting fee actually buys.
           These lists lived in siteConfig.subscriptions and were never
           rendered, so the toggle swung $89 -> $149 with nothing to justify
           it. The buyer's comparison is not an agency retainer, it is
           Squarespace at $23/mo — so the human-edits line has to be visible. -->
      <div class="glass-card rounded-[var(--radius)] p-6 md:p-8 mb-8" data-reveal>
        <div class="flex flex-wrap items-baseline justify-between gap-3 mb-5">
          <h3 class="font-display text-[17px] font-bold tracking-[-0.01em] text-(--theme-fg)">
            What the {{ hostingMonthlyRate }}/month covers
          </h3>
          <span class="font-mono text-[11px] tracking-[0.12em] uppercase text-(--theme-accent)">
            {{ hostingTier === 'premium' ? 'Premium' : 'Standard' }} hosting
          </span>
        </div>
        <ul class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
          <li
            v-for="f in hostingFeatures"
            :key="f"
            class="flex items-start gap-2.5 text-[14.5px] leading-[1.6] text-(--theme-text-body)">
            <UIcon name="i-heroicons-check" class="w-4 h-4 shrink-0 mt-1 text-(--theme-accent)" />
            <span>{{ f }}</span>
          </li>
        </ul>
        <p class="mt-5 text-[13.5px] leading-[1.7] text-(--theme-text-muted)">
          First month free. Cancel any time with 30 days' notice — you keep the site and the code.
          Edits beyond the included time are billed at {{ overageRate }}/hour, and unused time does not roll over.
        </p>
      </div>

      <!-- Pricing cards -->
      <div class="grid grid-cols-1 gap-4 items-start sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="(pkg, i) in packages" :key="pkg.name"
          class="glass-deep rounded-[var(--radius)] px-5 py-7 sm:px-7 sm:py-9 relative transition-[border-color,box-shadow] duration-300"
          :class="pkg.featured ? 'price-card-featured' : 'hover:border-[var(--glass-card-border)]'" data-reveal
          :data-reveal-delay="i * 100">
          <div v-if="pkg.featured"
            class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--theme-accent)] to-transparent" />
          <div v-if="pkg.featured"
            class="absolute top-4 right-5 font-mono text-[8px] font-bold text-(--theme-accent)/70 uppercase tracking-[2px]">
            Most Popular
          </div>
          <p class="font-mono text-[9px] text-(--theme-text-ghost) uppercase tracking-[2px] mb-5">{{ pkg.name }}</p>
          <div class="flex flex-col items-start mb-1.5">
            <span v-if="pkg.includeStartingAt"
              class="font-mono text-[9px] text-(--theme-accent) uppercase tracking-[1px] mb-1">Starting at</span>
            <div class="flex items-baseline gap-2">
              <span
                class="font-display text-[44px] sm:text-[54px] font-extrabold tracking-[-3px] leading-none text-(--theme-fg)">{{
                  packagePrice(pkg.name) }}</span>
              <span class="text-[12px] text-(--theme-text-ghost)">{{ pkg.note }}</span>
            </div>
          </div>
          <div class="flex flex-col gap-1 mb-6 pb-6 border-b border-[var(--glass-card-border)]">
            <span v-if="billingCycle === 'monthly'" class="font-mono text-[11.5px] font-bold text-(--theme-accent)/70">
              then {{ hostingMonthlyRate }}/mo hosting
            </span>
            <span v-else class="font-mono text-[11.5px] font-bold text-(--theme-accent)/70">
              {{ hostingYearlyRate }} hosting
              <span class="text-(--theme-text-ghost) font-normal text-[10px]">· save 2 months</span>
            </span>
            <span class="text-[11px] text-(--theme-text-ghost) leading-snug">First 30 days free — hosting, SSL &amp; domain
              included</span>
          </div>
          <p class="text-[11.5px] text-(--theme-accent)/50 mb-5 leading-snug">Best for: {{ pkg.best }}</p>
          <ul class="tier-features">
            <li v-for="f in pkg.features" :key="f">{{ f }}</li>
          </ul>
          <p
            class="font-mono text-[9px] tracking-[1.5px] text-(--theme-text-faint) uppercase mt-5 mb-5 border-t border-[var(--glass-card-border)] pt-4">
            Delivered in {{ pkg.delivery }}
          </p>
          <a href="#contact" class="price-cta" :class="{ 'price-cta-featured': pkg.featured }"
            @click="track('cta_click', { label: 'Get Started', location: 'pricing', package: pkg.name })">
            Get Started →
          </a>
        </div>

        <!-- Custom Software — full-width card spanning all columns -->
        <div
          class="col-span-full glass-deep rounded-[var(--radius)] px-5 py-7 sm:px-7 sm:py-9 relative hover:border-[var(--glass-card-border)] transition-[border-color,box-shadow] duration-300"
          data-reveal
          :data-reveal-delay="packages.length * 100">
          <p class="font-mono text-[9px] text-(--theme-text-ghost) uppercase tracking-[2px] mb-5">Custom Software</p>
          <div class="flex flex-col lg:flex-row lg:items-start gap-8">
            <!-- Price + tagline -->
            <div class="shrink-0 lg:w-[220px]">
              <div class="flex items-baseline gap-2 mb-1.5">
                <span class="font-display text-[44px] sm:text-[54px] font-extrabold tracking-[-3px] leading-none text-(--theme-fg)">Custom</span>
              </div>
              <span class="font-mono text-[11.5px] font-bold text-(--theme-accent)/70 block mb-1">scoped per project</span>
              <span class="text-[11px] text-(--theme-text-ghost) leading-snug block">Quoted after a discovery call</span>
              <p class="text-[11.5px] text-(--theme-accent)/50 mt-5 leading-snug">
                Best for: Teams that need something built from scratch
              </p>
            </div>
            <!-- Features -->
            <div class="flex-1">
              <ul class="tier-features">
                <li>Booking Systems &amp; Customer Portals</li>
                <li>Internal Tools &amp; Admin Dashboards</li>
                <li>Automations &amp; Third-Party Integrations</li>
                <li>User Accounts &amp; Secure Login</li>
                <li>Anything That Needs a Database or Custom Logic</li>
              </ul>
            </div>
            <!-- Delivery + CTA -->
            <div class="shrink-0 flex flex-col gap-4 lg:pt-[3px]">
              <p class="font-mono text-[9px] tracking-[1.5px] text-(--theme-text-faint) uppercase border-t border-[var(--glass-card-border)] pt-4 lg:border-0 lg:pt-0">
                Delivered per scope
              </p>
              <a
                href="#contact"
                class="price-cta"
                @click="track('cta_click', { label: 'Scope My Project', location: 'pricing', package: 'Custom Software' })">
                Scope My Project →
              </a>
            </div>
          </div>
        </div>
      </div>

      <p class="mt-10 text-[12.5px] text-(--theme-text-ghost) leading-[1.85]" data-reveal>
        Every site includes managed hosting, SSL, and your domain — starting free on month one.
      </p>
    </div>
  </section>
</template>
