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

const { packages, monthlyRate, subscriptions } = siteConfig
const { billingCycle, hostingTier, checkoutLoading, startCheckout } = useCheckout()
const { track } = useAnalytics()

// Derive the displayed hosting rate from the selected tier — prevents
// showing a hardcoded $89 when premium ($149) is actively selected.
const hostingMonthlyRate = computed(() =>
  hostingTier.value === 'premium'
    ? `$${subscriptions.PREMIUM_HOSTING.price}`
    : monthlyRate
)
const hostingYearlyRate = computed(() =>
  hostingTier.value === 'premium'
    ? `$${subscriptions.PREMIUM_HOSTING_YEARLY.price}/yr`
    : `$${subscriptions.STANDARD_HOSTING_YEARLY.price}/yr`
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
    <div class="relative max-w-[1080px] mx-auto px-12 py-[100px] md:px-6 md:py-20 sm:px-4 sm:py-16">
      <header class="mb-14" data-reveal>
        <p class="eyebrow">Pricing</p>
        <h2
          class="font-display text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-2px] text-[#f0ece6] leading-[1.05] mt-2">
          One build price.<br />
          <em class="font-headline italic text-[#f5c518]">One monthly rate.</em>
        </h2>
        <p class="text-[14px] text-[#6a6761] mt-4 leading-[1.85]">
          Pick your package — then {{ hostingMonthlyRate }}/month covers everything else.
        </p>
      </header>

      <!-- Global controls: billing cycle + hosting tier -->
      <div class="flex flex-wrap items-center gap-6 mb-12" data-reveal>
        <!-- Billing cycle toggle -->
        <div class="flex items-center gap-3">
          <span class="font-mono text-[10px] tracking-[1.5px] uppercase transition-colors duration-200"
            :class="billingCycle === 'monthly' ? 'text-[#c8c4be]' : 'text-[#333040]'">Monthly</span>
          <button
            class="relative w-10 h-[22px] rounded-full transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-[#f5c518]/20"
            :class="billingCycle === 'yearly' ? 'bg-[#f5c518]' : 'bg-[#1a1a20]'"
            :aria-label="billingCycle === 'yearly' ? 'Switch to monthly' : 'Switch to yearly'"
            @click="billingCycle = billingCycle === 'monthly' ? 'yearly' : 'monthly'">
            <span
              class="absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
              :class="billingCycle === 'yearly' ? 'translate-x-[18px]' : 'translate-x-0'" />
          </button>
          <span class="font-mono text-[10px] tracking-[1.5px] uppercase transition-colors duration-200"
            :class="billingCycle === 'yearly' ? 'text-[#c8c4be]' : 'text-[#333040]'">
            Yearly
            <span
              class="ml-1.5 font-mono text-[8.5px] font-bold text-[#0f0f11] bg-[#f5c518] px-1.5 py-0.5 rounded-sm uppercase tracking-[0.5px]">Save
              2 months</span>
          </span>
        </div>

        <!-- Hosting tier selector -->
        <div class="flex items-center gap-2">
          <span class="font-mono text-[9px] uppercase text-[#4e4843] tracking-[1.5px]">Hosting:</span>
          <button class="font-mono text-[9px] uppercase transition-colors px-2 py-1"
            :class="hostingTier === 'standard' ? 'text-[#f5c518] border border-[#f5c518]/20 rounded-sm' : 'text-[#4e4843] hover:text-[#6e6b5f]'"
            @click="hostingTier = 'standard'">Standard</button>
          <span class="text-[#4e4843] text-[9px]">/</span>
          <button class="font-mono text-[9px] uppercase transition-colors px-2 py-1"
            :class="hostingTier === 'premium' ? 'text-[#f5c518] border border-[#f5c518]/20 rounded-sm' : 'text-[#4e4843] hover:text-[#6e6b5f]'"
            @click="hostingTier = 'premium'">Premium</button>
        </div>
      </div>

      <!-- Pricing cards -->
      <div class="grid grid-cols-1 gap-4 items-start sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="(pkg, i) in packages" :key="pkg.name"
          class="glass-deep rounded-sm px-5 py-7 sm:px-7 sm:py-9 relative transition-[border-color,transform] duration-300 hover:-translate-y-1"
          :class="pkg.featured ? 'price-card-featured' : 'hover:border-white/[0.13]'" data-reveal
          :data-reveal-delay="i * 100">
          <div v-if="pkg.featured"
            class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#f5c518] to-transparent" />
          <div v-if="pkg.featured"
            class="absolute top-4 right-5 font-mono text-[8px] font-bold text-[#f5c518]/70 uppercase tracking-[2px]">
            Most Popular
          </div>
          <p class="font-mono text-[9px] text-[#333040] uppercase tracking-[2px] mb-5">{{ pkg.name }}</p>
          <div class="flex flex-col items-start mb-1.5">
            <span v-if="pkg.includeStartingAt"
              class="font-mono text-[9px] text-[#f5c518] uppercase tracking-[1px] mb-1">Starting at</span>
            <div class="flex items-baseline gap-2">
              <span
                class="font-display text-[44px] sm:text-[54px] font-extrabold tracking-[-3px] leading-none text-[#f0ece6]">{{
                  pkg.price }}</span>
              <span class="text-[12px] text-[#333040]">{{ pkg.note }}</span>
            </div>
          </div>
          <div class="flex flex-col gap-1 mb-6 pb-6 border-b border-white/[0.05]">
            <span v-if="billingCycle === 'monthly'" class="font-mono text-[11.5px] font-bold text-[#f5c518]/70">
              then {{ hostingMonthlyRate }}/mo hosting
            </span>
            <span v-else class="font-mono text-[11.5px] font-bold text-[#f5c518]/70">
              {{ hostingYearlyRate }} hosting
              <span class="text-[#333040] font-normal text-[10px]">· save 2 months</span>
            </span>
            <span class="text-[11px] text-[#333040] leading-snug">First 30 days free — hosting, SSL &amp; domain
              included</span>
          </div>
          <p class="text-[11.5px] text-[#f5c518]/50 mb-5 leading-snug">Best for: {{ pkg.best }}</p>
          <ul class="tier-features">
            <li v-for="f in pkg.features" :key="f">{{ f }}</li>
          </ul>
          <p
            class="font-mono text-[9px] tracking-[1.5px] text-[#222028] uppercase mt-5 mb-5 border-t border-white/[0.05] pt-4">
            Delivered in {{ pkg.delivery }}
          </p>
          <button class="price-cta" :class="{ 'price-cta-featured': pkg.featured }" :disabled="checkoutLoading !== null"
            @click="startCheckout(pkg)">
            <span v-if="checkoutLoading === pkg.name" class="flex items-center justify-center gap-2">
              <svg class="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
              </svg>
              Redirecting…
            </span>
            <template v-else>
              <span v-if="pkg.includeStartingAt" @click="navigateTo('#contact')" class="cursor-pointer">
                Let's talk
              </span>
              <span v-else>
                Buy Now
              </span>
            </template>
          </button>
        </div>
      </div>

      <p class="mt-10 text-[12.5px] text-[#333040] leading-[1.85]" data-reveal>
        Every site includes managed hosting, SSL, and your domain — starting free on month one.
      </p>
    </div>
  </section>
</template>
