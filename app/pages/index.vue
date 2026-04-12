<script setup lang="ts">
definePageMeta({ layout: false })

import { siteContent } from '~/utils/siteContent'
const { founder, cta } = siteContent

useHead({
  title: 'ILYTAT — Professional Websites for Local Business',
  meta: [
    {
      name: 'description',
      content: 'Custom websites built for local businesses in Illinois. You own everything. Managed hosting from $89/mo.',
    },
    { property: 'og:image', content: 'https://media.ilytat.com/logo.png' },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: 'ILYTAT LLC',
        description: 'Custom websites built for local businesses in Illinois',
        url: 'https://ilytat.com',
        telephone: undefined,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Manteno',
          addressRegion: 'IL',
          addressCountry: 'US',
        },
        areaServed: { '@type': 'State', name: 'Illinois' },
        priceRange: '$499–$1,499',
        serviceType: 'Web Design',
      }),
    },
  ],
})

// ── Live data ──────────────────────────────────────────────────────────────
const { data: projects } = await useFetch('/api/projects')
const { data: promotion } = await useFetch('/api/promotion')
const { data: testimonials } = await useFetch('/api/testimonials')

// ── Analytics ──────────────────────────────────────────────────────────────
const { track } = useAnalytics()

// ── Founder photo ──────────────────────────────────────────────────────────
// The path is kept in a runtime string so Vite's static analyzer never tries
// to resolve it as a bundled asset. Falls back to an initials avatar when the
// file hasn't been placed in /public yet.
const FOUNDER_PHOTO_PATH = '/founder.jpg'
const founderPhotoExists = ref(false)
const founderPhotoSrc = ref('')
onMounted(async () => {
  try {
    const res = await fetch(FOUNDER_PHOTO_PATH, { method: 'HEAD' })
    if (res.ok) {
      founderPhotoSrc.value = FOUNDER_PHOTO_PATH
      founderPhotoExists.value = true
    }
  } catch {
    founderPhotoExists.value = false
  }
})

// ── Command palette ────────────────────────────────────────────────────────
const paletteOpen = ref(false)
function openPalette() { paletteOpen.value = true }
function closePalette() { paletteOpen.value = false }

// ── Scroll state (transparent nav → opaque) ────────────────────────────────
const scrolled = ref(false)
onMounted(() => {
  const onScroll = () => { scrolled.value = window.scrollY > 56 }
  window.addEventListener('scroll', onScroll, { passive: true })

  // ⌘K / Ctrl+K to open palette
  const onKeydown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      paletteOpen.value ? closePalette() : openPalette()
    }
  }
  window.addEventListener('keydown', onKeydown)
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('scroll', onScroll))

  // Detect abandoned Stripe checkout (cancel URL carries ?checkout=cancelled)
  const params = new URLSearchParams(window.location.search)
  if (params.get('checkout') === 'cancelled') {
    track('checkout_abandoned', {
      packageName:  params.get('pkg')   || '',
      billingCycle: params.get('cycle') || '',
    })
    // Clean up URL without reloading
    const clean = window.location.pathname + window.location.hash.replace(/\?.*/, '')
    window.history.replaceState({}, '', clean)
  }

  // Fire pricing_viewed once when the pricing section scrolls into view
  const pricingSection = document.getElementById('pricing')
  if (pricingSection) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          track('pricing_viewed')
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(pricingSection)
    onUnmounted(() => observer.disconnect())
  }
})

// ── Scroll reveal ──────────────────────────────────────────────────────────
useReveal()

// ── Static content ─────────────────────────────────────────────────────────
const pillars = [
  { icon: 'i-heroicons-lock-closed', title: 'You own your site', body: 'Every file, every line of code is yours. We just keep it running.' },
  { icon: 'i-heroicons-currency-dollar', title: 'Simple, clear pricing', body: 'One build price. One flat monthly rate. Nothing hidden, nothing variable.' },
  { icon: 'i-heroicons-shield-check', title: 'Fully managed', body: 'Hosting, SSL, domain, and updates — all handled for $89/mo.' },
  { icon: 'i-heroicons-arrow-path', title: 'Revisions included', body: 'Every package includes rounds of feedback before we close.' },
]

const services = [
  {
    icon: 'i-heroicons-building-storefront',
    tag: 'Retail & Services',
    title: 'Local Business Sites',
    body: 'Shops, salons, offices — everything a customer needs at a glance. Hours, location, contact, and a reason to choose you.',
  },
  {
    icon: 'i-heroicons-cake',
    tag: 'Food & Beverage',
    title: 'Restaurants & Food',
    body: 'Menus, hours, reservations, and ordering links. Get off Facebook and start showing up in Google searches.',
  },
  {
    icon: 'i-heroicons-wrench-screwdriver',
    tag: 'Trades & Contractors',
    title: 'Contractors & Trades',
    body: 'Photo galleries, service areas, quote request forms. Look as professional online as you are on the job.',
  },
]

const steps = [
  {
    n: '01',
    title: 'Tell us about your business',
    body: 'Fill out the form below. Share your services, your goals, any materials you have. The more we know, the better the result.',
  },
  {
    n: '02',
    title: 'We design and build it',
    body: 'You\'ll see the site before it\'s finalized. Revisions are built into every package — no surprises, no rush.',
  },
  {
    n: '03',
    title: 'Your site goes live — and stays live',
    body: 'We launch your site and handle everything technical from there. Hosting, SSL, domain renewal, and small updates are covered for $89/month. First month is free.',
  },
]

// ── Website build packages ─────────────────────────────────────────────────
// All packages include managed hosting at $89/month starting month 2.
// To update the monthly rate, change `monthlyRate` here — it flows everywhere.
const monthlyRate = '$89'

const packages = [
  {
    name: 'Starter',
    price: '$499',
    note: 'one-time build',
    best: 'New businesses that need a presence fast',
    features: [
      'Single-page site (scrolling sections)',
      'Mobile responsive design',
      'Contact form (email delivery)',
      'Google Maps embed',
      'Social media links',
      'Basic SEO (title, meta, sitemap)',
      '1 round of revisions',
    ],
    delivery: '1–2 weeks',
    featured: false,
  },
  {
    name: 'Professional',
    price: '$999',
    note: 'one-time build',
    best: 'Businesses ready to convert visitors into customers',
    features: [
      'Up to 5 pages (Home, About, Services, Gallery, Contact)',
      'Mobile responsive design',
      'Contact + quote request forms',
      'Photo gallery / portfolio section',
      'Full SEO setup (schema, sitemap, meta, alt tags)',
      'Google Business Profile optimization',
      'Social media integration',
      '2 rounds of revisions',
    ],
    delivery: '2–3 weeks',
    featured: true,
  },
  {
    name: 'Premium',
    price: '$1,499',
    note: 'one-time build',
    best: 'Established businesses that need full functionality',
    features: [
      'Up to 10 pages',
      'Everything in Professional',
      'Booking / scheduling integration',
      'Menu or service catalog system',
      'Analytics dashboard (Google Analytics)',
      'Third-party integrations (Square, Toast, etc.)',
      'Speed optimization (Core Web Vitals)',
      '3 rounds of revisions',
    ],
    delivery: '3–5 weeks',
    featured: false,
  },
]

// ── Checkout ──────────────────────────────────────────────────────────────────
const billingCycle = ref<'monthly' | 'yearly'>('monthly')
const checkoutLoading = ref<string | null>(null) // holds the package name being loaded
const checkoutError = ref('')

watch(billingCycle, (to) => {
  track('billing_toggle', { to })
})

async function startCheckout(pkg: typeof packages[number]) {
  checkoutError.value = ''
  checkoutLoading.value = pkg.name
  track('checkout_initiated', { packageName: pkg.name, billingCycle: billingCycle.value })
  try {
    const { url } = await $fetch<{ url: string }>('/api/stripe/create-checkout', {
      method: 'POST',
      body: {
        packageName: pkg.name,
        serviceName: 'Website',
        billingCycle: billingCycle.value,
      },
    })
    if (url) window.location.href = url
  }
  catch {
    checkoutError.value = 'Something went wrong — please try again or contact us directly.'
    track('checkout_error', { packageName: pkg.name, billingCycle: billingCycle.value })
  }
  finally {
    checkoutLoading.value = null
  }
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
const faqs = [
  {
    q: 'Do I need to already have a domain?',
    a: 'No — domain registration and management are included in the $89/month plan. If you already own a domain, we\'ll point it to your new site at no extra cost.',
  },
  {
    q: 'When does the $89/month start?',
    a: 'Month two. Your first month of hosting is always free — so your site is live and running before any billing begins. After that it\'s a flat $89/month with no surprises.',
  },
  {
    q: 'What platform will my site be built on?',
    a: 'Sites are custom-built — not WordPress, not Wix, not Squarespace. They load faster, rank better, and I maintain them directly so you never have to log in to anything.',
  },
  {
    q: 'What happens if I need changes after the site is delivered?',
    a: 'Small updates — text edits, photo swaps, hours changes — are covered under the $89/month plan. Larger additions like new pages or features are quoted separately at fair rates.',
  },
  {
    q: 'Will you help me set up Google Business Profile?',
    a: "Yes — I'm happy to walk you through it or do it for you. Mention it in your inquiry and we'll include it in the conversation.",
  },
  {
    q: 'Can you work with my existing logo and branding?',
    a: 'Absolutely. Send over what you have — logo files, brand colors, photos — and we\'ll build around it. No logo yet? I can work with what you have or point you to the right person.',
  },
]

// ── Phone (obfuscated — assembled client-side to avoid scraper harvest) ────
// Char codes for '7086271854'
const _ph = [55, 48, 56, 54, 50, 55, 49, 56, 53, 52]
const phoneHref = computed(() => `tel:+1${String.fromCharCode(..._ph)}`)

// ── Contact form ────────────────────────────────────────────────────────────
const form = reactive({ name: '', businessName: '', email: '', phone: '', service: '', billingPreference: 'monthly', message: '' })
const submitted = ref(false)
const submitting = ref(false)
const submitError = ref('')

async function handleSubmit() {
  submitting.value = true
  submitError.value = ''
  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: {
        name: form.name,
        businessName: form.businessName,
        email: form.email,
        phone: form.phone || undefined,
        service: form.service || 'Not specified',
        billingPreference: form.billingPreference,
        message: form.message,
      },
    })
    submitted.value = true
    track('contact_submit', {
      service:          form.service || 'Not specified',
      billingPreference: form.billingPreference,
    })
  }
  catch {
    submitError.value = 'Something went wrong — please try again or reach out directly.'
    track('contact_error')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="relative min-h-screen bg-[#0f0f11] text-[#f0ece6] font-sans leading-relaxed overflow-x-hidden">
    <!-- Grain overlay -->
    <div class="grain" aria-hidden="true" />

    <!-- Promo banner (client-only to avoid localStorage hydration mismatch) -->
    <ClientOnly>
      <PromoBanner v-if="promotion" :promotion="promotion" />
    </ClientOnly>

    <!-- ── NAV ──────────────────────────────────────────────────────────────── -->
    <nav
      class="fixed top-0 left-0 right-0 z-[90] flex justify-between items-center px-12 py-5 transition-[background,border-color,padding] duration-[400ms] ease-in-out border-b border-transparent md:px-6 sm:px-4"
      :class="{ 'nav-scrolled': scrolled }"
    >
      <img src="https://media.ilytat.com/logo.png" alt="ILYTAT" class="block h-8 w-auto object-contain">
      <div class="flex items-center gap-5 sm:gap-3">
        <NuxtLink to="/blog" class="text-[13px] font-medium text-[#9996a8] no-underline tracking-[0.1px] transition-colors duration-200 hover:text-[#f0ece6]">
          Blog
        </NuxtLink>
        <!-- ⌘K hint — desktop only -->
        <button
          @click="openPalette"
          class="hidden sm:hidden md:flex items-center gap-1.5 text-[12px] text-[#555] border border-[#2a2a32] rounded-[6px] px-2.5 py-1.5 transition-[border-color,color] duration-200 hover:border-[#4a4a58] hover:text-[#9996a8] cursor-pointer bg-transparent"
          title="Open command palette"
          aria-label="Open navigation palette"
        >
          <span>Search</span>
          <kbd class="font-sans text-[10px] px-1 py-0.5 rounded bg-[#1e1e28] border border-[#3a3a48] text-[#666]">⌘K</kbd>
        </button>
        <a href="#contact" class="text-[13px] font-semibold text-[#0f0f11] bg-[#f5c518] px-[22px] py-[9px] rounded-[5px] no-underline tracking-[0.1px] transition-[background,transform] duration-200 hover:bg-[#d4a912] hover:-translate-y-px sm:px-[14px] sm:py-[7px]">
          Get a Free Quote
        </a>
      </div>
    </nav>

    <!-- ── HERO ──────────────────────────────────────────────────────────────── -->
    <section class="relative min-h-screen flex flex-col items-center justify-center px-12 pt-[120px] pb-20 overflow-hidden md:px-6 md:pt-[100px] md:pb-16 sm:px-4 sm:pt-[88px] sm:pb-12">
      <div class="hero-grid" aria-hidden="true" />
      <div class="hero-glow hero-glow--center" aria-hidden="true" />
      <div class="hero-glow hero-glow--bottom" aria-hidden="true" />

      <div class="relative z-[2] text-center max-w-[800px] mx-auto">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] mb-8 [animation:fade-up_0.8s_ease_both] backdrop-blur-md">
          <span class="w-1.5 h-1.5 rounded-full bg-[#f5c518] shadow-[0_0_8px_rgba(245,197,24,0.6)]" aria-hidden="true"/>
          <span class="font-mono text-[10px] tracking-[2px] uppercase text-[#f0ece6] font-semibold">Manteno, IL</span>
        </div>

        <h1 class="flex flex-col gap-1 mb-8">
          <span class="font-display text-[clamp(42px,7vw,76px)] font-light tracking-[-2.5px] leading-[1.05] text-[#b8b4ae] [animation:fade-up_0.8s_0.1s_ease_both]">
            Agency-grade websites
          </span>
          <span class="hero-gradient-text font-display text-[clamp(46px,7.5vw,82px)] font-extrabold tracking-[-3.5px] leading-[1.0] [animation:fade-up_0.8s_0.18s_ease_both]">
            for local business.
          </span>
        </h1>

        <p class="font-mono text-[12px] tracking-[1.5px] text-[#68667a] uppercase max-w-[520px] mx-auto mb-10 leading-[1.85] [animation:fade-up_0.8s_0.3s_ease_both]">
          We Build It. <span class="text-[#f5c518] opacity-50 mx-1.5">/</span> You Own It. <span class="text-[#f5c518] opacity-50 mx-1.5">/</span> We Manage It.
        </p>

        <div class="flex items-center justify-center gap-3 flex-wrap [animation:fade-up_0.8s_0.42s_ease_both]">
          <a href="#contact" class="btn-primary" @click="track('cta_click', { label: 'Get a Free Quote', location: 'hero' })">Get a Free Quote</a>
          <a href="#pricing" class="btn-ghost" @click="track('cta_click', { label: 'See Pricing', location: 'hero' })">See Pricing</a>
        </div>
      </div>

      <!-- Scroll indicator -->
      <div
        class="absolute bottom-9 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#68667a] font-mono text-[9px] tracking-[2px] uppercase z-[2] [animation:fade-up_1s_0.8s_ease_both]"
        aria-hidden="true"
      >
        <span>scroll</span>
        <div class="hero-scroll-line" />
      </div>
    </section>

    <!-- ── TRUST STRIP (Pillars) ─────────────────────────────────────────────── -->
    <div class="border-t border-b border-white/[0.05] bg-[#0c0c0e] py-4 overflow-hidden relative">
      <div class="flex items-center justify-center whitespace-nowrap overflow-x-auto no-scrollbar px-6">
        <div class="flex items-center gap-6 md:gap-4 font-mono text-[10px] tracking-[1.5px] uppercase text-[#68667a]" data-reveal>
          <span v-for="(p, i) in pillars" :key="p.title" class="flex items-center gap-6 md:gap-4">
            <span class="flex items-center gap-2.5 text-[#f0ece6]">
              <UIcon :name="p.icon" class="w-3.5 h-3.5 text-[#f5c518]" />
              {{ p.title }}
            </span>
            <span v-if="i < pillars.length - 1" class="text-[#f5c518] opacity-30">/</span>
          </span>
        </div>
      </div>
    </div>

    <!-- ── SERVICES ───────────────────────────────────────────────────────────── -->
    <section id="services" class="max-w-[1080px] mx-auto px-12 py-[88px] md:px-6 md:py-16 sm:px-4 sm:py-14">
      <header class="text-center mb-14" data-reveal>
        <p class="eyebrow">What We Build</p>
        <h2 class="font-display text-[clamp(24px,3vw,38px)] font-bold tracking-[-1px] text-[#f0ece6] mb-3">
          Sites that work as hard as you do
        </h2>
      </header>

      <div class="flex flex-col border-t border-white/[0.06]">
        <a
          v-for="(svc, i) in services"
          :key="svc.title"
          href="#contact"
          class="service-row group flex items-center justify-between py-10 pr-6 border-b border-white/[0.06] hover:bg-white/[0.015] text-inherit no-underline pl-6"
          data-reveal
          :data-reveal-delay="i * 100"
          @click="form.service = svc.title"
        >
          <div class="flex items-start gap-12 sm:gap-6">
            <span class="font-display text-[56px] font-extrabold text-[#f5c518] opacity-[0.08] leading-none group-hover:opacity-100 transition-opacity duration-300 md:text-[40px] sm:text-[30px]">
              0{{ i + 1 }}
            </span>
            <div class="flex flex-col gap-2 mt-1">
              <span class="font-mono text-[9px] tracking-[1.5px] uppercase text-[#68667a]">{{ svc.tag }}</span>
              <h3 class="font-display text-[26px] font-bold text-[#f0ece6] tracking-[-0.5px] mb-1 sm:text-[20px]">{{ svc.title }}</h3>
              <p class="text-[14.5px] text-[#8e8ba0] max-w-[540px] leading-[1.75]">{{ svc.body }}</p>
            </div>
          </div>
          <div class="text-[13px] font-bold text-[#f5c518] opacity-0 -translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 hidden lg:block tracking-[0.2px]">
            Get started &rarr;
          </div>
        </a>
      </div>
    </section>

    <!-- ── PROCESS ────────────────────────────────────────────────────────────── -->
    <section id="how-it-works" class="bg-[#141417] border-t border-b border-[#1e1e26] py-[88px] sm:py-16">
      <div class="max-w-[1080px] mx-auto px-12 md:px-6 sm:px-4">
        <header class="text-center mb-14" data-reveal>
          <p class="eyebrow">How It Works</p>
          <h2 class="font-display text-[clamp(24px,3vw,38px)] font-bold tracking-[-1px] text-[#f0ece6] mb-3">
            Simple from day one
          </h2>
          <p class="text-[15px] text-[#8e8ba0] max-w-[460px] mx-auto leading-[1.75]">
            No mystery timelines or confusing agency processes.
          </p>
        </header>

        <div class="relative mt-8">
          <!-- Ambient line connecting the dots (desktop only) -->
          <div class="hidden lg:block absolute top-[28px] left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-[rgba(245,197,24,0.3)] to-transparent" aria-hidden="true"/>

          <div class="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-8">
            <div
              v-for="(step, i) in steps"
              :key="step.n"
              class="relative flex flex-col items-center text-center group"
              data-reveal
              :data-reveal-delay="i * 120"
            >
              <!-- Amber dot visual indicator -->
              <div class="w-[56px] h-[56px] rounded-full border border-[rgba(245,197,24,0.2)] bg-[#141417] flex items-center justify-center mb-6 relative z-10 shadow-[0_0_20px_rgba(245,197,24,0.05)] transition-all duration-300 group-hover:border-[rgba(245,197,24,0.5)] group-hover:shadow-[0_0_30px_rgba(245,197,24,0.15)] group-hover:scale-110">
                <div class="w-2.5 h-2.5 rounded-full bg-[#f5c518]"/>
              </div>

              <span class="font-mono text-[11px] font-bold text-[#f5c518] tracking-[1.5px] block mb-3 uppercase">Phase {{ step.n }}</span>
              <h3 class="font-display text-[18px] font-bold text-[#f0ece6] mb-3 tracking-[-0.3px]">{{ step.title }}</h3>
              <p class="text-[14px] text-[#8e8ba0] leading-[1.8] max-w-[280px] mx-auto">{{ step.body }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── PRICING ────────────────────────────────────────────────────────────── -->
    <section id="pricing" class="relative overflow-hidden">
      <div class="pricing-bg" aria-hidden="true" />

      <div class="relative max-w-[1080px] mx-auto px-12 py-[88px] md:px-6 md:py-16 sm:px-4 sm:py-14">
        <header class="text-center mb-10" data-reveal>
          <p class="eyebrow">Pricing</p>
          <h2 class="font-display text-[clamp(24px,3vw,38px)] font-bold tracking-[-1px] text-[#f0ece6] mb-3">
            One build. One monthly rate.
          </h2>
          <p class="text-[15px] text-[#8e8ba0] max-w-[460px] mx-auto leading-[1.75]">
            Pick your package — then {{ monthlyRate }}/month covers everything else.
          </p>
        </header>

        <!-- Billing toggle -->
        <div class="flex items-center justify-center gap-3 mb-10" data-reveal>
          <span class="text-[13px]" :class="billingCycle === 'monthly' ? 'text-[#f0ece6] font-semibold' : 'text-[#68667a]'">Monthly</span>
          <button
            class="relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none"
            :class="billingCycle === 'yearly' ? 'bg-[#f5c518]' : 'bg-[#2a2a32]'"
            :aria-label="billingCycle === 'yearly' ? 'Switch to monthly' : 'Switch to yearly'"
            @click="billingCycle = billingCycle === 'monthly' ? 'yearly' : 'monthly'"
          >
            <span
              class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              :class="billingCycle === 'yearly' ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
          <span class="text-[13px]" :class="billingCycle === 'yearly' ? 'text-[#f0ece6] font-semibold' : 'text-[#68667a]'">
            Yearly
            <span class="ml-1.5 font-mono text-[10px] font-bold text-[#0f0f11] bg-[#f5c518] px-1.5 py-0.5 rounded-sm uppercase tracking-[0.5px]">Save 25%</span>
          </span>
        </div>

        <p v-if="checkoutError" class="text-center text-[13px] text-red-400 mb-4">{{ checkoutError }}</p>

        <div class="grid grid-cols-1 gap-5 items-start sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="(pkg, i) in packages"
            :key="pkg.name"
            class="glass-card rounded-[18px] px-5 py-7 sm:px-7 sm:py-9 relative transition-[border-color,box-shadow,transform] duration-[250ms] hover:border-[rgba(245,197,24,0.2)] hover:-translate-y-[3px]"
            :class="pkg.featured ? 'price-card-featured' : 'hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_40px_rgba(0,0,0,0.45)]'"
            data-reveal
            :data-reveal-delay="i * 100"
          >
            <div v-if="pkg.featured" class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#f5c518] to-[#f09420]"/>
            <div v-if="pkg.featured" class="absolute top-4 right-5 font-mono text-[9px] font-bold text-[#f5c518] uppercase tracking-[1.5px]">Featured</div>

            <p class="font-mono text-[11px] text-[#68667a] uppercase tracking-[1.5px] mb-4">{{ pkg.name }}</p>

            <div class="flex items-baseline gap-2 mb-1.5">
              <span class="font-display text-[38px] sm:text-[48px] font-extrabold tracking-[-2px] sm:tracking-[-3px] leading-none text-[#f0ece6]">{{ pkg.price }}</span>
              <span class="text-[13px] text-[#68667a] tracking-[0.2px]">{{ pkg.note }}</span>
            </div>

            <div class="flex items-baseline gap-2 mb-5 pb-5 border-b border-white/[0.06] flex-wrap">
              <span v-if="billingCycle === 'monthly'" class="font-mono text-[13px] font-bold text-[#f5c518] whitespace-nowrap">$89/mo hosting</span>
              <span v-else class="font-mono text-[13px] font-bold text-[#f5c518] whitespace-nowrap">$799/yr hosting <span class="text-[#68667a] font-normal text-[11px]">· save $269/yr</span></span>
              <span class="text-[11px] text-[#68667a] leading-snug w-full">First 30 days free &mdash; hosting, SSL &amp; domain included</span>
            </div>

            <p class="text-[12.5px] text-[#f5c518]/70 mb-6 leading-snug">Best for: {{ pkg.best }}</p>

            <ul class="tier-features">
              <li v-for="f in pkg.features" :key="f">{{ f }}</li>
            </ul>

            <p class="font-mono text-[10px] tracking-[1px] text-[#68667a] uppercase mt-5 mb-5 border-t border-white/[0.06] pt-4">
              Delivered in {{ pkg.delivery }}
            </p>

            <button
              class="price-cta w-full"
              :class="{ 'price-cta-featured': pkg.featured }"
              :disabled="checkoutLoading !== null"
              @click="startCheckout(pkg)"
            >
              <span v-if="checkoutLoading === pkg.name" class="flex items-center justify-center gap-2">
                <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/></svg>
                Redirecting…
              </span>
              <span v-else>Buy Now</span>
            </button>
          </div>
        </div>

        <p class="text-center mt-10 text-[13px] text-[#8e8ba0] tracking-[0.1px]" data-reveal>
          Every site includes managed hosting, SSL, and your domain — starting free on month one.
        </p>
      </div>
    </section>

    <!-- ── PORTFOLIO ──────────────────────────────────────────────────────────── -->
    <section id="portfolio" class="max-w-[1080px] mx-auto px-12 py-[88px] md:px-6 md:py-16 sm:px-4 sm:py-14">
      <header class="text-center mb-14" data-reveal>
        <p class="eyebrow">Recent Work</p>
        <h2 class="font-display text-[clamp(24px,3vw,38px)] font-bold tracking-[-1px] text-[#f0ece6] mb-3">
          Built for businesses like yours
        </h2>
      </header>

      <!-- Live projects from Firestore -->
      <div v-if="projects && projects.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-reveal>
        <a
          v-for="proj in projects"
          :key="proj.id"
          :href="proj.url || undefined"
          :target="proj.url ? '_blank' : undefined"
          :rel="proj.url ? 'noopener noreferrer' : undefined"
          class="bg-[#1a1a1f] border border-[#2a2a32] rounded-[14px] overflow-hidden flex flex-col no-underline text-inherit transition-[border-color,transform,box-shadow] duration-[250ms]"
          :class="proj.url ? 'hover:border-[rgba(245,197,24,0.35)] hover:-translate-y-[3px] hover:shadow-[0_8px_32px_rgba(0,0,0,0.35)]' : ''"
        >
          <div class="aspect-video bg-[#222228] flex items-center justify-center text-[#68667a] overflow-hidden">
            <img v-if="proj.imageUrl" :src="proj.imageUrl" :alt="proj.title" loading="lazy" class="w-full h-full object-cover">
            <UIcon v-else name="i-heroicons-photo" class="w-10 h-10 opacity-10" />
          </div>
          <div class="px-[22px] pt-5 pb-6">
            <span class="font-mono text-[9px] tracking-[1.5px] uppercase text-[#f5c518]/70 block mb-2">{{ proj.industry }}</span>
            <h3 class="font-display text-[15px] font-bold text-[#f0ece6] mb-1.5 tracking-[-0.2px]">{{ proj.title }}</h3>
            <p class="text-[12.5px] text-[#8e8ba0] leading-[1.65]">{{ proj.description }}</p>
          </div>
        </a>
      </div>

      <!-- Empty state until first real projects are added via /admin -->
      <div v-else class="text-center py-[72px] px-6 border border-dashed border-white/[0.08] rounded-[20px]" data-reveal>
        <p class="font-display text-[20px] font-bold text-[#f0ece6] mb-2.5">First projects in progress.</p>
        <p class="text-[15px] text-[#8e8ba0] max-w-[400px] mx-auto mb-7 leading-[1.7]">
          Ask about being an early client — discounted builds available for businesses in Kankakee County.
        </p>
        <a href="#contact" class="btn-ghost">Let's talk →</a>
      </div>
    </section>

    <!-- ── TESTIMONIALS ───────────────────────────────────────────────────────── -->
    <section v-if="testimonials && testimonials.length" class="max-w-[1080px] mx-auto px-12 pb-[88px] md:px-6 md:pb-16 sm:px-4 sm:pb-14">
      <header class="text-center mb-14" data-reveal>
        <p class="eyebrow">What Clients Say</p>
        <h2 class="font-display text-[clamp(24px,3vw,38px)] font-bold tracking-[-1px] text-[#f0ece6] mb-3">
          Built on real results
        </h2>
      </header>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
        <div
          v-for="(t, i) in testimonials"
          :key="t.id"
          class="glass-card rounded-[18px] px-7 py-8 flex flex-col gap-5 transition-[border-color,transform] duration-[250ms] hover:border-[rgba(245,197,24,0.2)] hover:-translate-y-[3px]"
          data-reveal
          :data-reveal-delay="i * 100"
        >
          <p class="text-[15px] text-[#f0ece6]/80 leading-[1.75] flex-1 italic">"{{ t.quote }}"</p>
          <div class="pt-4 border-t border-white/[0.06]">
            <p class="text-[14px] font-semibold text-[#f0ece6] mb-0.5">{{ t.name }}</p>
            <p class="text-[12px] text-[#68667a] font-mono tracking-[0.3px]">{{ t.businessName }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── ABOUT ──────────────────────────────────────────────────────────────── -->
    <section id="about" class="max-w-[1080px] mx-auto px-12 py-[88px] md:px-6 md:py-16 sm:px-4 sm:py-14">
      <div class="grid grid-cols-1 gap-12 items-start lg:grid-cols-[1fr_1fr] lg:gap-24" data-reveal>
        <!-- Left: Philosophy Blockquote -->
        <div class="lg:sticky lg:top-32">
          <p class="font-display text-[clamp(22px,3.5vw,40px)] font-bold tracking-[-1px] lg:tracking-[-1.5px] text-[#f0ece6] leading-[1.2] border-l-[3px] border-[#f5c518] pl-6 lg:pl-8 mb-8 lg:mb-10">
            {{ founder.philosophy }}
          </p>

          <div class="flex items-center gap-5 border-t border-white/[0.08] lg:border-t-0 pt-8 lg:pt-0">
            <!-- Place your photo at /public/founder.jpg to display it here; falls back to initials avatar -->
            <div class="w-[72px] h-[72px] rounded-full border border-[rgba(245,197,24,0.3)] overflow-hidden flex-shrink-0 shadow-[0_0_20px_rgba(245,197,24,0.08)] bg-[#1a1a1a] flex items-center justify-center">
              <img
                v-if="founderPhotoExists"
                :src="founderPhotoSrc"
                :alt="founder.name"
                class="w-full h-full object-cover"
              >
              <span v-else class="font-bold text-[#f5c518] text-xl select-none">
                {{ founder.name.charAt(0) }}
              </span>
            </div>
            <div>
              <p class="font-bold text-[#f0ece6] mb-0.5">{{ founder.name }}</p>
              <p class="font-mono text-[10px] text-[#f5c518] uppercase tracking-[1.5px]">{{ founder.title }}</p>
            </div>
          </div>
        </div>

        <!-- Right: Story -->
        <div class="max-w-[560px]">
          <p class="eyebrow">The Story</p>
          <h2 class="font-display text-[clamp(22px,3vw,30px)] font-extrabold tracking-[-1px] text-[#f0ece6] mt-2 mb-6 leading-snug">
            Built by someone who lives here too.
          </h2>

          <p class="text-[15px] text-[#f0ece6]/80 leading-[1.8] mb-5">{{ founder.intro }}</p>
          <p class="text-[15px] text-[#f0ece6]/80 leading-[1.8] mb-5">{{ founder.origin }}</p>
          <p class="text-[15px] text-[#f0ece6]/80 leading-[1.8] mb-8">{{ founder.problem }}</p>

          <h3 class="text-[17px] font-bold text-[#f0ece6] mb-4">Here's the deal:</h3>
          <ul class="flex flex-col gap-4 mb-8 pl-0">
            <li
              v-for="(item, i) in founder.deal"
              :key="item.label"
              class="flex gap-4 text-[14.5px] text-[#f0ece6]/80 leading-[1.7]"
            >
              <span class="text-[#f5c518] font-mono font-bold mt-[-2px] flex-shrink-0">{{ String(i + 1).padStart(2, '0') }}</span>
              <span><strong class="text-[#f0ece6] font-semibold">{{ item.label }}:</strong> {{ item.body }}</span>
            </li>
          </ul>

          <p class="text-[15px] font-semibold text-[#f0ece6] border-t border-white/[0.06] pt-6 leading-[1.7]">
            {{ founder.closing }}
          </p>

          <div class="flex items-center gap-3 mt-8">
            <ClientOnly>
              <a :href="phoneHref" class="inline-flex items-center gap-2 text-[13px] font-semibold text-[#0f0f11] bg-[#f5c518] px-4 py-2 rounded-[5px] no-underline transition-[background,transform] duration-200 hover:bg-[#d4a912] hover:-translate-y-px">
                <UIcon name="i-heroicons-phone" class="w-4 h-4 flex-shrink-0" />
                Call / Text
              </a>
            </ClientOnly>
          </div>
        </div>
      </div>
    </section>

    <!-- ── FAQ ───────────────────────────────────────────────────────────────── -->
    <section id="faq" class="py-[80px] sm:py-16">
      <div class="max-w-[1080px] mx-auto px-12 md:px-6 sm:px-4">
        <header class="text-center mb-14" data-reveal>
          <p class="eyebrow">Common Questions</p>
          <h2 class="font-display text-[clamp(24px,3vw,38px)] font-bold tracking-[-1px] text-[#f0ece6] mb-3">
            Straight answers
          </h2>
        </header>

        <div class="max-w-[720px] mx-auto flex flex-col gap-1">
          <details
            v-for="(item, i) in faqs"
            :key="item.q"
            class="faq-item"
            data-reveal
            :data-reveal-delay="i * 60"
          >
            <summary class="faq-q">{{ item.q }}</summary>
            <p class="faq-a">{{ item.a }}</p>
          </details>
        </div>
      </div>
    </section>

    <!-- ── CTA BAND ───────────────────────────────────────────────────────────── -->
    <div class="relative mx-12 my-[88px] rounded-[16px] overflow-hidden bg-[#f5c518] text-[#0f0f11] md:mx-6 md:my-16 sm:mx-4 sm:my-12 sm:rounded-[14px]" data-reveal>
      <div class="relative z-[1] text-center px-12 py-[80px] sm:px-6 sm:py-16">
        <h2 class="font-display text-[clamp(28px,4vw,48px)] font-extrabold tracking-[-2px] mb-4 leading-[1.1]" style="white-space: pre-line">{{ cta.headline }}</h2>
        <p class="text-[16px] text-[#0f0f11]/70 font-medium mb-10 max-w-[500px] mx-auto">
          {{ cta.subtext }}
        </p>
        <a href="#contact" class="cta-amber-btn" @click="track('cta_click', { label: cta.buttonLabel, location: 'cta_band' })">{{ cta.buttonLabel }}</a>
      </div>
    </div>

    <!-- ── CONTACT ────────────────────────────────────────────────────────────── -->
    <section id="contact" class="border-t border-[#1e1e26] bg-[#141417] px-12 py-[88px] md:px-6 md:py-16 sm:px-4 sm:py-14">
      <div class="max-w-[1080px] mx-auto grid grid-cols-1 gap-12 items-start lg:grid-cols-[380px_1fr] lg:gap-20">

        <!-- Left: context -->
        <div data-reveal>
          <p class="eyebrow">Contact</p>
          <h2 class="font-display text-[clamp(28px,3.5vw,42px)] font-bold tracking-[-1.5px] text-[#f0ece6] mb-4 leading-[1.1]">
            Book a free consultation
          </h2>
          <p class="text-[15px] text-[#8e8ba0] leading-[1.8] mb-8">
            Tell me about your business. I'll review it and get back to you within 24 hours.
            No sales pressure — just a straight conversation about what we can do.
          </p>
          <ul class="contact-promises list-none p-0 flex flex-col gap-3">
            <li class="flex items-center gap-2.5 text-[13.5px] text-[#f0ece6]/80">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
              Free quote, no obligation
            </li>
            <li class="flex items-center gap-2.5 text-[13.5px] text-[#f0ece6]/80">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
              Response within 24 hours
            </li>
            <li class="flex items-center gap-2.5 text-[13.5px] text-[#f0ece6]/80">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
              You own everything we build
            </li>
          </ul>
        </div>

        <!-- Right: form -->
        <div
          class="bg-white/[0.03] backdrop-blur-[24px] border border-white/[0.08] rounded-[16px] p-9 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_40px_rgba(0,0,0,0.35)] sm:p-6"
          data-reveal
          data-reveal-delay="100"
        >
          <!-- Success state -->
          <div v-if="submitted" class="flex flex-col items-center py-14 px-6 text-center">
            <div class="w-14 h-14 rounded-full border border-[rgba(245,197,24,0.35)] bg-[rgba(245,197,24,0.08)] flex items-center justify-center text-[#f5c518] mb-5">
              <UIcon name="i-heroicons-check" class="w-6 h-6" />
            </div>
            <p class="font-display text-[22px] font-bold text-[#f0ece6] mb-2">Message sent!</p>
            <p class="text-[14px] text-[#8e8ba0]">I'll be in touch within 24 hours.</p>
          </div>

          <!-- Form -->
          <form v-else class="flex flex-col gap-4" @submit.prevent="handleSubmit">
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
                <label>Email <span class="text-[#f5c518]">*</span></label>
                <input v-model="form.email" type="email" placeholder="jane@email.com" required>
              </div>
              <div class="fgroup">
                <label>Phone <span class="text-[10px] opacity-50">(optional)</span></label>
                <input v-model="form.phone" type="tel" placeholder="(815) 555-1234">
              </div>
            </div>
            <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div class="fgroup">
                <label>Package Interest</label>
                <div class="select-wrap">
                  <select v-model="form.service">
                    <option value="">Select a package…</option>
                    <option value="Starter — $499">Starter — $499</option>
                    <option value="Professional — $999">Professional — $999</option>
                    <option value="Premium — $1,499">Premium — $1,499</option>
                    <option value="Not sure yet">Not sure yet</option>
                  </select>
                  <UIcon name="i-heroicons-chevron-down" class="select-arrow w-4 h-4" />
                </div>
              </div>
              <div v-if="form.service && form.service !== 'Not sure yet'" class="fgroup">
                <label>Billing Preference</label>
                <div class="select-wrap">
                  <select v-model="form.billingPreference">
                    <option value="monthly">Monthly ($89/mo)</option>
                    <option value="yearly">Yearly ($799/yr) - Save $269</option>
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
                required
              />
            </div>
            <p v-if="submitError" class="text-[13px] text-[#f87171] px-3.5 py-2.5 bg-[rgba(248,113,113,0.06)] border border-[rgba(248,113,113,0.15)] rounded-lg">
              {{ submitError }}
            </p>
            <button type="submit" class="submit-btn" :disabled="submitting">
              {{ submitting ? 'Sending…' : 'Send Message →' }}
            </button>
          </form>
        </div>
      </div>
    </section>

    <!-- ── FOOTER ─────────────────────────────────────────────────────────────── -->
    <footer class="px-12 py-7 border-t border-[#1e1e26] flex justify-between items-center flex-wrap gap-3 bg-[#0f0f11] md:px-6 md:flex-col md:items-start sm:px-4">
      <div class="flex flex-col gap-[3px]">
        <img src="https://media.ilytat.com/logo.png" alt="ILYTAT" class="block h-6 w-auto object-contain mb-1">
        <span class="text-[11.5px] text-[#68667a]">Websites for local businesses · Manteno, IL</span>
        <span class="text-[12px] text-[#68667a]">Built by JJ</span>
      </div>
      <div class="flex flex-col items-end gap-1.5 md:items-start">
        <a href="/privacy" class="text-[12px] text-[#68667a] no-underline transition-colors duration-150 hover:text-[#8e8ba0]">Privacy Policy</a>
        <span class="font-mono text-[11px] text-[#68667a]">© {{ new Date().getFullYear() }} ILYTAT LLC</span>
      </div>
    </footer>

    <!-- ── Mobile palette trigger pill ────────────────────────────────────────── -->
    <button
      class="fixed bottom-5 left-1/2 -translate-x-1/2 z-[150] md:hidden flex items-center gap-2 text-[13px] font-semibold text-[#c0bdb8] bg-[#1a1a24] border border-[#3a3a48] px-4 py-2.5 rounded-full shadow-[0_4px_24px_rgba(0,0,0,.5)] transition-[transform,box-shadow] duration-200 active:scale-95 hover:border-[#6366f1]/50"
      @click="openPalette"
      aria-label="Open navigation"
    >
      <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-[#888]" />
      <span>Explore</span>
      <span class="text-[11px] text-[#555] font-normal ml-0.5">or ⌘K</span>
    </button>

    <!-- ── Command palette (client-side only) ──────────────────────────────────── -->
    <ClientOnly>
      <Teleport to="body">
        <SiteCommandPalette v-if="paletteOpen" @close="closePalette" />
      </Teleport>
    </ClientOnly>
  </div>
</template>
