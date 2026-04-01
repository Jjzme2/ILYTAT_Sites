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
  ],

  css: [resolve(__dirname, 'assets/css/main.css')],

  ui: {
    colorMode: true,
  },

  fonts: {
    families: [
      { name: 'Inter', provider: 'google' },
      { name: 'Sora', provider: 'google', weights: [400, 600, 700, 800] },
      { name: 'Space Mono', provider: 'google', weights: [400, 700] },
    ],
  },

  runtimeConfig: {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    resendApiKey: process.env.RESEND_API_KEY,
    resendFrom: process.env.RESEND_FROM || 'ILYTAT Inquiries <noreply@ilytat.com>',
    notificationEmail: process.env.NOTIFICATION_EMAIL,
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
    preset: 'node-server',
  },

  app: {
    head: {
      title: 'ILYTAT — Professional Websites for Local Business',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'Custom websites built for local businesses in Illinois. You own everything. Managed hosting from $50/mo.',
        },
        { property: 'og:title', content: 'ILYTAT — Professional Websites for Local Business' },
        {
          property: 'og:description',
          content: 'Websites built for local businesses. One flat build price. $50/month for everything else.',
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
