<script setup lang="ts">
useHead({ title: 'Order Confirmed — ILYTAT Sites' })

const route = useRoute()
const sessionId = route.query.session_id as string

const { data: session, pending } = await useFetch('/api/stripe/session', {
  query: { session_id: sessionId },
  lazy: true,
})

const nextSteps = [
  {
    title: "We'll reach out within 24 hours",
    description: 'Our team will contact you by email to introduce ourselves and gather any additional details.',
  },
  {
    title: 'Design begins',
    description: "We'll start crafting your materials based on your brief. You can track progress in your dashboard.",
  },
  {
    title: 'Review & revise',
    description: "You'll receive drafts to review. Request any changes and we'll refine until it's perfect.",
  },
  {
    title: 'Final delivery',
    description: 'Final files are uploaded to your dashboard for download. All formats included.',
  },
]
</script>

<template>
  <div class="pt-32 pb-24 min-h-screen flex items-center">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 text-center w-full">
      <div v-if="pending" class="flex justify-center">
        <div class="w-12 h-12 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>

      <template v-else>
        <!-- Success icon -->
        <div class="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-8">
          <UIcon name="i-heroicons-check-circle" class="w-12 h-12 text-green-400" />
        </div>

        <h1 class="font-display text-5xl font-bold text-white mb-4">You're all set! 🎉</h1>
        <p class="text-slate-400 text-xl mb-2">
          Your order has been confirmed and payment received.
        </p>
        <p class="text-slate-500 mb-10">
          We'll reach out to
          <span class="text-white">{{ session?.customerEmail }}</span>
          within 1 business day to get started.
        </p>

        <div class="glass border border-white/5 rounded-2xl p-8 text-left mb-10">
          <h2 class="font-semibold text-white mb-5">What happens next?</h2>
          <ol class="space-y-5">
            <li
              v-for="(step, i) in nextSteps"
              :key="step.title"
              class="flex items-start gap-4"
            >
              <div class="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm flex-shrink-0">
                {{ i + 1 }}
              </div>
              <div>
                <div class="font-semibold text-white text-sm">{{ step.title }}</div>
                <div class="text-slate-400 text-sm mt-0.5">{{ step.description }}</div>
              </div>
            </li>
          </ol>
        </div>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <NuxtLink
            to="/dashboard"
            class="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold px-8 py-4 rounded-2xl transition-all hover:-translate-y-0.5 shadow-xl shadow-orange-500/30"
          >
            View My Dashboard
            <UIcon name="i-heroicons-arrow-right" class="w-5 h-5" />
          </NuxtLink>
          <NuxtLink
            to="/"
            class="text-slate-400 hover:text-white transition-colors font-medium"
          >
            Back to Home
          </NuxtLink>
        </div>
      </template>
    </div>
  </div>
</template>
