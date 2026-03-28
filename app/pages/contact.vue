<script setup lang="ts">
import { SERVICES } from '~/utils/services'

useHead({ title: 'Contact Us — ILYTAT Sites' })

const toast = useToast()
const loading = ref(false)
const submitted = ref(false)

const form = reactive({
  name: '',
  email: '',
  businessName: '',
  phone: '',
  service: '',
  message: '',
})

const serviceOptions = [
  { label: 'Not sure yet — just exploring', value: 'general' },
  ...SERVICES.map((s) => ({ label: s.name, value: s.slug })),
  { label: 'Custom / Other', value: 'custom' },
]

const handleSubmit = async () => {
  loading.value = true
  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: form,
    })
    submitted.value = true
  } catch (e) {
    toast.add({ title: 'Something went wrong. Please try again.', color: 'error' })
  } finally {
    loading.value = false
  }
}

const contactInfo = [
  { icon: 'i-heroicons-envelope', label: 'Email', value: 'hello@ilytat.com' },
  { icon: 'i-heroicons-clock', label: 'Hours', value: 'Mon–Fri, 9am–6pm CST' },
  { icon: 'i-heroicons-chat-bubble-left-ellipsis', label: 'Response time', value: 'Within 1 business day' },
]

const faqs = [
  {
    q: 'How long does a website take?',
    a: 'Starter websites are ready in 5–7 business days. Professional sites take 7–10 days.',
  },
  {
    q: 'Do I need to provide any content?',
    a: "It helps if you have text and photos ready, but we can guide you through what's needed.",
  },
  {
    q: 'Can I make changes after delivery?',
    a: 'Yes! Each package includes revision rounds. After that, we offer ongoing support plans.',
  },
]
</script>

<template>
  <div class="pt-28 pb-24">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        <!-- Left: Info -->
        <div>
          <span class="text-orange-400 text-sm font-semibold uppercase tracking-widest mb-3 block">
            Get in Touch
          </span>
          <h1 class="font-display text-5xl font-bold text-white mb-5 leading-tight">
            Let's talk about your business
          </h1>
          <p class="text-slate-400 text-lg leading-relaxed mb-10">
            Whether you know exactly what you need or just want to explore your options — we're
            here to help, no pressure.
          </p>

          <div class="space-y-5 mb-10">
            <div
              v-for="item in contactInfo"
              :key="item.title"
              class="flex items-center gap-4"
            >
              <div
                class="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0"
              >
                <UIcon :name="item.icon" class="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <div class="text-slate-500 text-xs uppercase tracking-wider mb-0.5">
                  {{ item.label }}
                </div>
                <div class="text-white font-medium">{{ item.value }}</div>
              </div>
            </div>
          </div>

          <!-- FAQ teaser -->
          <div class="glass border border-white/5 rounded-2xl p-6">
            <h3 class="font-semibold text-white mb-4">Common Questions</h3>
            <div class="space-y-4">
              <div v-for="faq in faqs" :key="faq.q">
                <div class="text-sm font-medium text-slate-200 mb-1">{{ faq.q }}</div>
                <div class="text-sm text-slate-400">{{ faq.a }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Form -->
        <div>
          <div
            v-if="submitted"
            class="glass border border-green-500/20 rounded-2xl p-12 text-center"
          >
            <div class="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
              <UIcon name="i-heroicons-check" class="w-8 h-8 text-green-400" />
            </div>
            <h2 class="font-display text-2xl font-bold text-white mb-3">Message sent!</h2>
            <p class="text-slate-400">
              Thanks for reaching out. We'll get back to you within 1 business day.
            </p>
          </div>

          <form
            v-else
            class="glass border border-white/5 rounded-2xl p-8 space-y-5"
            @submit.prevent="handleSubmit"
          >
            <h2 class="font-display text-2xl font-bold text-white">Send a Message</h2>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label class="text-sm text-slate-300 font-medium mb-2 block">Name *</label>
                <input
                  v-model="form.name"
                  type="text"
                  required
                  placeholder="Your name"
                  class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-all text-sm"
                />
              </div>
              <div>
                <label class="text-sm text-slate-300 font-medium mb-2 block">Email *</label>
                <input
                  v-model="form.email"
                  type="email"
                  required
                  placeholder="you@business.com"
                  class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-all text-sm"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label class="text-sm text-slate-300 font-medium mb-2 block">Business Name *</label>
                <input
                  v-model="form.businessName"
                  type="text"
                  required
                  placeholder="Your business"
                  class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-all text-sm"
                />
              </div>
              <div>
                <label class="text-sm text-slate-300 font-medium mb-2 block">
                  Phone <span class="text-slate-500 font-normal">(optional)</span>
                </label>
                <input
                  v-model="form.phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label class="text-sm text-slate-300 font-medium mb-2 block">
                What are you interested in? *
              </label>
              <select
                v-model="form.service"
                required
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-all text-sm appearance-none"
              >
                <option value="" class="bg-slate-900">Select a service...</option>
                <option
                  v-for="opt in serviceOptions"
                  :key="opt.value"
                  :value="opt.value"
                  class="bg-slate-900"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div>
              <label class="text-sm text-slate-300 font-medium mb-2 block">Message *</label>
              <textarea
                v-model="form.message"
                required
                rows="5"
                placeholder="Tell us about your business, what you're looking for, your budget, timeline — anything helps!"
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-all resize-none text-sm"
              />
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-orange-500/30 hover:-translate-y-0.5"
            >
              <div
                v-if="loading"
                class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
              />
              <template v-else>
                Send Message
                <UIcon name="i-heroicons-paper-airplane" class="w-5 h-5" />
              </template>
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
