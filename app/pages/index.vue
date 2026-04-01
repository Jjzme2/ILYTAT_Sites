<script setup lang="ts">
definePageMeta({ layout: false })

useHead({
  title: 'ILYTAT — Professional Websites for Local Business',
  meta: [
    {
      name: 'description',
      content: 'Custom websites built for local businesses in Illinois. You own everything. Managed hosting from $50/mo.',
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
        telephone: '+1-708-627-1854',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Manteno',
          addressRegion: 'IL',
          addressCountry: 'US',
        },
        areaServed: { '@type': 'State', name: 'Illinois' },
        priceRange: '$299–$799',
        serviceType: 'Web Design',
      }),
    },
  ],
})

// ── Live data ──────────────────────────────────────────────────────────────
const { data: projects } = await useFetch('/api/projects')
const { data: promotion } = await useFetch('/api/promotion')
const { data: testimonials } = await useFetch('/api/testimonials')

// ── Scroll state (transparent nav → opaque) ────────────────────────────────
const scrolled = ref(false)
onMounted(() => {
  const onScroll = () => { scrolled.value = window.scrollY > 56 }
  window.addEventListener('scroll', onScroll, { passive: true })
  onUnmounted(() => window.removeEventListener('scroll', onScroll))
})

// ── Scroll reveal ──────────────────────────────────────────────────────────
useReveal()

// ── Static content ─────────────────────────────────────────────────────────
const pillars = [
  { icon: 'i-heroicons-lock-closed', title: 'You own your site', body: 'Every file, every line of code is yours. We just keep it running.' },
  { icon: 'i-heroicons-currency-dollar', title: 'Simple, clear pricing', body: 'One build price. One flat monthly rate. Nothing hidden, nothing variable.' },
  { icon: 'i-heroicons-shield-check', title: 'Fully managed', body: 'Hosting, SSL, domain, and updates — all handled for $50/mo.' },
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
    body: 'We launch your site and handle everything technical from there. Hosting, SSL, domain renewal, and small updates are covered for $50/month. First month is free.',
  },
]

// ── Website build packages ─────────────────────────────────────────────────
// All packages include managed hosting at $50/month starting month 2.
// To update the monthly rate, change `monthlyRate` here — it flows everywhere.
const monthlyRate = '$50'

const packages = [
  {
    name: 'Starter',
    price: '$299',
    note: 'one-time build',
    best: 'New businesses that need a presence fast',
    features: [
      'Single-page site',
      'Mobile responsive design',
      'Contact form',
      'Google Maps embed',
      'We work until you love it',
    ],
    featured: false,
  },
  {
    name: 'Professional',
    price: '$499',
    note: 'one-time build',
    best: 'Businesses ready to convert visitors into customers',
    features: [
      'Up to 5 pages',
      'Mobile responsive design',
      'Contact & quote request forms',
      'Photo gallery / service lists',
      'Basic SEO setup',
      'We work until you love it',
    ],
    featured: true,
  },
  {
    name: 'Premium',
    price: '$799',
    note: 'one-time build',
    best: 'Established businesses that need full functionality',
    features: [
      'Up to 10 pages',
      'Everything in Professional',
      'Booking / scheduling widget integration',
      'Menu or detailed service catalog',
      'Analytics dashboard setup',
      'We work until you love it',
    ],
    featured: false,
  },
]

// ── FAQ ───────────────────────────────────────────────────────────────────────
const faqs = [
  {
    q: 'Do I need to already have a domain?',
    a: 'No — domain registration and management are included in the $50/month plan. If you already own a domain, we\'ll point it to your new site at no extra cost.',
  },
  {
    q: 'What platform will my site be built on?',
    a: 'Sites are custom-built — not WordPress, not Wix, not Squarespace. They load faster, rank better, and I maintain them directly so you never have to log in to anything.',
  },
  {
    q: 'What happens if I need changes after the site is delivered?',
    a: 'Small updates — text edits, photo swaps, hours changes — are covered under the $50/month plan. Larger additions like new pages or features are quoted separately at fair rates.',
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

// ── Contact form ────────────────────────────────────────────────────────────
const form = reactive({ name: '', businessName: '', email: '', phone: '', service: '', message: '' })
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
        message: form.message,
      },
    })
    submitted.value = true
  }
  catch {
    submitError.value = 'Something went wrong — please try again or reach out directly.'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="site">
    <!-- Grain overlay -->
    <div class="grain" aria-hidden="true" />

    <!-- Promo banner (client-only to avoid localStorage hydration mismatch) -->
    <ClientOnly>
      <PromoBanner v-if="promotion" :promotion="promotion" />
    </ClientOnly>

    <!-- ── NAV ──────────────────────────────────────────────────────── -->
    <nav class="nav" :class="{ 'nav--scrolled': scrolled }">
      <img src="https://media.ilytat.com/logo.png" alt="ILYTAT" class="nav-logo-img" height="32">
      <a href="#contact" class="nav-cta">Get a Free Quote</a>
    </nav>

    <!-- ── HERO ─────────────────────────────────────────────────────── -->
    <section class="hero">
      <!-- Background layers -->
      <div class="hero-grid" aria-hidden="true" />
      <div class="hero-glow hero-glow--center" aria-hidden="true" />
      <div class="hero-glow hero-glow--bottom" aria-hidden="true" />

      <div class="hero-body">
        <p class="eyebrow hero-eyebrow">Web design · Local business · Illinois</p>

        <h1 class="hero-h1">
          <span class="hero-h1-line1">Professional websites</span>
          <span class="hero-h1-line2">for local business.</span>
        </h1>

        <p class="hero-sub">
          Websites built for you — managed by us so you never
          have to think about hosting, SSL, or renewals again.
        </p>

        <div class="hero-ctas">
          <a href="#contact" class="btn-primary">Get a Free Quote</a>
          <a href="#pricing" class="btn-ghost">See Pricing</a>
        </div>
      </div>

      <div class="hero-scroll" aria-hidden="true">
        <span>scroll</span>
        <div class="hero-scroll-line" />
      </div>
    </section>

    <!-- ── PILLARS ───────────────────────────────────────────────────── -->
    <div class="pillars">
      <div v-for="(p, i) in pillars" :key="p.title" class="pillar" data-reveal :data-reveal-delay="i * 80">
        <UIcon :name="p.icon" class="pillar-icon" />
        <p class="pillar-title">{{ p.title }}</p>
        <p class="pillar-body">{{ p.body }}</p>
      </div>
    </div>

    <!-- ── SERVICES ──────────────────────────────────────────────────── -->
    <section class="wrap section-gap">
      <header class="section-header" data-reveal>
        <p class="eyebrow">What We Build</p>
        <h2>Sites that work as hard as you do</h2>
      </header>

      <div class="service-grid">
        <div v-for="(svc, i) in services" :key="svc.title" class="service-card" data-reveal
          :data-reveal-delay="i * 100">
          <div class="service-card-top">
            <div class="svc-icon-wrap">
              <UIcon :name="svc.icon" class="w-5 h-5" />
            </div>
            <span class="svc-tag">{{ svc.tag }}</span>
          </div>
          <h3>{{ svc.title }}</h3>
          <p>{{ svc.body }}</p>
        </div>
      </div>
    </section>

    <!-- ── PROCESS ───────────────────────────────────────────────────── -->
    <section class="process-band">
      <div class="wrap">
        <header class="section-header" data-reveal>
          <p class="eyebrow">How It Works</p>
          <h2>Simple from day one</h2>
          <p class="section-sub">No mystery timelines or confusing agency processes.</p>
        </header>

        <div class="steps">
          <div v-for="(step, i) in steps" :key="step.n" class="step" data-reveal :data-reveal-delay="i * 120">
            <span class="step-bg-n" aria-hidden="true">{{ step.n }}</span>
            <span class="step-n">{{ step.n }}</span>
            <h3>{{ step.title }}</h3>
            <p>{{ step.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── PRICING ───────────────────────────────────────────────────── -->
    <section id="pricing" class="pricing-outer">
      <!-- Decorative background so glass cards have depth to blur over -->
      <div class="pricing-bg" aria-hidden="true" />

      <div class="wrap section-gap">
        <!-- Website build packages -->
        <header class="section-header" data-reveal>
          <p class="eyebrow">Pricing</p>
          <h2>One build. One monthly rate.</h2>
          <p class="section-sub">Pick your package — then {{ monthlyRate }}/month covers everything else.</p>
        </header>

        <div class="pricing-grid">
          <div v-for="(pkg, i) in packages" :key="pkg.name" class="price-card glass-card"
            :class="{ 'price-card--featured': pkg.featured }" data-reveal :data-reveal-delay="i * 100">
            <div v-if="pkg.featured" class="featured-badge">Most Popular</div>
            <p class="tier-name">{{ pkg.name }}</p>
            <div class="tier-price-row">
              <span class="tier-price">{{ pkg.price }}</span>
              <span class="tier-note">{{ pkg.note }}</span>
            </div>
            <div class="tier-monthly">
              <span class="tier-monthly-rate">{{ monthlyRate }}/mo</span>
              <span class="tier-monthly-note">First month free &mdash; we handle hosting, SSL &amp; your domain</span>
            </div>
            <p class="tier-best">Best for: {{ pkg.best }}</p>
            <ul class="tier-features">
              <li v-for="f in pkg.features" :key="f">{{ f }}</li>
            </ul>
            <a href="#contact" class="price-cta" :class="{ 'price-cta--featured': pkg.featured }"
              @click="form.service = pkg.name + ' — ' + pkg.price">
              Get Started
            </a>
          </div>
        </div>

        <p class="pricing-footnote" data-reveal>
          Every site includes managed hosting, SSL, and your domain — starting free on month one.
        </p>
      </div>
    </section>

    <!-- ── PORTFOLIO ─────────────────────────────────────────────────── -->
    <section class="wrap section-gap">
      <header class="section-header" data-reveal>
        <p class="eyebrow">Recent Work</p>
        <h2>Built for businesses like yours</h2>
      </header>

      <!-- Live projects from Firestore (collection: projects) -->
      <div v-if="projects && projects.length" class="portfolio-grid" data-reveal>
        <a v-for="proj in projects" :key="proj.id" :href="proj.url || undefined"
          :target="proj.url ? '_blank' : undefined" :rel="proj.url ? 'noopener noreferrer' : undefined"
          class="portfolio-card" :class="{ 'portfolio-card--linked': !!proj.url }">
          <div class="portfolio-img">
            <img v-if="proj.imageUrl" :src="proj.imageUrl" :alt="proj.title" loading="lazy">
            <UIcon v-else name="i-heroicons-photo" class="w-10 h-10 opacity-10" />
          </div>
          <div class="portfolio-meta">
            <span class="portfolio-industry">{{ proj.industry }}</span>
            <h3>{{ proj.title }}</h3>
            <p>{{ proj.description }}</p>
          </div>
        </a>
      </div>

      <!-- Empty state shown until first real projects are added via /admin -->
      <div v-else class="portfolio-empty" data-reveal>
        <p class="portfolio-empty-headline">First projects in progress.</p>
        <p class="portfolio-empty-sub">
          Ask about being an early client — discounted builds available for businesses in Kankakee County.
        </p>
        <a href="#contact" class="btn-ghost">Let's talk →</a>
      </div>
    </section>

    <!-- ── TESTIMONIALS ─────────────────────────────────────────────── -->
    <section v-if="testimonials && testimonials.length" class="wrap section-gap">
      <header class="section-header" data-reveal>
        <p class="eyebrow">What Clients Say</p>
        <h2>Built on real results</h2>
      </header>
      <div class="testimonial-grid">
        <div v-for="(t, i) in testimonials" :key="t.id" class="testimonial-card glass-card" data-reveal
          :data-reveal-delay="i * 100">
          <p class="testimonial-quote">"{{ t.quote }}"</p>
          <div class="testimonial-author">
            <p class="testimonial-name">{{ t.name }}</p>
            <p class="testimonial-biz">{{ t.businessName }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── ABOUT ──────────────────────────────────────────────────────── -->
    <section class="wrap section-gap">
      <div class="about-inner" data-reveal>
        <div class="about-photo" aria-hidden="true">
          <div class="about-photo-ring">
            <!-- TODO: replace with <img src="/your-photo.jpg" alt="[Your Name]"> -->
            <span class="about-initials">JJ</span>
          </div>
        </div>
        <div class="about-text">
          <p class="eyebrow">The Person Behind It</p>
          <h2>Built by someone who lives here too.</h2>
          <section class="max-w-3xl mx-auto p-6 text-white font-sans leading-relaxed">
            <p class="mb-4">
              I’m JJ. I’m a Manteno local, a husband, and a father of three.
            </p>

            <p class="mb-4">
              I didn’t start ILYTAT to be a non-profit or a "big city" agency that speaks in marketing fluff. I started
              it to make money by doing something I’m actually good at: building clean, fast, high-performance websites.
            </p>

            <p class="mb-6">
              I believe everyone should have a way to voice who they are and what they do. The internet is the best way
              to do that, but I’ve seen too many local owners get stuck in "rent-to-own" schemes or bloated templates
              that run like lead. I’m here to provide a better alternative.
            </p>

            <h2 class="text-xl font-bold mb-3">Here’s the deal:</h2>

            <ul class="list-disc pl-6 space-y-3 mb-6">
              <li>
                <strong>You Own the Asset:</strong> I build it, you own it. No "locking" you into a platform where you
                lose your site if you leave.
              </li>
              <li>
                <strong>Simple Hosting:</strong> I handle the technical heavy lifting—security, speed, and
                maintenance—for a flat $50/month.
              </li>
              <li>
                <strong>No Fluff:</strong> I follow a strict developer philosophy—simplicity and scalability. You get a
                site that works as hard as you do, documented so well that anyone could step in and manage it.
              </li>
            </ul>

            <p class="font-semibold text-lg border-t pt-4">
              I’m a developer who gives a damn about the work and the paycheck, which means I have every incentive to
              make sure your site actually performs.
            </p>
          </section>
          <div class="about-contact">
            <UIcon name="i-heroicons-phone" class="w-4 h-4" />
            <a href="tel:+17086271854">(708) 627-1854</a>
            <span class="about-contact-note">· text or call</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ── FAQ ────────────────────────────────────────────────────────── -->
    <section class="faq-section">
      <div class="wrap">
        <header class="section-header" data-reveal>
          <p class="eyebrow">Common Questions</p>
          <h2>Straight answers</h2>
        </header>
        <div class="faq-list">
          <details v-for="(item, i) in faqs" :key="item.q" class="faq-item" data-reveal :data-reveal-delay="i * 60">
            <summary class="faq-question">{{ item.q }}</summary>
            <p class="faq-answer">{{ item.a }}</p>
          </details>
        </div>
      </div>
    </section>

    <!-- ── CTA BAND ──────────────────────────────────────────────────── -->
    <div class="cta-band" data-reveal>
      <div class="cta-band-glow" aria-hidden="true" />
      <div class="cta-band-inner">
        <h2>Ready to look as good online<br>as you do in person?</h2>
        <p>Tell us about your business and we'll get back to you within 24 hours.</p>
        <a href="#contact" class="btn-primary btn-primary--lg">Start the Conversation</a>
      </div>
    </div>

    <!-- ── CONTACT ────────────────────────────────────────────────────── -->
    <section id="contact" class="contact-section">
      <div class="contact-inner">
        <!-- Left: context -->
        <div class="contact-context" data-reveal>
          <p class="eyebrow">Get In Touch</p>
          <h2>Let's build something.</h2>
          <p class="contact-blurb">
            Fill out the form and I'll get back to you within 24 hours.
            No sales pressure — just a straight conversation about what you need.
          </p>
          <ul class="contact-promises">
            <li>
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
              Free quote, no obligation
            </li>
            <li>
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
              Response within 24 hours
            </li>
            <li>
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
              You own everything we build
            </li>
          </ul>
        </div>

        <!-- Right: form -->
        <div class="contact-form-wrap" data-reveal data-reveal-delay="100">
          <div v-if="submitted" class="submit-success">
            <div class="success-ring">
              <UIcon name="i-heroicons-check" class="w-6 h-6" />
            </div>
            <p class="success-title">Message sent!</p>
            <p class="success-body">I'll be in touch within 24 hours.</p>
          </div>

          <form v-else @submit.prevent="handleSubmit">
            <div class="form-row">
              <div class="fgroup">
                <label>Your Name</label>
                <input v-model="form.name" type="text" placeholder="Jane Smith" required>
              </div>
              <div class="fgroup">
                <label>Business Name</label>
                <input v-model="form.businessName" type="text" placeholder="Jane's Bakery" required>
              </div>
            </div>
            <div class="form-row">
              <div class="fgroup">
                <label>Email <span class="req">*</span></label>
                <input v-model="form.email" type="email" placeholder="jane@email.com" required>
              </div>
              <div class="fgroup">
                <label>Phone <span class="opt">(optional)</span></label>
                <input v-model="form.phone" type="tel" placeholder="(815) 555-1234">
              </div>
            </div>
            <div class="fgroup">
              <label>Package Interest</label>
              <div class="select-wrap">
                <select v-model="form.service">
                  <option value="">Select a package…</option>
                  <option value="Starter — $299">Starter — $299</option>
                  <option value="Professional — $499">Professional — $499</option>
                  <option value="Premium — $799">Premium — $799</option>
                  <option value="Not sure yet">Not sure yet</option>
                </select>
                <UIcon name="i-heroicons-chevron-down" class="select-arrow w-4 h-4" />
              </div>
            </div>
            <div class="fgroup">
              <label>Tell me about your business</label>
              <textarea v-model="form.message" rows="5"
                placeholder="What do you do? Do you have an existing website? What matters most to you?" required />
            </div>
            <p v-if="submitError" class="form-error">{{ submitError }}</p>
            <button type="submit" class="submit-btn" :disabled="submitting">
              {{ submitting ? 'Sending…' : 'Send Message →' }}
            </button>
          </form>
        </div>
      </div>
    </section>

    <!-- ── FOOTER ─────────────────────────────────────────────────────── -->
    <footer class="footer">
      <div class="footer-left">
        <img src="https://media.ilytat.com/logo.png" alt="ILYTAT" class="footer-logo-img" height="24">
        <span class="footer-sub">Websites for local businesses · Manteno, IL</span>
        <span class="footer-contact">
          Built by JJ ·
          <a href="tel:+17086271854" class="footer-tel">(708) 627-1854</a>
        </span>
      </div>
      <div class="footer-right">
        <a href="/privacy" class="footer-link">Privacy Policy</a>
        <span class="footer-copy">© {{ new Date().getFullYear() }} ILYTAT LLC</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════════
   TOKENS
═══════════════════════════════════════════════════════════════ */
.site {
  --bg: #0f0f11;
  --bg-alt: #141417;
  --surface: #1a1a1f;
  --surface-hi: #222228;
  --border: #2a2a32;
  --border-dim: #1e1e26;
  --text: #f0ece6;
  --text-dim: #b8b4ae;
  --muted: #68667a;
  --muted-hi: #8e8ba0;

  /* Amber-gold → ILYTAT orange gradient — the brand signature */
  --accent: #f5c518;
  --accent-b: #f09420;
  /* endpoint of gradient (orange side) */
  --accent-dim: #d4a912;
  --accent-glow: rgba(245, 197, 24, 0.08);
  --accent-glow2: rgba(245, 197, 24, 0.04);

  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', sans-serif;
  line-height: 1.65;
  min-height: 100vh;
  overflow-x: hidden;
}

/* ═══════════════════════════════════════════════════════════════
   GRAIN
═══════════════════════════════════════════════════════════════ */
.grain {
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  opacity: 0.028;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 256px 256px;
}

/* ═══════════════════════════════════════════════════════════════
   TYPOGRAPHY UTILITIES
═══════════════════════════════════════════════════════════════ */
.eyebrow {
  font-family: 'Space Mono', monospace;
  font-size: 10.5px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--accent);
  opacity: 0.8;
  margin-bottom: 14px;
  display: block;
}

.mono-xs {
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--border);
}

/* ═══════════════════════════════════════════════════════════════
   NAV
═══════════════════════════════════════════════════════════════ */
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 90;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 48px;
  transition: background 0.4s ease, border-color 0.4s ease, padding 0.3s ease;
  border-bottom: 1px solid transparent;
}

.nav--scrolled {
  background: rgba(15, 15, 17, 0.88);
  backdrop-filter: blur(16px);
  border-color: var(--border-dim);
  padding: 14px 48px;
}

.nav-logo-img {
  display: block;
  height: 32px;
  width: auto;
  object-fit: contain;
}

.footer-logo-img {
  display: block;
  height: 24px;
  width: auto;
  object-fit: contain;
  margin-bottom: 4px;
}

.logo {
  font-family: 'Space Mono', monospace;
  font-size: 16px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: -0.5px;
  user-select: none;
}

.logo span {
  color: var(--muted);
  font-weight: 400;
}

.logo--sm {
  font-size: 13px;
}

.nav-cta {
  font-size: 13px;
  font-weight: 600;
  color: var(--bg);
  background: var(--accent);
  padding: 9px 22px;
  border-radius: 5px;
  text-decoration: none;
  letter-spacing: 0.1px;
  transition: background 0.2s, transform 0.15s;
}

.nav-cta:hover {
  background: var(--accent-dim);
  transform: translateY(-1px);
}

/* ═══════════════════════════════════════════════════════════════
   HERO
═══════════════════════════════════════════════════════════════ */
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120px 48px 80px;
  overflow: hidden;
}

/* Background layers */
.hero-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(245, 197, 24, 0.055) 1px, transparent 1px);
  background-size: 30px 30px;
  mask-image: radial-gradient(ellipse 75% 75% at 50% 40%, black 20%, transparent 80%);
  pointer-events: none;
}

.hero-glow {
  position: absolute;
  pointer-events: none;
}

.hero-glow--center {
  width: 600px;
  height: 600px;
  left: 50%;
  top: 40%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(245, 197, 24, 0.06), transparent 65%);
  animation: pulse 7s ease-in-out infinite;
}

.hero-glow--bottom {
  bottom: -80px;
  left: 50%;
  transform: translateX(-50%);
  width: 900px;
  height: 300px;
  background: radial-gradient(ellipse, rgba(240, 148, 32, 0.05), transparent 65%);
}

@keyframes pulse {

  0%,
  100% {
    opacity: 0.6;
    transform: translate(-50%, -50%) scale(1);
  }

  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.12);
  }
}

/* Hero content */
.hero-body {
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 780px;
}

.hero-eyebrow {
  animation: fade-up 0.8s ease both;
}

.hero-h1 {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 28px;
}

.hero-h1-line1 {
  font-family: 'Sora', sans-serif;
  font-size: clamp(36px, 6vw, 68px);
  font-weight: 300;
  letter-spacing: -2.5px;
  line-height: 1.05;
  color: var(--text-dim);
  animation: fade-up 0.8s 0.1s ease both;
}

.hero-h1-line2 {
  font-family: 'Sora', sans-serif;
  font-size: clamp(40px, 6.5vw, 74px);
  font-weight: 800;
  letter-spacing: -3px;
  line-height: 1.0;
  background: linear-gradient(110deg, var(--accent) 30%, var(--accent-b) 90%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: fade-up 0.8s 0.18s ease both;
}

.hero-sub {
  font-size: clamp(15px, 1.6vw, 18px);
  color: var(--muted-hi);
  max-width: 520px;
  margin: 0 auto 40px;
  line-height: 1.8;
  animation: fade-up 0.8s 0.3s ease both;
}

.hero-ctas {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  animation: fade-up 0.8s 0.42s ease both;
}

/* Scroll indicator */
.hero-scroll {
  position: absolute;
  bottom: 36px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  letter-spacing: 2px;
  text-transform: uppercase;
  z-index: 2;
  animation: fade-up 1s 0.8s ease both;
}

.hero-scroll-line {
  width: 1px;
  height: 36px;
  background: linear-gradient(to bottom, var(--muted), transparent);
  animation: scroll-line 1.8s ease-in-out infinite;
}

@keyframes scroll-line {
  0% {
    transform: scaleY(0);
    transform-origin: top;
    opacity: 0;
  }

  40% {
    transform: scaleY(1);
    transform-origin: top;
    opacity: 1;
  }

  60% {
    transform: scaleY(1);
    transform-origin: bottom;
    opacity: 1;
  }

  100% {
    transform: scaleY(0);
    transform-origin: bottom;
    opacity: 0;
  }
}

/* ═══════════════════════════════════════════════════════════════
   BUTTONS
═══════════════════════════════════════════════════════════════ */
.btn-primary {
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--bg);
  background: var(--accent);
  padding: 13px 30px;
  border-radius: 6px;
  text-decoration: none;
  letter-spacing: 0.1px;
  transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
  box-shadow: 0 2px 16px rgba(245, 197, 24, 0.2);
}

.btn-primary:hover {
  background: var(--accent-dim);
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(245, 197, 24, 0.3);
}

.btn-primary--lg {
  font-size: 16px;
  padding: 16px 40px;
  border-radius: 8px;
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--muted-hi);
  padding: 13px 24px;
  border-radius: 6px;
  text-decoration: none;
  border: 1px solid var(--border);
  transition: border-color 0.2s, color 0.2s, transform 0.15s;
}

.btn-ghost:hover {
  border-color: color-mix(in srgb, var(--accent) 50%, transparent);
  color: var(--accent);
  transform: translateY(-2px);
}

/* ═══════════════════════════════════════════════════════════════
   PILLARS
═══════════════════════════════════════════════════════════════ */
.pillars {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--border-dim);
  border-bottom: 1px solid var(--border-dim);
  background: var(--bg-alt);
}

.pillar {
  padding: 28px 28px;
  border-right: 1px solid var(--border-dim);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pillar:last-child {
  border-right: none;
}

.pillar-icon {
  width: 18px;
  height: 18px;
  color: var(--accent);
  margin-bottom: 4px;
}

.pillar-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.3;
}

.pillar-body {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}

/* ═══════════════════════════════════════════════════════════════
   SECTION LAYOUT
═══════════════════════════════════════════════════════════════ */
.wrap {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 48px;
}

.section-gap {
  padding-top: 88px;
  padding-bottom: 88px;
}

.section-header {
  text-align: center;
  margin-bottom: 56px;
}

.section-header h2 {
  font-family: 'Sora', sans-serif;
  font-size: clamp(24px, 3vw, 36px);
  font-weight: 700;
  letter-spacing: -1px;
  color: var(--text);
  margin-bottom: 12px;
}

.section-sub {
  font-size: 15px;
  color: var(--muted-hi);
  max-width: 460px;
  margin: 0 auto;
  line-height: 1.75;
}

/* ═══════════════════════════════════════════════════════════════
   SERVICES
═══════════════════════════════════════════════════════════════ */
.service-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.service-card {
  background: rgba(255, 255, 255, 0.025);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 32px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: border-color 0.25s, box-shadow 0.25s, transform 0.2s;
  cursor: default;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 4px 20px rgba(0, 0, 0, 0.3);
}

.service-card:hover {
  border-color: rgba(245, 197, 24, 0.22);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 8px 36px rgba(0, 0, 0, 0.4);
  transform: translateY(-3px);
}

.service-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.svc-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: var(--accent-glow2);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  transition: background 0.2s, border-color 0.2s;
}

.service-card:hover .svc-icon-wrap {
  background: var(--accent-glow);
  border-color: color-mix(in srgb, var(--accent) 25%, transparent);
}

.svc-tag {
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--muted);
}

.service-card h3 {
  font-family: 'Sora', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
  line-height: 1.2;
}

.service-card p {
  font-size: 14px;
  color: var(--muted-hi);
  line-height: 1.75;
}

/* ═══════════════════════════════════════════════════════════════
   PROCESS
═══════════════════════════════════════════════════════════════ */
.process-band {
  background: var(--bg-alt);
  border-top: 1px solid var(--border-dim);
  border-bottom: 1px solid var(--border-dim);
  padding: 88px 0;
}

.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.step {
  position: relative;
  background: rgba(255, 255, 255, 0.025);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 36px 28px 32px;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 4px 20px rgba(0, 0, 0, 0.3);
  transition: border-color 0.25s, transform 0.2s, box-shadow 0.2s;
}

.step:hover {
  border-color: rgba(245, 197, 24, 0.15);
  transform: translateY(-2px);
}

.step-bg-n {
  position: absolute;
  top: -12px;
  right: 16px;
  font-family: 'Sora', sans-serif;
  font-size: 88px;
  font-weight: 800;
  color: var(--accent);
  opacity: 0.04;
  line-height: 1;
  user-select: none;
  letter-spacing: -4px;
}

.step-n {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 1.5px;
  display: block;
  margin-bottom: 16px;
}

.step h3 {
  font-family: 'Sora', sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 12px;
  letter-spacing: -0.3px;
}

.step p {
  font-size: 13.5px;
  color: var(--muted-hi);
  line-height: 1.75;
}

/* ═══════════════════════════════════════════════════════════════
   GLASSMORPHISM — applied to cards throughout
═══════════════════════════════════════════════════════════════ */
.glass-card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.07);
  /* Subtle inner top-left highlight catches light */
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 4px 24px rgba(0, 0, 0, 0.35);
}

/* ═══════════════════════════════════════════════════════════════
   PRICING — section wrapper & background
═══════════════════════════════════════════════════════════════ */
.pricing-outer {
  position: relative;
  overflow: hidden;
}

/* Gradient mesh behind glass cards so blur has something rich to see through */
.pricing-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 55% 40% at 20% 30%, rgba(245, 197, 24, 0.07), transparent 65%),
    radial-gradient(ellipse 45% 35% at 80% 70%, rgba(240, 148, 32, 0.05), transparent 60%),
    radial-gradient(ellipse 60% 50% at 50% 100%, rgba(245, 197, 24, 0.04), transparent 70%),
    var(--bg-alt);
  pointer-events: none;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-items: start;
}

.price-card {
  border-radius: 18px;
  padding: 36px 28px;
  position: relative;
  transition: border-color 0.25s, box-shadow 0.25s, transform 0.2s;
}

.price-card:hover {
  border-color: rgba(245, 197, 24, 0.2);
  transform: translateY(-3px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 8px 40px rgba(0, 0, 0, 0.45);
}

.price-card--featured {
  background: rgba(245, 197, 24, 0.06) !important;
  border-color: rgba(245, 197, 24, 0.28) !important;
  box-shadow:
    inset 0 1px 0 rgba(245, 197, 24, 0.15),
    0 0 0 1px rgba(245, 197, 24, 0.12),
    0 20px 60px rgba(245, 197, 24, 0.08),
    0 4px 20px rgba(0, 0, 0, 0.4) !important;
}

.price-card--featured:hover {
  border-color: rgba(245, 197, 24, 0.45) !important;
  transform: translateY(-4px);
  box-shadow:
    inset 0 1px 0 rgba(245, 197, 24, 0.2),
    0 0 0 1px rgba(245, 197, 24, 0.2),
    0 24px 72px rgba(245, 197, 24, 0.12),
    0 4px 20px rgba(0, 0, 0, 0.5) !important;
}

.featured-badge {
  position: absolute;
  top: -12px;
  left: 28px;
  background: linear-gradient(110deg, var(--accent), var(--accent-b));
  color: var(--bg);
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 4px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* ── Monthly rate row on build cards ── */
.tier-monthly {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-wrap: wrap;
}

.tier-monthly-rate {
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
  white-space: nowrap;
}

.tier-monthly-note {
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.1px;
}

/* ── Pricing footnote ── */
.pricing-footnote {
  text-align: center;
  margin-top: 40px;
  font-size: 13px;
  color: var(--muted-hi);
  letter-spacing: 0.1px;
}

/* ── Shared tier typography ── */
.tier-name {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 16px;
}

.tier-price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
}

.tier-price {
  font-family: 'Sora', sans-serif;
  font-size: 48px;
  font-weight: 800;
  letter-spacing: -3px;
  line-height: 1;
  color: var(--text);
}


.tier-note {
  font-size: 13px;
  color: var(--muted);
  letter-spacing: 0.2px;
}

.tier-best {
  font-size: 12.5px;
  color: color-mix(in srgb, var(--accent) 70%, transparent);
  margin-bottom: 24px;
  line-height: 1.5;
}

.tier-features {
  list-style: none;
  padding: 0;
  margin: 0 0 28px;
}

.tier-features li {
  font-size: 13.5px;
  color: var(--text-dim);
  padding: 5px 0 5px 20px;
  position: relative;
  line-height: 1.5;
}

.tier-features li::before {
  content: '→';
  position: absolute;
  left: 0;
  top: 6px;
  color: var(--accent);
  font-size: 11px;
}

.price-cta {
  display: block;
  width: 100%;
  text-align: center;
  padding: 13px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-dim);
  transition: all 0.2s;
}

.price-cta:hover {
  border-color: color-mix(in srgb, var(--accent) 50%, transparent);
  color: var(--accent);
}

.price-cta--featured {
  background: linear-gradient(110deg, var(--accent), var(--accent-b));
  border-color: transparent;
  color: var(--bg);
  box-shadow: 0 2px 12px rgba(245, 197, 24, 0.25);
}

.price-cta--featured:hover {
  filter: brightness(0.92);
  color: var(--bg);
  box-shadow: 0 4px 20px rgba(245, 197, 24, 0.35);
}

/* ═══════════════════════════════════════════════════════════════
   PORTFOLIO
═══════════════════════════════════════════════════════════════ */
.portfolio-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.portfolio-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.25s, transform 0.2s, box-shadow 0.2s;
}

.portfolio-card--linked:hover {
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
  transform: translateY(-3px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
}

.portfolio-img {
  aspect-ratio: 16 / 9;
  background: var(--surface-hi);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  overflow: hidden;
}

.portfolio-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.portfolio-meta {
  padding: 20px 22px 24px;
}

.portfolio-industry {
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--accent);
  opacity: 0.7;
  display: block;
  margin-bottom: 8px;
}

.portfolio-meta h3 {
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 6px;
  letter-spacing: -0.2px;
}

.portfolio-meta p {
  font-size: 12.5px;
  color: var(--muted-hi);
  line-height: 1.65;
}

.portfolio-placeholder {
  background: var(--surface);
  border: 1px dashed var(--border-dim);
  border-radius: 14px;
  aspect-ratio: 4 / 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--muted);
}

.placeholder-label {
  font-size: 12.5px;
  color: var(--muted);
}

/* ═══════════════════════════════════════════════════════════════
   CTA BAND
═══════════════════════════════════════════════════════════════ */
.cta-band {
  position: relative;
  margin: 88px 48px;
  border-radius: 20px;
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  overflow: hidden;
  background: color-mix(in srgb, var(--surface) 85%, transparent);
}

.cta-band-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 60% 70% at 50% 100%, rgba(245, 197, 24, 0.07), transparent 70%);
  pointer-events: none;
}

.cta-band-inner {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 72px 48px;
}

.cta-band-inner h2 {
  font-family: 'Sora', sans-serif;
  font-size: clamp(24px, 3.5vw, 40px);
  font-weight: 700;
  letter-spacing: -1.5px;
  color: var(--text);
  margin-bottom: 14px;
  line-height: 1.15;
}

.cta-band-inner p {
  font-size: 16px;
  color: var(--muted-hi);
  margin-bottom: 36px;
}

/* ═══════════════════════════════════════════════════════════════
   CONTACT
═══════════════════════════════════════════════════════════════ */
.contact-section {
  border-top: 1px solid var(--border-dim);
  background: var(--bg-alt);
  padding: 88px 48px;
}

.contact-inner {
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 80px;
  align-items: start;
}

.contact-context h2 {
  font-family: 'Sora', sans-serif;
  font-size: clamp(26px, 3vw, 36px);
  font-weight: 700;
  letter-spacing: -1px;
  color: var(--text);
  margin-bottom: 16px;
  line-height: 1.15;
}

.contact-blurb {
  font-size: 15px;
  color: var(--muted-hi);
  line-height: 1.8;
  margin-bottom: 28px;
}

.contact-promises {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contact-promises li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  color: var(--text-dim);
}

.contact-promises li :deep(svg),
.contact-promises li .icon {
  color: var(--accent);
  flex-shrink: 0;
}

/* Form */
.contact-form-wrap {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 36px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 8px 40px rgba(0, 0, 0, 0.35);
}

form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.fgroup {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.fgroup label {
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  letter-spacing: 0.2px;
}

.req {
  color: var(--accent);
}

.opt {
  font-size: 10px;
  opacity: 0.5;
}

.fgroup input,
.fgroup textarea {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 11px 14px;
  color: var(--text);
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  outline: none;
  width: 100%;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.fgroup input:focus,
.fgroup textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(245, 197, 24, 0.07);
}

.fgroup input::placeholder,
.fgroup textarea::placeholder {
  color: color-mix(in srgb, var(--muted) 50%, transparent);
}

.fgroup textarea {
  resize: vertical;
}

.select-wrap {
  position: relative;
}

.select-wrap select {
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 11px 36px 11px 14px;
  color: var(--text);
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  appearance: none;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.select-wrap select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(245, 197, 24, 0.07);
}

.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  pointer-events: none;
}

.form-error {
  font-size: 13px;
  color: #f87171;
  padding: 10px 14px;
  background: rgba(248, 113, 113, 0.06);
  border: 1px solid rgba(248, 113, 113, 0.15);
  border-radius: 8px;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(110deg, var(--accent), var(--accent-b));
  color: var(--bg);
  border: none;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.2s, transform 0.15s, box-shadow 0.2s;
  box-shadow: 0 2px 16px rgba(245, 197, 24, 0.2);
  margin-top: 4px;
}

.submit-btn:hover:not(:disabled) {
  filter: brightness(0.92);
  transform: translateY(-1px);
  box-shadow: 0 4px 24px rgba(245, 197, 24, 0.3);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56px 24px;
  text-align: center;
}

.success-ring {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  background: var(--accent-glow);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  margin-bottom: 20px;
}

.success-title {
  font-family: 'Sora', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
}

.success-body {
  font-size: 14px;
  color: var(--muted-hi);
}

/* ═══════════════════════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════════════════════ */
.footer {
  padding: 28px 48px;
  border-top: 1px solid var(--border-dim);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  background: var(--bg);
}

.footer-left {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.footer-sub {
  font-size: 11.5px;
  color: var(--muted);
}

.footer-copy {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  color: var(--muted);
}

/* ═══════════════════════════════════════════════════════════════
   REVEAL ANIMATIONS
═══════════════════════════════════════════════════════════════ */
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

[data-reveal] {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.7s ease, transform 0.7s ease;
}

[data-reveal].is-revealed {
  opacity: 1;
  transform: none;
}

/* ═══════════════════════════════════════════════════════════════
   RESPONSIVE
═══════════════════════════════════════════════════════════════ */
@media (max-width: 1024px) {

  .service-grid,
  .steps,
  .pricing-grid,
  .portfolio-grid {
    grid-template-columns: 1fr 1fr;
  }

  .contact-inner {
    grid-template-columns: 1fr;
    gap: 48px;
  }

}

@media (max-width: 768px) {
  .nav {
    padding: 16px 24px;
  }

  .nav--scrolled {
    padding: 12px 24px;
  }

  .hero {
    padding: 100px 24px 64px;
  }

  .wrap {
    padding: 0 24px;
  }

  .pillars {
    grid-template-columns: 1fr 1fr;
  }

  .pillar:nth-child(2) {
    border-right: none;
  }

  .pillar:nth-child(3),
  .pillar:nth-child(4) {
    border-top: 1px solid var(--border-dim);
  }

  .pillar:nth-child(3) {
    border-right: 1px solid var(--border-dim);
  }

  .contact-section {
    padding: 64px 24px;
  }

  .contact-form-wrap {
    padding: 24px;
  }

  .cta-band {
    margin: 64px 24px;
    border-radius: 14px;
  }

  .cta-band-inner {
    padding: 48px 24px;
  }

  .footer {
    padding: 24px;
    flex-direction: column;
    align-items: flex-start;
  }
}

/* ═══════════════════════════════════════════════════════════════
   PORTFOLIO EMPTY STATE
═══════════════════════════════════════════════════════════════ */
.portfolio-empty {
  text-align: center;
  padding: 72px 24px;
  border: 1px dashed rgba(255, 255, 255, 0.08);
  border-radius: 20px;
}

.portfolio-empty-headline {
  font-family: 'Sora', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 10px;
}

.portfolio-empty-sub {
  font-size: 15px;
  color: var(--muted-hi);
  max-width: 400px;
  margin: 0 auto 28px;
  line-height: 1.7;
}

/* ═══════════════════════════════════════════════════════════════
   TESTIMONIALS
═══════════════════════════════════════════════════════════════ */
.testimonial-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.testimonial-card {
  border-radius: 18px;
  padding: 32px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  transition: border-color 0.25s, transform 0.2s;
}

.testimonial-card:hover {
  border-color: rgba(245, 197, 24, 0.2);
  transform: translateY(-3px);
}

.testimonial-quote {
  font-size: 15px;
  color: var(--text-dim);
  line-height: 1.75;
  flex: 1;
  font-style: italic;
}

.testimonial-author {
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.testimonial-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 2px;
}

.testimonial-biz {
  font-size: 12px;
  color: var(--muted);
  font-family: 'Space Mono', monospace;
  letter-spacing: 0.3px;
}

/* ═══════════════════════════════════════════════════════════════
   ABOUT
═══════════════════════════════════════════════════════════════ */
.about-inner {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 56px;
  align-items: center;
}

.about-photo {
  flex-shrink: 0;
}

.about-photo-ring {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  border: 2px solid rgba(245, 197, 24, 0.3);
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 40px rgba(245, 197, 24, 0.06);
  overflow: hidden;
}

.about-photo-ring img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.about-initials {
  font-family: 'Sora', sans-serif;
  font-size: 40px;
  font-weight: 800;
  color: rgba(245, 197, 24, 0.4);
  letter-spacing: -2px;
}

.about-text {
  max-width: 560px;
}

.about-text h2 {
  font-family: 'Sora', sans-serif;
  font-size: clamp(22px, 3vw, 32px);
  font-weight: 800;
  letter-spacing: -1px;
  color: var(--text);
  margin: 10px 0 20px;
}

.about-body {
  font-size: 15px;
  color: var(--text-dim);
  line-height: 1.8;
  margin-bottom: 16px;
}

.about-contact {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  color: var(--muted-hi);
  font-size: 14px;
}

.about-contact a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 600;
}

.about-contact a:hover {
  text-decoration: underline;
}

.about-contact-note {
  color: var(--muted);
}

/* ═══════════════════════════════════════════════════════════════
   FAQ
═══════════════════════════════════════════════════════════════ */
.faq-section {
  padding: 80px 0;
}

.faq-list {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.faq-item {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.2s;
}

.faq-item[open] {
  border-color: rgba(245, 197, 24, 0.2);
}

.faq-question {
  padding: 20px 24px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
  transition: color 0.15s;
}

.faq-question::-webkit-details-marker {
  display: none;
}

.faq-question::after {
  content: '+';
  font-size: 18px;
  font-weight: 300;
  color: var(--accent);
  flex-shrink: 0;
  margin-left: 16px;
  transition: transform 0.2s;
}

.faq-item[open] .faq-question::after {
  transform: rotate(45deg);
}

.faq-item:hover .faq-question {
  color: var(--accent);
}

.faq-answer {
  padding: 0 24px 20px;
  font-size: 14.5px;
  color: var(--text-dim);
  line-height: 1.8;
}

/* ═══════════════════════════════════════════════════════════════
   FOOTER UPDATES
═══════════════════════════════════════════════════════════════ */
.footer-contact {
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
}

.footer-tel {
  color: var(--muted-hi);
  text-decoration: none;
  transition: color 0.15s;
}

.footer-tel:hover {
  color: var(--accent);
}

.footer-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.footer-link {
  font-size: 12px;
  color: var(--muted);
  text-decoration: none;
  transition: color 0.15s;
}

.footer-link:hover {
  color: var(--muted-hi);
}

@media (max-width: 1024px) {
  .about-inner {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .about-photo-ring {
    width: 120px;
    height: 120px;
  }

  .about-initials {
    font-size: 30px;
  }
}

@media (max-width: 640px) {

  .service-grid,
  .steps,
  .pricing-grid,
  .portfolio-grid,
  .testimonial-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .pillars {
    grid-template-columns: 1fr;
  }

  .pillar {
    border-right: none !important;
    border-top: 1px solid var(--border-dim);
  }

  .pillar:first-child {
    border-top: none;
  }

  .process-band {
    padding: 64px 0;
  }

  .footer-right {
    align-items: flex-start;
  }
}
</style>
