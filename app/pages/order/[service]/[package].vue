<script setup lang="ts">
import { getPackageById, formatPrice } from '~/utils/services'

const route = useRoute()
const { user } = useAuth()
const toast = useToast()

const serviceSlug = route.params.service as string
const packageId = route.params.package as string

const result = getPackageById(serviceSlug, packageId)

if (!result) {
  throw createError({ statusCode: 404, statusMessage: 'Package not found' })
}

const { service, pkg } = result

useHead({ title: `Order ${service.name} — ${pkg.name} — ILYTAT Sites` })

const form = reactive({
  businessName: '',
  email: user.value?.email || '',
  name: user.value?.displayName || '',
  notes: '',
})

const loading = ref(false)

const handleOrder = async () => {
  if (!form.email || !form.name || !form.businessName) {
    toast.add({ title: 'Please fill in all required fields', color: 'error' })
    return
  }

  loading.value = true
  try {
    const res = await $fetch<{ url?: string; free?: boolean; redirect?: string }>(
      '/api/stripe/create-checkout',
      {
        method: 'POST',
        body: {
          serviceId: service.id,
          packageId: pkg.id,
          serviceName: service.name,
          packageName: pkg.name,
          price: pkg.price,
          userId: user.value?.uid,
          customerEmail: form.email,
          businessName: form.businessName,
          notes: form.notes,
        },
      },
    )

    if (res.free && res.redirect) {
      navigateTo(res.redirect)
    } else if (res.url) {
      window.location.href = res.url
    }
  } catch (e) {
    toast.add({ title: 'Something went wrong. Please try again.', color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="pt-28 pb-24">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-sm text-slate-400 mb-8">
        <NuxtLink to="/services" class="hover:text-white transition-colors">Services</NuxtLink>
        <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
        <NuxtLink :to="`/services/${service.slug}`" class="hover:text-white transition-colors">
          {{ service.name }}
        </NuxtLink>
        <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
        <span class="text-white">{{ pkg.name }}</span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <!-- Order Form -->
        <div class="lg:col-span-3">
          <h1 class="font-display text-3xl font-bold text-white mb-2">Complete Your Order</h1>
          <p class="text-slate-400 mb-8">Tell us about your business so we can get started.</p>

          <form class="space-y-5" @submit.prevent="handleOrder">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label class="text-sm text-slate-300 font-medium mb-2 block">Your Name *</label>
                <input
                  v-model="form.name"
                  type="text"
                  required
                  placeholder="Jane Smith"
                  class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-all"
                />
              </div>
              <div>
                <label class="text-sm text-slate-300 font-medium mb-2 block">Email *</label>
                <input
                  v-model="form.email"
                  type="email"
                  required
                  placeholder="jane@yourbusiness.com"
                  class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label class="text-sm text-slate-300 font-medium mb-2 block">Business Name *</label>
              <input
                v-model="form.businessName"
                type="text"
                required
                placeholder="Jane's Boutique"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-all"
              />
            </div>

            <div>
              <label class="text-sm text-slate-300 font-medium mb-2 block">
                Notes / Special Requests
                <span class="text-slate-500 font-normal">(optional)</span>
              </label>
              <textarea
                v-model="form.notes"
                rows="4"
                placeholder="Tell us about your business, preferred colors, style, or anything else that will help us create the perfect design..."
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-all resize-none"
              />
            </div>

            <div class="pt-2">
              <button
                type="submit"
                :disabled="loading"
                class="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-lg py-4 rounded-2xl transition-all shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5"
              >
                <div
                  v-if="loading"
                  class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
                />
                <template v-else>
                  <UIcon name="i-heroicons-lock-closed" class="w-5 h-5" />
                  {{ pkg.price === 0 ? 'Continue' : `Pay ${formatPrice(pkg.price)} Securely` }}
                </template>
              </button>
              <p class="text-center text-xs text-slate-500 mt-3 flex items-center justify-center gap-1.5">
                <UIcon name="i-heroicons-shield-check" class="w-3.5 h-3.5 text-slate-400" />
                Secured by Stripe. We never store your card details.
              </p>
            </div>
          </form>
        </div>

        <!-- Order Summary -->
        <div class="lg:col-span-2">
          <div class="glass border border-white/5 rounded-2xl p-6 sticky top-28">
            <h2 class="font-semibold text-white mb-5 text-lg">Order Summary</h2>

            <div class="flex items-start gap-4 pb-5 border-b border-white/5">
              <div
                class="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0"
              >
                <UIcon :name="service.icon" class="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <div class="font-semibold text-white">{{ service.name }}</div>
                <div class="text-slate-400 text-sm">{{ pkg.name }} Package</div>
                <div class="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                  <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5" />
                  {{ pkg.turnaround }}
                </div>
              </div>
            </div>

            <ul class="py-5 space-y-2.5 border-b border-white/5">
              <li
                v-for="feature in pkg.features"
                :key="feature"
                class="flex items-start gap-2 text-xs text-slate-400"
              >
                <UIcon name="i-heroicons-check" class="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                {{ feature }}
              </li>
            </ul>

            <div class="pt-5 flex items-center justify-between">
              <span class="text-slate-400">Total</span>
              <span class="font-display text-2xl font-bold text-white">
                {{ formatPrice(pkg.price) }}
              </span>
            </div>

            <div class="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start gap-2">
              <UIcon name="i-heroicons-shield-check" class="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <p class="text-xs text-green-300">
                100% satisfaction guarantee. Not happy with the result? We'll revise until you are.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
