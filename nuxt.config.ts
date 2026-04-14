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

  modules: [
    '@nuxt/ui',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/eslint',
    '@pinia/nuxt',
    '@vercel/analytics',
    '@vercel/speed-insights',
  ],

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
      { name: 'Inter', provider: 'google' },
      { name: 'Sora', provider: 'google', weights: [400, 600, 700, 800] },
      { name: 'Space Mono', provider: 'google', weights: [400, 700] },
      // Playfair Display: premium serif for display headlines
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
    resendApiKey: process.env.RESEND_API_KEY,
    resendFrom: process.env.RESEND_FROM || 'ILYTAT Inquiries <noreply@ilytat.com>',
    resendInvoiceFrom: process.env.RESEND_INVOICE_FROM || '',
    notificationEmail: process.env.NOTIFICATION_EMAIL,
    cronSecret: process.env.CRON_SECRET,
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
        { rel: 'icon', type: 'image/png', href: 'https://media.ilytat.com/logo.png' },
      ],
      // Plausible analytics — only injected when PLAUSIBLE_DOMAIN is set in .env
      script: process.env.PLAUSIBLE_DOMAIN
        ? [{ src: 'https://plausible.io/js/script.js', defer: true, 'data-domain': process.env.PLAUSIBLE_DOMAIN }]
        : [],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
  },
})
