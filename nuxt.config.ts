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
    ],
  },

  runtimeConfig: {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    public: {
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      siteUrl: process.env.SITE_URL || 'http://localhost:3000',
    },
  },

  serverDir: 'app/server',

  nitro: {
    preset: 'node-server',
  },

  app: {
    head: {
      title: 'ILYTAT Sites — Websites & Marketing for Local Businesses',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Professional websites, fliers, QR codes, and marketing materials designed specifically for small and local businesses.',
        },
        { property: 'og:title', content: 'ILYTAT Sites — Built for Local Business' },
        {
          property: 'og:description',
          content: 'Get a stunning website and marketing materials without the agency price tag.',
        },
        { property: 'og:type', content: 'website' },
        { name: 'theme-color', content: '#0f172a' },
      ],
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
  },
})
