<script setup lang="ts">
import { watch } from 'vue'
import { siteConfig } from '~/config/site.config'
import { useContactForm } from '~/composables/useContactForm'

// When a visitor clicks a service row, the parent passes the service name here
// so the Package Interest select can be pre-populated on their behalf.
const props = defineProps<{ prefilledService?: string }>()

const { packages, monthlyRate } = siteConfig
const { form, submitting, submitted, handleSubmit } = useContactForm()

watch(() => props.prefilledService, (name) => {
  if (name) form.service = name
})
</script>

<template>
  <section id="contact" class="bg-[var(--theme-surface-alt)] section-layer px-12 py-[100px] md:px-6 md:py-20 sm:px-4 sm:py-16">
    <div class="max-w-[1080px] mx-auto grid grid-cols-1 gap-12 items-start lg:grid-cols-[360px_1fr] lg:gap-20">

      <!-- Left: contact details + promise list -->
      <div data-reveal>
        <div class="flex items-center gap-4 mb-6">
          <div class="crack-line w-8 flex-shrink-0" />
          <p class="eyebrow mb-0">Get in touch</p>
        </div>
        <h2 class="font-display text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-2px] text-[var(--theme-text)] mb-4 leading-[1.05]">
          Book a free<br /><em class="font-headline italic text-[var(--theme-accent)]">consultation</em>
        </h2>
        <p class="text-[14px] text-[var(--theme-text-body)] leading-[1.9] mb-8">
          Tell me about your business. I'll review it and get back to you within 24 hours. No sales pressure — just a straight conversation.
        </p>
        <ul class="flex flex-col gap-3.5">
          <li
            v-for="promise in ['Free quote, no obligation', 'Response within 24 hours', 'You own everything we build']"
            :key="promise"
            class="flex items-center gap-3 text-[13px] text-[var(--theme-text-body)]">
            <span
              class="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0 border border-[var(--theme-accent)]/20"
              style="clip-path: polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))">
              <span class="w-1.5 h-1.5 bg-[var(--theme-accent)] opacity-40" style="clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" />
            </span>
            {{ promise }}
          </li>
        </ul>
      </div>

      <!-- Right: form card — crack panel -->
      <div class="crack-wrap" data-reveal data-reveal-delay="100">
      <div class="crack-inner crack-inner-lg glass-deep p-9 sm:p-6">
        <div v-if="submitted" class="flex flex-col items-center py-16 px-6 text-center">
          <div
            class="w-12 h-12 flex items-center justify-center text-[var(--theme-accent)] mb-6 border border-[var(--theme-accent)]/25 bg-[var(--theme-accent)]/[0.05]"
            style="clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))">
            <UIcon name="i-heroicons-check" class="w-5 h-5" />
          </div>
          <p class="font-display text-[20px] font-bold text-[var(--theme-text)] mb-2 tracking-[-0.5px]">Message received.</p>
          <p class="text-[13px] text-[var(--theme-text-body)]">I'll be in touch within 24 hours.</p>
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
              <label>Email <span class="text-[#f5c518]/40 normal-case tracking-normal not-italic">*</span></label>
              <input v-model="form.email" type="email" placeholder="jane@email.com" required>
            </div>
            <div class="fgroup">
              <label>Phone <span class="text-[#2d2d38] normal-case tracking-normal">(optional)</span></label>
              <input v-model="form.phone" type="tel" placeholder="(815) 555-1234">
            </div>
          </div>
          <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div class="fgroup">
              <label>Package Interest</label>
              <div class="select-wrap">
                <select v-model="form.service">
                  <option value="">Select a package…</option>
                  <option v-for="pkg in packages" :key="pkg.name" :value="`${pkg.name} — ${pkg.price}`">
                    {{ pkg.name }} — {{ pkg.price }}
                  </option>
                  <option value="Not sure yet">Not sure yet</option>
                </select>
                <UIcon name="i-heroicons-chevron-down" class="select-arrow w-4 h-4" />
              </div>
            </div>
            <div v-if="form.service && form.service !== 'Not sure yet'" class="fgroup">
              <label>Billing Preference</label>
              <div class="select-wrap">
                <select v-model="form.billingPreference">
                  <option value="monthly">Monthly ({{ monthlyRate }}/mo)</option>
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
               v-model binds the verified token; the server rejects submissions with no token. -->
          <Turnstile v-model="form.cfTurnstileToken" class="self-start" />

          <button type="submit" class="submit-btn" :disabled="submitting || !form.cfTurnstileToken">
            {{ submitting ? 'Sending…' : 'Send Message →' }}
          </button>
        </form>
      </div>
      </div><!-- /crack-wrap -->

    </div>
  </section>
</template>
