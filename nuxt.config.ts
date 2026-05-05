import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4,
  },

  experimental: {
    // Use the browser's native View Transitions API for page navigation.
    // Pages cross-fade natively without any JS transition overhead.
    // Falls back to the CSS .page-enter/leave transitions in Safari <18 / Firefox <130.
    viewTransition: true,
  },

  modules: [
    '@nuxt/ui',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/eslint',
    '@pinia/nuxt',
    '@vercel/analytics',
    '@vercel/speed-insights',
    'nuxt-turnstile',
  ],

  turnstile: {
    // Public site key — safe to expose to the browser.
    // Get from: dash.cloudflare.com → Turnstile → Add site
    siteKey: process.env.TURNSTILE_SITE_KEY || '1x00000000000000000000AA', // '1x00000000000000000000AA' = always-pass test key
  },

  image: {
    domains: ['media.ilytat.com'],
    // Blog cover images from arbitrary external URLs fall back to native <img>
    // rather than being proxied — prevents 403s on unwhitelisted domains.
    provider: 'none',
  },

  css: [resolve(__dirname, 'assets/css/main.css')],

  ui: {
    colorMode: true,
  },

  fonts: {
    families: [
      // preload: true injects <link rel="preload"> for these fonts, eliminating
      // the FOUT (flash of unstyled text) on first paint for body + heading copy.
      { name: 'Inter',   provider: 'google', preload: true },
      { name: 'Sora',    provider: 'google', weights: [400, 600, 700, 800], preload: true },
      { name: 'Space Mono', provider: 'google', weights: [400, 700] },
      // Playfair Display: premium serif for italic display headlines only
      { name: 'Playfair Display', provider: 'google', weights: [400, 700, 900], styles: ['normal', 'italic'] },
    ],
  },

  runtimeConfig: {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    stripePriceStarterBuild: process.env.STRIPE_PRICE_STARTER_BUILD,
    stripePriceProfessionalBuild: process.env.STRIPE_PRICE_PROFESSIONAL_BUILD,
    stripePricePremiumBuild: process.env.STRIPE_PRICE_PREMIUM_BUILD,
    stripePriceHostingMonthly: process.env.STRIPE_PRICE_HOSTING_MONTHLY,
    stripePriceHostingYearly: process.env.STRIPE_PRICE_HOSTING_YEARLY,
    stripePricePremiumHostingMonthly: process.env.STRIPE_PRICE_PREMIUM_HOSTING_MONTHLY,
    stripePricePremiumHostingYearly: process.env.STRIPE_PRICE_PREMIUM_HOSTING_YEARLY,
    resendApiKey: process.env.RESEND_API_KEY,
    resendFrom: process.env.RESEND_FROM || 'ILYTAT Inquiries <noreply@ilytat.com>',
    resendInvoiceFrom: process.env.RESEND_INVOICE_FROM || '',
    notificationEmail: process.env.NOTIFICATION_EMAIL,
    cronSecret: process.env.CRON_SECRET,
    turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA', // '1x000...AA' = always-pass test secret
    adminEmails: process.env.ADMIN_EMAILS || 'admin@ilytat.com',
    firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY,
    r2AccountId: process.env.R2_ACCOUNT_ID,
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    r2BucketName: process.env.R2_BUCKET_NAME || 'ilytat-internal',
    public: {
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      siteUrl: process.env.SITE_URL || 'http://localhost:3000',
      plausibleDomain: process.env.PLAUSIBLE_DOMAIN || '',
    },
  },

  serverDir: 'app/server',

  nitro: {
    preset: process.env.VERCEL ? 'vercel' : 'node-server',
    externals: {
      inline: ['@aws-sdk/client-s3'],
    },
    // SWR route rules — stale data served instantly, revalidated in background.
    routeRules: {
      // Full-page HTML cache: homepage and blog listing are served from CDN edge
      // on repeat visits; most visitors never hit the Node server at all.
      '/':     { swr: 60   }, // 60 s — matches the promo cache TTL
      '/blog': { swr: 300  }, // 5 min — blog listing changes infrequently

      // API-level cache: Firestore not queried on every page SSR
      '/api/projects':     { cache: { maxAge: 300,  swr: true } }, // 5 min
      '/api/testimonials': { cache: { maxAge: 3600, swr: true } }, // 1 hr
      '/api/promotion':    { cache: { maxAge: 60,   swr: true } }, // 1 min
    },
  },

  app: {
    head: {
      title: 'ILYTAT — Professional Websites for Local Business',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'Custom websites built for local businesses in Illinois. You own everything. Managed hosting from $89/mo.',
        },
        { property: 'og:title', content: 'ILYTAT — Professional Websites for Local Business' },
        {
          property: 'og:description',
          content: 'Websites built for local businesses. One flat build price. $89/month for everything else.',
        },
        { property: 'og:type', content: 'website' },
        { property: 'og:image', content: 'https://media.ilytat.com/logo.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'theme-color', content: '#0f0f11' },
      ],
      link: [
        { rel: 'icon',        type: 'image/png', href: 'https://media.ilytat.com/logo.png' },
        // Preconnect eliminates the DNS + TLS handshake latency on first image request
        { rel: 'preconnect',  href: 'https://media.ilytat.com' },
        { rel: 'dns-prefetch', href: 'https://media.ilytat.com' },
      ],
      // Plausible analytics — only injected when PLAUSIBLE_DOMAIN is set in .env
      script: process.env.PLAUSIBLE_DOMAIN
        ? [{ src: 'https://plausible.io/js/script.js', defer: true, 'data-domain': process.env.PLAUSIBLE_DOMAIN }]
        : [],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
  },
})
