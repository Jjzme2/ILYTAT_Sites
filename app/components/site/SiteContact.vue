<script setup lang="ts">
import { watch } from 'vue'
import { siteConfig } from '~/config/site.config'
import { siteContent } from '~/utils/siteContent'
import { useContactForm } from '~/composables/useContactForm'

// When a visitor clicks a service row, the parent passes the service name here
// so the Package Interest select can be pre-populated on their behalf.
const props = defineProps<{ prefilledService?: string }>()

// Build-time constant — tree-shaken to `false` in production bundles.
const isDev = import.meta.dev

const { packages } = siteConfig
const { pricing, packagePrice, formatPrice } = usePricing()
const { form, submitting, submitted, handleSubmit } = useContactForm()

watch(() => props.prefilledService, (name) => {
  if (name) form.service = name
})
</script>

<template>
  <section id="contact" class="bg-[var(--theme-surface-alt)] section-layer px-4 py-16 md:px-6 md:py-20 lg:px-12 lg:py-[100px]">
    <div class="max-w-[1200px] mx-auto grid grid-cols-1 gap-12 items-start lg:grid-cols-[360px_1fr] lg:gap-20">

      <!-- Left: contact details + promise list -->
      <div data-reveal>
        <div class="flex items-center gap-4 mb-6">
          <div class="crack-line w-8 flex-shrink-0" />
          <p class="eyebrow mb-0">Free Audit</p>
        </div>
        <h2 class="font-display text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-2px] text-(--theme-fg) mb-4 leading-[1.05]">
          Book a free<br /><em class="font-headline italic text-(--theme-accent)">audit</em>
        </h2>
        <p class="text-[14px] text-(--theme-text-body) leading-[1.9] mb-8">
          Tell me about your business. I'll look it over and get back to you within 24 hours with honest feedback — no sales pressure.
        </p>
        <ul class="flex flex-col gap-3.5">
          <li
            v-for="promise in ['Free audit, no obligation', 'Response within 24 hours', 'You own everything I build']"
            :key="promise"
            class="flex items-center gap-3 text-[13px] text-(--theme-text-body)">
            <span
              class="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0 border border-[var(--theme-accent)]/20">
              <span class="w-1.5 h-1.5 bg-[var(--theme-accent)] opacity-40" style="clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" />
            </span>
            {{ promise }}
          </li>
        </ul>
        <div class="mt-8 pt-6 border-t border-[var(--glass-card-border)]">
          <p class="font-mono text-[9px] tracking-[2.5px] uppercase mb-3 text-(--theme-text-ghost)">Prefer to call or text?</p>
          <a
            :href="siteContent.contact.phoneHref"
            class="text-[15px] font-semibold text-(--theme-fg) hover:text-(--theme-accent) transition-colors duration-200 no-underline">
            {{ siteContent.contact.phone }}
          </a>
        </div>
      </div>

      <!-- Right: form card — crack panel -->
      <div class="crack-wrap" data-reveal data-reveal-delay="100">
      <div class="crack-inner crack-inner-lg glass-deep p-6 lg:p-9">
        <div v-if="submitted" class="flex flex-col items-center py-16 px-6 text-center">
          <div
            class="w-12 h-12 flex items-center justify-center text-(--theme-accent) mb-6 border border-[var(--theme-accent)]/25 bg-[var(--theme-accent)]/[0.05]">
            <UIcon name="i-heroicons-check" class="w-5 h-5" />
          </div>
          <p class="font-display text-[20px] font-bold text-(--theme-fg) mb-2 tracking-[-0.5px]">Message received.</p>
          <p class="text-[13px] text-(--theme-text-body)">I'll be in touch within 24 hours.</p>
        </div>

        <form v-else class="flex flex-col gap-4" @submit.prevent="handleSubmit">
          <!--
            Honeypot — visually hidden from real users via off-screen positioning.
            NOT using display:none or visibility:hidden because some bots skip those.
            If this field contains any value the server will silently discard the submission.
          -->
          <div class="absolute -left-[9999px] -top-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
            <label for="hp_website">Website</label>
            <input
              id="hp_website"
              v-model="form.honeypot"
              name="website"
              type="text"
              tabindex="-1"
              autocomplete="off"
            >
          </div>
          <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div class="fgroup">
              <label>Your Name</label>
              <input v-model="form.name" type="text" placeholder="Jane Smith" minlength="2" required>
            </div>
            <div class="fgroup">
              <label>Business Name</label>
              <input v-model="form.businessName" type="text" placeholder="Jane's Bakery" required>
            </div>
          </div>
          <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div class="fgroup">
              <label>Email <span class="text-(--theme-accent)/40 normal-case tracking-normal not-italic">*</span></label>
              <input v-model="form.email" type="email" placeholder="jane@email.com" required>
            </div>
            <div class="fgroup">
              <label>Phone <span class="text-(--theme-text-faint) normal-case tracking-normal">(optional)</span></label>
              <input v-model="form.phone" type="tel" placeholder="(815) 555-1234">
            </div>
          </div>
          <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div class="fgroup">
              <label for="form-service">Package Interest</label>
              <div class="select-wrap">
                <select id="form-service" v-model="form.service">
                  <option value="">Select a package…</option>
                  <option v-for="pkg in packages" :key="pkg.name" :value="`${pkg.name} — ${packagePrice(pkg.name)}`">
                    {{ pkg.name }} — {{ packagePrice(pkg.name) }}
                  </option>
                  <option value="Not sure yet">Not sure yet</option>
                </select>
                <UIcon name="i-heroicons-chevron-down" class="select-arrow w-4 h-4" />
              </div>
            </div>
            <div v-if="form.service && form.service !== 'Not sure yet'" class="fgroup">
              <label for="form-billing">Billing Preference</label>
              <div class="select-wrap">
                <select id="form-billing" v-model="form.billingPreference">
                  <option value="monthly">Monthly ({{ formatPrice(pricing.standardHosting) }}/mo)</option>
                  <option value="yearly">Yearly ($799/yr) — Save $269</option>
                </select>
                <UIcon name="i-heroicons-chevron-down" class="select-arrow w-4 h-4" />
              </div>
            </div>
          </div>
          <div class="fgroup">
            <label>Tell me about your business</label>
            <textarea
              v-model="form.message"
              rows="5"
              placeholder="What do you do? Do you have an existing website? What matters most to you?"
              minlength="10"
              required />
          </div>
          <!-- Cloudflare Turnstile — challenges bots before the form can be submitted.
               Hidden in dev mode; the server skips verification when NODE_ENV !== production. -->
          <Turnstile v-if="!isDev" v-model="form.cfTurnstileToken" class="self-start" />

          <button type="submit" class="submit-btn" :disabled="submitting || (!isDev && !form.cfTurnstileToken)">
            {{ submitting ? 'Sending…' : 'Send Message →' }}
          </button>
        </form>
      </div>
      </div><!-- /crack-wrap -->

    </div>
  </section>
</template>
