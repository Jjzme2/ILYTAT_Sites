<template>
  <footer class="bg-slate-950 border-t border-white/5 mt-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        <!-- Brand -->
        <div class="lg:col-span-1">
          <NuxtLink to="/" class="flex items-center gap-2.5 mb-4">
            <div
              class="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center"
            >
              <span class="text-white font-bold text-sm font-display">IL</span>
            </div>
            <div class="flex flex-col leading-none">
              <span class="font-display font-bold text-white text-base">ILYTAT Sites</span>
              <span class="text-orange-400 text-[10px] font-medium uppercase tracking-widest"
                >Built for local business</span
              >
            </div>
          </NuxtLink>
          <p class="text-slate-400 text-sm leading-relaxed">
            Professional websites and marketing materials for small and local businesses — without
            the agency price tag.
          </p>
          <div class="flex items-center gap-3 mt-5">
            <a
              href="#"
              class="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <UIcon name="i-simple-icons-instagram" class="w-4 h-4" />
            </a>
            <a
              href="#"
              class="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <UIcon name="i-simple-icons-facebook" class="w-4 h-4" />
            </a>
            <a
              href="#"
              class="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <UIcon name="i-simple-icons-x" class="w-4 h-4" />
            </a>
          </div>
        </div>

        <!-- Services -->
        <div>
          <h3 class="font-semibold text-white text-sm mb-4">Services</h3>
          <ul class="space-y-3">
            <li v-for="link in serviceLinks" :key="link.to">
              <NuxtLink
                :to="link.to"
                class="text-slate-400 hover:text-orange-400 text-sm transition-colors"
              >
                {{ link.label }}
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Company -->
        <div>
          <h3 class="font-semibold text-white text-sm mb-4">Company</h3>
          <ul class="space-y-3">
            <li v-for="link in companyLinks" :key="link.to">
              <NuxtLink
                :to="link.to"
                class="text-slate-400 hover:text-orange-400 text-sm transition-colors"
              >
                {{ link.label }}
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Contact -->
        <div>
          <h3 class="font-semibold text-white text-sm mb-4">Get in touch</h3>
          <ul class="space-y-3">
            <li class="flex items-center gap-2 text-sm text-slate-400">
              <UIcon name="i-heroicons-envelope" class="w-4 h-4 text-orange-400 flex-shrink-0" />
              <a href="mailto:hello@ilytat.com" class="hover:text-white transition-colors">
                hello@ilytat.com
              </a>
            </li>
            <li class="flex items-start gap-2 text-sm text-slate-400">
              <UIcon name="i-heroicons-clock" class="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <span>Mon–Fri, 9am–6pm CST</span>
            </li>
          </ul>
          <NuxtLink
            to="/contact"
            class="mt-5 inline-flex items-center gap-2 text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors"
          >
            Send us a message
            <UIcon name="i-heroicons-arrow-right" class="w-4 h-4" />
          </NuxtLink>
        </div>
      </div>

      <div class="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p class="text-slate-500 text-sm">
          © {{ new Date().getFullYear() }} ILYTAT Sites. All rights reserved.
        </p>
        <div class="flex items-center gap-6">
          <NuxtLink to="/privacy" class="text-slate-500 hover:text-slate-300 text-sm transition-colors">
            Privacy Policy
          </NuxtLink>
          <NuxtLink to="/terms" class="text-slate-500 hover:text-slate-300 text-sm transition-colors">
            Terms of Service
          </NuxtLink>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const serviceLinks = [
  { label: 'Business Websites', to: '/services/website' },
  { label: 'Flier Design', to: '/services/flier' },
  { label: 'QR Code Design', to: '/services/qrcode' },
  { label: 'Brand Identity', to: '/services/branding' },
  { label: 'Social Media Kit', to: '/services/social' },
  { label: 'Free QR Generator', to: '/tools/qr-code' },
]

const companyLinks = [
  { label: 'About Us', to: '/about' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Portfolio', to: '/portfolio' },
  { label: 'Blog', to: '/blog' },
  { label: 'Contact', to: '/contact' },
  { label: 'Sign In', to: '/auth/login' },
]
</script>
