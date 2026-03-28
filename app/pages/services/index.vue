<script setup lang="ts">
import { SERVICES, formatPrice, isRecurring } from '~/utils/services'

useHead({ title: 'Services & Pricing — ILYTAT Sites' })

const activeCategory = ref<string>('all')
const categories = [
  { id: 'all', label: 'All Services' },
  { id: 'web', label: 'Web' },
  { id: 'print', label: 'Print' },
  { id: 'digital', label: 'Digital' },
]

const filtered = computed(() =>
  activeCategory.value === 'all'
    ? SERVICES
    : SERVICES.filter((s) => s.category === activeCategory.value),
)
</script>

<template>
  <div class="pt-28 pb-24">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="text-center mb-16">
        <span class="text-orange-400 text-sm font-semibold uppercase tracking-widest mb-3 block">
          Services & Pricing
        </span>
        <h1 class="font-display text-5xl sm:text-6xl font-bold text-white mb-4">
          Pick your package
        </h1>
        <p class="text-slate-400 text-xl max-w-2xl mx-auto">
          Flat-rate pricing. No hourly billing. No surprises. Everything is delivered to you as files you own.
        </p>
      </div>

      <!-- Category filter -->
      <div class="flex items-center justify-center gap-2 mb-12 flex-wrap">
        <button
          v-for="cat in categories"
          :key="cat.id"
          :class="[
            'px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
            activeCategory === cat.id
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10',
          ]"
          @click="activeCategory = cat.id"
        >
          {{ cat.label }}
        </button>
      </div>

      <!-- Services -->
      <div class="space-y-16">
        <div v-for="service in filtered" :key="service.id">
          <!-- Service header -->
          <div class="flex items-start gap-5 mb-8">
            <div class="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
              <UIcon :name="service.icon" class="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <h2 class="font-display text-3xl font-bold text-white mb-2">{{ service.name }}</h2>
              <p class="text-slate-400 text-lg">{{ service.description }}</p>
            </div>
          </div>

          <!-- Packages grid -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              v-for="pkg in service.packages"
              :key="pkg.id"
              :class="[
                'relative rounded-2xl p-8 border transition-all duration-200',
                pkg.popular
                  ? 'bg-gradient-to-b from-orange-500/10 to-orange-600/5 border-orange-500/40 shadow-xl shadow-orange-500/10'
                  : 'glass border-white/5 hover:border-orange-500/20',
              ]"
            >
              <div
                v-if="pkg.popular"
                class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg shadow-orange-500/30"
              >
                Most Popular
              </div>

              <div class="mb-6">
                <h3 class="font-display text-xl font-bold text-white mb-1">{{ pkg.name }}</h3>
                <p class="text-slate-400 text-sm">{{ pkg.description }}</p>
              </div>

              <div class="mb-6">
                <div class="flex items-end gap-1">
                  <span class="font-display text-4xl font-bold text-white">
                    {{ pkg.price === 0 ? 'Free' : `$${pkg.price}` }}
                  </span>
                  <span v-if="pkg.price > 0" class="text-slate-400 text-sm mb-1">
                    {{ isRecurring(pkg.id) ? '/mo' : 'one-time' }}
                  </span>
                </div>
                <div class="flex items-center gap-1.5 mt-1.5 text-slate-400 text-sm">
                  <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5 text-orange-400" />
                  {{ pkg.turnaround }}
                </div>
              </div>

              <ul class="space-y-2.5 mb-8">
                <li
                  v-for="feature in pkg.features"
                  :key="feature"
                  class="flex items-start gap-2.5 text-sm text-slate-300"
                >
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5"
                  />
                  {{ feature }}
                </li>
              </ul>

              <NuxtLink
                :to="pkg.price === 0 ? '/tools/qr-code' : `/order/${service.slug}/${pkg.id}`"
                :class="[
                  'block text-center py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-200',
                  pkg.popular
                    ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5'
                    : 'bg-white/5 hover:bg-white/10 text-white border border-white/10',
                ]"
              >
                {{ pkg.price === 0 ? 'Use Free Tool' : isRecurring(pkg.id) ? 'Get Started' : 'Order Now' }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom CTA -->
      <div class="mt-20 text-center glass border border-white/5 rounded-3xl p-12">
        <h2 class="font-display text-3xl font-bold text-white mb-3">Not sure what you need?</h2>
        <p class="text-slate-400 text-lg mb-8">
          Tell us about your business and we'll suggest the right starting point. No commitment required.
        </p>
        <NuxtLink
          to="/contact"
          class="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold px-8 py-4 rounded-2xl transition-all hover:-translate-y-0.5 shadow-xl shadow-orange-500/30"
        >
          Ask Us Anything
          <UIcon name="i-heroicons-arrow-right" class="w-5 h-5" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
