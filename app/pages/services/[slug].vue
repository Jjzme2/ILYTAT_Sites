<script setup lang="ts">
import { getServiceBySlug, formatPrice } from '~/utils/services'

const route = useRoute()
const slug = route.params.slug as string
const service = getServiceBySlug(slug)

if (!service) {
  throw createError({ statusCode: 404, statusMessage: 'Service not found' })
}

useHead({ title: `${service.name} — ILYTAT Sites` })
</script>

<template>
  <div class="pt-28 pb-24">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-sm text-slate-400 mb-10">
        <NuxtLink to="/services" class="hover:text-white transition-colors">Services</NuxtLink>
        <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
        <span class="text-white">{{ service.name }}</span>
      </div>

      <!-- Hero -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
        <div>
          <div class="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-6">
            <UIcon :name="service.icon" class="w-8 h-8 text-orange-400" />
          </div>
          <h1 class="font-display text-5xl font-bold text-white mb-4">{{ service.name }}</h1>
          <p class="text-orange-400 text-xl font-medium mb-4">{{ service.tagline }}</p>
          <p class="text-slate-400 text-lg leading-relaxed mb-8">{{ service.description }}</p>

          <ul class="space-y-3 mb-8">
            <li
              v-for="feature in service.features"
              :key="feature"
              class="flex items-center gap-3 text-slate-300"
            >
              <div class="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <UIcon name="i-heroicons-check" class="w-3 h-3 text-orange-400" />
              </div>
              {{ feature }}
            </li>
          </ul>

          <div class="flex items-center gap-4">
            <span class="text-slate-400">Starting at</span>
            <span class="font-display text-3xl font-bold text-white">
              {{ formatPrice(service.packages[0]?.price ?? 0) }}
            </span>
          </div>
        </div>

        <!-- Visual placeholder -->
        <div class="glass border border-orange-500/10 rounded-3xl aspect-square flex items-center justify-center">
          <UIcon :name="service.icon" class="w-32 h-32 text-orange-500/20" />
        </div>
      </div>

      <!-- Packages -->
      <h2 class="font-display text-3xl font-bold text-white mb-8 text-center">Choose your package</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          v-for="pkg in service.packages"
          :key="pkg.id"
          :class="[
            'relative rounded-2xl p-8 border transition-all',
            pkg.popular
              ? 'bg-gradient-to-b from-orange-500/10 to-transparent border-orange-500/40'
              : 'glass border-white/5',
          ]"
        >
          <div
            v-if="pkg.popular"
            class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full"
          >
            Most Popular
          </div>

          <h3 class="font-display text-xl font-bold text-white mb-1">{{ pkg.name }}</h3>
          <p class="text-slate-400 text-sm mb-6">{{ pkg.description }}</p>

          <div class="mb-6">
            <span class="font-display text-4xl font-bold text-white">
              {{ pkg.price === 0 ? 'Free' : `$${pkg.price}` }}
            </span>
            <span v-if="pkg.price > 0" class="text-slate-400 text-sm ml-1">one-time</span>
            <div class="flex items-center gap-1.5 mt-2 text-slate-400 text-sm">
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
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              {{ feature }}
            </li>
          </ul>

          <NuxtLink
            :to="pkg.price === 0 ? '/tools/qr-code' : `/order/${service.slug}/${pkg.id}`"
            :class="[
              'block text-center py-3.5 rounded-xl font-semibold text-sm transition-all',
              pkg.popular
                ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/30 hover:-translate-y-0.5'
                : 'bg-white/5 hover:bg-white/10 text-white border border-white/10',
            ]"
          >
            {{ pkg.price === 0 ? 'Use Free Tool' : 'Get Started' }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
