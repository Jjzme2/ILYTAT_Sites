<script setup lang="ts">
useHead({ title: 'About — ILYTAT Sites' })

const values = [
  {
    icon: 'i-heroicons-folder-arrow-down',
    title: 'You Own What We Build',
    description:
      "Every file, every design, every line of code belongs to you after delivery. No lock-in, no ongoing dependency on us unless you choose it.",
  },
  {
    icon: 'i-heroicons-currency-dollar',
    title: 'Flat-Rate, No Surprises',
    description:
      "You see the price before you commit. We don't bill hourly, add rush fees, or chase you for overages. What you see is what you pay.",
  },
  {
    icon: 'i-heroicons-hand-raised',
    title: 'We\'re Upfront About What We Do',
    description:
      "We design and build. We don't manage your servers, own your domain, or hold your data hostage. We'll help you understand your options and hand you the keys.",
  },
  {
    icon: 'i-heroicons-shield-check',
    title: 'Revisions Until It\'s Right',
    description:
      "Every package includes revision rounds. We don't consider a job done until you're genuinely happy with the result.",
  },
]
</script>

<template>
  <div class="pt-28 pb-24">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Hero -->
      <div class="text-center mb-20">
        <span class="text-orange-400 text-sm font-semibold uppercase tracking-widest mb-3 block">About</span>
        <h1 class="font-display text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
          Design for businesses that<br />
          <span class="gradient-text">actually exist in the real world.</span>
        </h1>
        <p class="text-slate-400 text-xl max-w-2xl mx-auto leading-relaxed">
          ILYTAT Sites is a small design shop focused on one thing: giving local and small businesses
          access to professional design without agency prices or agency complexity.
        </p>
      </div>

      <!-- Honest framing -->
      <div class="glass border border-white/5 rounded-3xl p-10 mb-16">
        <h2 class="font-display text-2xl font-bold text-white mb-4">What we actually do</h2>
        <div class="prose prose-invert max-w-none">
          <p class="text-slate-300 leading-relaxed mb-4">
            We build websites, design fliers, create QR codes, and develop brand identities.
            When the work is done, we hand you the files — and you own them outright.
          </p>
          <p class="text-slate-300 leading-relaxed mb-4">
            We're not a hosting company. We don't manage your database or store your customer data.
            We'll recommend the right tools for your needs and explain how to get set up —
            but the responsibility for that infrastructure stays with you (or whichever platform you choose).
          </p>
          <p class="text-slate-300 leading-relaxed">
            If you want us to handle your domain and hosting, we offer that as an optional paid add-on.
            We register your domain, set up your hosting, and keep it running — you pay a flat monthly fee
            and never have to think about it.
          </p>
        </div>
      </div>

      <!-- Values -->
      <div class="mb-20">
        <h2 class="font-display text-3xl font-bold text-white text-center mb-10">How we operate</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            v-for="value in values"
            :key="value.title"
            class="glass border border-white/5 rounded-2xl p-8"
          >
            <div class="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-5">
              <UIcon :name="value.icon" class="w-6 h-6 text-orange-400" />
            </div>
            <h3 class="font-display text-xl font-bold text-white mb-3">{{ value.title }}</h3>
            <p class="text-slate-400 leading-relaxed">{{ value.description }}</p>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="text-center">
        <h2 class="font-display text-3xl font-bold text-white mb-4">Have a project in mind?</h2>
        <p class="text-slate-400 mb-8">We're straightforward to work with. Reach out and let's figure out what you need.</p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <NuxtLink
            to="/contact"
            class="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold px-8 py-4 rounded-2xl transition-all hover:-translate-y-0.5 shadow-xl shadow-orange-500/30"
          >
            Get in Touch
            <UIcon name="i-heroicons-arrow-right" class="w-5 h-5" />
          </NuxtLink>
          <NuxtLink to="/services" class="text-slate-400 hover:text-white font-medium transition-colors">
            See our services →
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
