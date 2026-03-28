<script setup lang="ts">
import { SERVICES, DATA_RECOMMENDATIONS } from '~/utils/services'

useHead({
  title: 'ILYTAT Sites — Websites & Marketing for Local Businesses',
})

const featuredServices = SERVICES.slice(0, 4)

const howItWorks = [
  {
    title: 'Pick Your Service',
    description:
      "Browse our services and choose the package that fits. Not sure? Reach out and we'll point you in the right direction.",
    gradient: 'from-orange-500 to-orange-600',
  },
  {
    title: 'Tell Us About Your Business',
    description:
      'Share your brand details — colors, style, goals. The more context you give us, the better the result.',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    title: 'We Deliver Your Files',
    description:
      'We design and build, then hand everything off to you. You own it completely — host it anywhere, change it anytime.',
    gradient: 'from-orange-600 to-red-500',
  },
]

const whyUs = [
  {
    icon: 'i-heroicons-folder-arrow-down',
    title: 'You Own Everything',
    description:
      'Every file, every line of code — it\'s yours. No lock-in, no ongoing fees unless you choose them.',
  },
  {
    icon: 'i-heroicons-currency-dollar',
    title: 'Transparent Pricing',
    description:
      'One-time flat rates. No hourly billing, no retainers, no surprise invoices.',
  },
  {
    icon: 'i-heroicons-bolt',
    title: 'Built for Small Business',
    description:
      'We focus on what actually helps local businesses — practical, fast, and built to be used by real people.',
  },
  {
    icon: 'i-heroicons-shield-check',
    title: 'Revisions Until You\'re Happy',
    description:
      'Every package includes revision rounds. We don\'t close an order until the result is something you\'re proud of.',
  },
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative min-h-screen flex items-center overflow-hidden animated-gradient noise">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(249,115,22,0.15),transparent)]" />
      <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 z-10">
        <div class="max-w-4xl mx-auto text-center">
          <!-- Badge -->
          <div class="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 mb-8">
            <span class="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            <span class="text-orange-300 text-sm font-medium">Design · Branding · Marketing Materials</span>
          </div>

          <h1 class="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Your business deserves
            <span class="gradient-text block">a great first impression.</span>
          </h1>

          <p class="text-slate-300 text-xl sm:text-2xl leading-relaxed max-w-2xl mx-auto mb-10">
            Websites, fliers, QR codes, and branding for small and local businesses.
            <span class="text-white font-medium">We build it. You own it.</span>
          </p>

          <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <NuxtLink
              to="/services"
              class="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all duration-200 shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-1 w-full sm:w-auto justify-center"
            >
              See Services & Pricing
              <UIcon name="i-heroicons-arrow-right" class="w-5 h-5" />
            </NuxtLink>
            <NuxtLink
              to="/tools/qr-code"
              class="inline-flex items-center gap-2 glass text-white font-semibold text-lg px-8 py-4 rounded-2xl transition-all duration-200 hover:-translate-y-1 hover:bg-white/10 w-full sm:w-auto justify-center border border-white/10"
            >
              <UIcon name="i-heroicons-qr-code" class="w-5 h-5 text-orange-400" />
              Free QR Generator
            </NuxtLink>
          </div>

          <!-- Key differentiators -->
          <div class="mt-14 flex flex-wrap items-center justify-center gap-6">
            <div
              v-for="item in ['Flat-rate pricing', 'You own the files', 'No lock-in', 'Revisions included']"
              :key="item"
              class="flex items-center gap-2 text-slate-400 text-sm"
            >
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-orange-400" />
              {{ item }}
            </div>
          </div>
        </div>
      </div>

      <!-- Scroll indicator -->
      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500 animate-bounce">
        <span class="text-xs uppercase tracking-widest">Scroll</span>
        <UIcon name="i-heroicons-chevron-down" class="w-4 h-4" />
      </div>
    </section>

    <!-- Services Preview -->
    <section class="py-24 px-4 sm:px-6 lg:px-8">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-16">
          <span class="text-orange-400 text-sm font-semibold uppercase tracking-widest mb-3 block">What We Offer</span>
          <h2 class="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
            Everything your business needs
          </h2>
          <p class="text-slate-400 text-lg max-w-2xl mx-auto">
            From a first website to a full rebrand — practical, professional, and priced for real small businesses.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NuxtLink
            v-for="service in featuredServices"
            :key="service.id"
            :to="`/services/${service.slug}`"
            class="group relative glass border border-white/5 rounded-2xl p-8 hover:border-orange-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-orange-500/10"
          >
            <div class="flex items-start gap-5">
              <div class="w-14 h-14 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/20 transition-colors">
                <UIcon :name="service.icon" class="w-7 h-7 text-orange-400" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-4 mb-2">
                  <h3 class="font-display text-xl font-bold text-white group-hover:text-orange-100 transition-colors">
                    {{ service.name }}
                  </h3>
                  <span class="text-slate-500 text-sm flex-shrink-0">
                    from {{ service.packages[0]?.price === 0 ? 'Free' : `$${service.packages[0]?.price}` }}
                  </span>
                </div>
                <p class="text-slate-400 text-sm leading-relaxed mb-4">
                  {{ service.description }}
                </p>
                <ul class="flex flex-wrap gap-2">
                  <li
                    v-for="feature in service.features.slice(0, 3)"
                    :key="feature"
                    class="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 rounded-full px-3 py-1"
                  >
                    <UIcon name="i-heroicons-check" class="w-3 h-3 text-orange-400" />
                    {{ feature }}
                  </li>
                </ul>
              </div>
            </div>
            <div class="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
              <UIcon name="i-heroicons-arrow-right" class="w-5 h-5 text-orange-400" />
            </div>
          </NuxtLink>
        </div>

        <div class="text-center mt-10">
          <NuxtLink to="/services" class="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 font-semibold transition-colors">
            View all services & pricing
            <UIcon name="i-heroicons-arrow-right" class="w-4 h-4" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900/50">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-16">
          <span class="text-orange-400 text-sm font-semibold uppercase tracking-widest mb-3 block">The Process</span>
          <h2 class="font-display text-4xl sm:text-5xl font-bold text-white mb-4">Simple as 1, 2, 3</h2>
          <p class="text-slate-400 text-lg max-w-xl mx-auto">
            No confusing processes or mystery timelines. Here's exactly how it works.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div v-for="(step, i) in howItWorks" :key="step.title" class="relative flex flex-col items-center text-center">
            <div
              v-if="i < 2"
              class="hidden md:block absolute top-10 left-[60%] right-0 h-px bg-gradient-to-r from-orange-500/40 to-transparent"
            />
            <div
              class="w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-6 text-2xl font-display font-bold text-white shadow-xl"
              :class="step.gradient"
            >
              {{ i + 1 }}
            </div>
            <h3 class="font-display text-xl font-bold text-white mb-3">{{ step.title }}</h3>
            <p class="text-slate-400 leading-relaxed">{{ step.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Why Us -->
    <section class="py-24 px-4 sm:px-6 lg:px-8">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-16">
          <span class="text-orange-400 text-sm font-semibold uppercase tracking-widest mb-3 block">Why ILYTAT Sites</span>
          <h2 class="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
            Built differently, on purpose
          </h2>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="item in whyUs"
            :key="item.title"
            class="glass border border-white/5 rounded-2xl p-6 text-center"
          >
            <div class="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
              <UIcon :name="item.icon" class="w-6 h-6 text-orange-400" />
            </div>
            <h3 class="font-semibold text-white mb-2">{{ item.title }}</h3>
            <p class="text-slate-400 text-sm leading-relaxed">{{ item.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Data Persistence Transparency -->
    <section class="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/50">
      <div class="max-w-5xl mx-auto">
        <div class="glass border border-white/5 rounded-3xl p-10">
          <div class="flex items-start gap-5 mb-8">
            <div class="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-heroicons-information-circle" class="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 class="font-display text-2xl font-bold text-white mb-2">A note on data & hosting</h2>
              <p class="text-slate-400 leading-relaxed">
                We build and deliver your site or materials — but we don't manage your customer data or hosting infrastructure.
                That keeps costs low and puts you in full control. If your project needs a database or a place to live online,
                we'll recommend the right tools and walk you through getting set up. Or you can add our optional
                <NuxtLink to="/services/managed-hosting" class="text-orange-400 hover:text-orange-300 font-medium">Domain & Hosting Management</NuxtLink>
                service and we'll handle it for a flat monthly fee.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              v-for="tool in DATA_RECOMMENDATIONS"
              :key="tool.name"
              class="bg-white/3 border border-white/5 rounded-xl p-4"
            >
              <div class="font-semibold text-white text-sm mb-1">{{ tool.name }}</div>
              <div class="text-xs text-slate-500 mb-2">{{ tool.pricing }}</div>
              <p class="text-xs text-slate-400 leading-relaxed">{{ tool.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-16 px-4 sm:px-6 lg:px-8">
      <div class="max-w-5xl mx-auto">
        <div class="relative rounded-3xl overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 p-12 text-center shadow-2xl shadow-orange-500/30">
          <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:30px_30px]" />
          <div class="relative z-10">
            <h2 class="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
              Let's build something together.
            </h2>
            <p class="text-orange-100 text-lg mb-8 max-w-xl mx-auto">
              Have a project in mind? Questions about what you need? We're easy to reach and happy to help — no sales pressure.
            </p>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
              <NuxtLink
                to="/contact"
                class="inline-flex items-center gap-2 bg-white text-orange-600 font-bold text-lg px-8 py-4 rounded-2xl hover:bg-orange-50 transition-colors shadow-xl w-full sm:w-auto justify-center"
              >
                Get in Touch
                <UIcon name="i-heroicons-arrow-right" class="w-5 h-5" />
              </NuxtLink>
              <NuxtLink
                to="/services"
                class="inline-flex items-center gap-2 border-2 border-white/40 text-white font-semibold text-lg px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors w-full sm:w-auto justify-center"
              >
                Browse Services
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
