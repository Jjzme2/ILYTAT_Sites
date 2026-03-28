<script setup lang="ts">
import { SERVICES, formatPrice, isRecurring } from '~/utils/services'
useHead({ title: 'Pricing — ILYTAT Sites' })

const pricingFaqs = [
  {
    q: 'Are these one-time payments?',
    a: "Yes — for all design and build services. The only exception is our optional Domain & Hosting Management add-on, which is a flat monthly fee you can cancel anytime.",
  },
  {
    q: 'Do you manage my hosting or database?',
    a: "Not by default. We deliver your files and you host them wherever you like. If you'd rather not deal with that, our Domain & Hosting Management add-on covers it for a flat monthly fee.",
  },
  {
    q: 'What happens to my data?',
    a: "We don't store your customer data. For websites that need a database (forms, bookings, etc.), we recommend Firebase, Supabase, or Airtable — and we'll help you understand how to get set up.",
  },
  {
    q: 'What if I need more revisions than included?',
    a: "Additional revision rounds are available for a small fee. Most clients don't need them — we gather detailed information upfront to get it right early.",
  },
  {
    q: 'Do you offer payment plans?',
    a: "For orders over $500, we can arrange 50% upfront and 50% on delivery. Just mention it in your order notes or contact us.",
  },
  {
    q: 'What file formats do I receive?',
    a: "Depends on the service. Websites are delivered as deployable code. Print designs come as print-ready 300 DPI PDFs. Branding and social kits include PNG, SVG, PDF, and editable source files (Canva or Figma).",
  },
]
</script>

<template>
  <div class="pt-28 pb-24">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-16">
        <span class="text-orange-400 text-sm font-semibold uppercase tracking-widest mb-3 block">Pricing</span>
        <h1 class="font-display text-5xl sm:text-6xl font-bold text-white mb-4">Simple, honest pricing</h1>
        <p class="text-slate-400 text-xl max-w-xl mx-auto">
          Flat rates for design work. One optional recurring add-on if you want us to handle your hosting.
        </p>
      </div>

      <!-- Quick reference table -->
      <div class="glass border border-white/5 rounded-2xl overflow-hidden mb-16">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-white/5">
                <th class="text-left p-5 text-slate-400 font-medium text-sm">Service</th>
                <th class="text-left p-5 text-slate-400 font-medium text-sm">Starting At</th>
                <th class="text-left p-5 text-slate-400 font-medium text-sm">Billing</th>
                <th class="text-left p-5 text-slate-400 font-medium text-sm">Turnaround</th>
                <th class="p-5" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="service in SERVICES"
                :key="service.id"
                class="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
              >
                <td class="p-5">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <UIcon :name="service.icon" class="w-4 h-4 text-orange-400" />
                    </div>
                    <span class="font-medium text-white">{{ service.name }}</span>
                  </div>
                </td>
                <td class="p-5">
                  <span class="font-semibold text-orange-400">
                    {{ formatPrice(service.packages[0]?.price ?? 0) }}
                  </span>
                </td>
                <td class="p-5">
                  <span
                    :class="[
                      'text-xs font-medium px-2.5 py-1 rounded-full',
                      isRecurring(service.packages[0]?.id ?? '')
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : 'bg-green-500/10 text-green-400 border border-green-500/20',
                    ]"
                  >
                    {{ isRecurring(service.packages[0]?.id ?? '') ? 'Monthly' : 'One-time' }}
                  </span>
                </td>
                <td class="p-5 text-slate-400 text-sm">
                  {{ service.packages[0]?.turnaround }}
                </td>
                <td class="p-5 text-right">
                  <NuxtLink
                    :to="`/services/${service.slug}`"
                    class="text-sm text-orange-400 hover:text-orange-300 font-medium"
                  >
                    See packages →
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- FAQ -->
      <div class="max-w-2xl mx-auto">
        <h2 class="font-display text-3xl font-bold text-white text-center mb-10">Pricing FAQ</h2>
        <div class="space-y-4">
          <div v-for="faq in pricingFaqs" :key="faq.q" class="glass border border-white/5 rounded-xl p-6">
            <h3 class="font-semibold text-white mb-2">{{ faq.q }}</h3>
            <p class="text-slate-400 text-sm leading-relaxed">{{ faq.a }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
