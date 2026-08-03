import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
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
    "@nuxt/ui",
    "@nuxt/fonts",
    "@nuxt/icon",
    "@nuxt/image",
    "@nuxt/eslint",
    "@vercel/analytics",
    "@vercel/speed-insights",
    "nuxt-turnstile",
  ],

  turnstile: {
    // Public site key — safe to expose to the browser.
    // Get from: dash.cloudflare.com → Turnstile → Add site
    siteKey: process.env.TURNSTILE_SITE_KEY || "1x00000000000000000000AA", // '1x00000000000000000000AA' = always-pass test key
  },

  image: {
    domains: ["media.ilytat.com"],
    // Blog cover images from arbitrary external URLs fall back to native <img>
    // rather than being proxied — prevents 403s on unwhitelisted domains.
    provider: "none",
  },

  css: [resolve(__dirname, "assets/css/main.css")],

  ui: {
    colorMode: true,
  },

  fonts: {
    families: [
      // preload: true injects <link rel="preload"> for these fonts, eliminating
      // the FOUT (flash of unstyled text) on first paint for body + heading copy.
      // display:optional — prevents the font swap from registering as a new LCP event
      // on slow connections. On fast connections the preload fires early enough that
      // the font is ready before the initial render window closes (≈100 ms).
      // Inter and Sora are the largest text on the page; late swaps are the #1 LCP killer.
      { name: "Inter", provider: "google", preload: true, display: "optional" },
      {
        name: "Sora",
        provider: "google",
        weights: [400, 600, 700, 800],
        preload: true,
        display: "optional",
      },
      // display:optional — font used only for small accent labels; no swap means no CLS
      { name: "Space Mono", provider: "google", weights: [400, 700], display: "optional" },
      // Playfair Display: the LCP element ("local business.") uses this italic face.
      // display:optional — if the font doesn't arrive within the browser's tiny initial
      // render window it stays with the fallback (Georgia) permanently, preventing the
      // late font-swap from registering as a new LCP event on slow connections.
      // Preload still fires so fast connections get the real font on first paint.
      {
        name: "Playfair Display",
        provider: "google",
        weights: [400, 700],
        styles: ["italic"],
        preload: true,
        display: "optional",
      },
    ],
  },

  runtimeConfig: {
    // ── AI ────────────────────────────────────────────────────────────────
    // OpenRouter is the primary provider: one key, one bill, and the model is
    // a config value rather than a URL path, so a retired model is an env
    // change instead of a deploy.
    openrouterApiKey: process.env.OPENROUTER_API_KEY || "",
    openrouterBaseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    // DeepSeek: roughly an order of magnitude cheaper than the Gemini/GPT tier
    // and strong at the structured-JSON work every call here does.
    openrouterModel: process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat",
    // Optional fallback.
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    // ⚠️ NAMING NOTE — "opencloud" is a misnomer.
    //
    // These were the original env var names for what was always meant to be
    // OpenRouter: the code appends /chat/completions and speaks the OpenAI
    // wire format, which is exactly OpenRouter's API. There is no product
    // called "OpenCloud" involved.
    //
    // They are still read so an existing deployment does not break, and
    // OPENROUTER_* takes precedence when both are set. Prefer OPENROUTER_*
    // everywhere; once no environment sets OPENCLOUD_* these two lines and
    // their reads in server/utils/ai.ts can be deleted.
    opencloudBaseUrl: process.env.OPENCLOUD_BASE_URL || "",
    opencloudApiKey: process.env.OPENCLOUD_API_KEY || "",
    // Daily spend guard for the public AI tools (requests/day, all IPs).
    aiDailyRequestCap: Number(process.env.AI_DAILY_REQUEST_CAP || 300),
    // Response ceiling for blog generation. OpenRouter bills against the
    // requested max_tokens, not the tokens actually used, so a large value
    // fails with 402 on a small balance even when the post would be short.
    aiBlogMaxTokens: Number(process.env.AI_BLOG_MAX_TOKENS || 2000),
    resendApiKey: process.env.RESEND_API_KEY,
    resendFrom: process.env.RESEND_FROM || "ILYTAT Inquiries <noreply@ilytat.com>",
    resendInvoiceFrom: process.env.RESEND_INVOICE_FROM || "",
    notificationEmail: process.env.NOTIFICATION_EMAIL,
    cronSecret: process.env.CRON_SECRET,
    // ⚠️ RESTRICTED KEY ONLY — must start with `rk_`.
    //
    // The site reads prices from Stripe so the pricing page cannot drift from
    // what is actually billed. Reading the product catalogue is all it needs,
    // and the catalogue is public information — it is printed on the pricing
    // page. A full `sk_` secret would additionally expose customers, charges
    // and balances and can move money, for no benefit here.
    //
    // server/utils/stripePricing.ts refuses an `sk_` key outright and falls
    // back to the committed prices, so a mistake here degrades rather than
    // leaks. Create at: Stripe → Developers → API keys → Create restricted
    // key, with Products = Read and Prices = Read, everything else None.
    //
    // Deliberately outside `public` so it never reaches the browser.
    stripeRestrictedKey: process.env.STRIPE_RESTRICTED_KEY || "",
    // Telemetry retention, enforced nightly. Both collections are append-only
    // and were previously kept forever on a billed database, while every report
    // that reads them only ever looks back 30 days.
    // Logs are short-lived — once the nightly digest has gone out, an info line
    // from six weeks ago has no reader.
    logRetentionDays: Number(process.env.LOG_RETENTION_DAYS || 45),
    // Events are kept longer so year-over-year and seasonal comparisons stay
    // possible; they are also much smaller per document.
    analyticsRetentionDays: Number(process.env.ANALYTICS_RETENTION_DAYS || 180),
    // Optional. PageSpeed Insights serves anonymous requests at a lower quota,
    // so /api/audit works without this and just gets more headroom with it.
    pagespeedApiKey: process.env.PAGESPEED_API_KEY || "",
    pagespeedApiBase: process.env.PAGESPEED_API_BASE || "",
    turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA", // '1x000...AA' = always-pass test secret
    adminEmails: process.env.ADMIN_EMAILS || "admin@ilytat.com",
    firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY,
    r2AccountId: process.env.R2_ACCOUNT_ID,
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    r2BucketName: process.env.R2_BUCKET_NAME || "ilytat-internal",
    public: {
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      siteUrl: process.env.SITE_URL || "http://localhost:3000",
      plausibleDomain: process.env.PLAUSIBLE_DOMAIN || "",
    },
  },

  serverDir: "app/server",

  nitro: {
    preset: process.env.VERCEL ? "vercel" : "node-server",
    externals: {
      inline: ["@aws-sdk/client-s3"],
    },
    // SWR route rules — stale data served instantly, revalidated in background.
    routeRules: {
      // ── Security headers ──────────────────────────────────────────────
      // None were set previously. These are the cheap, high-value ones; no
      // CSP yet because the site inlines styles and third-party scripts
      // (Turnstile, Vercel analytics, Plausible) would need enumerating
      // first — a wrong CSP breaks the contact form silently.
      "/**": {
        headers: {
          // Stop the browser guessing content types (MIME-confusion attacks).
          "X-Content-Type-Options": "nosniff",
          // Block framing — clickjacking, and nothing here needs embedding.
          "X-Frame-Options": "DENY",
          // Do not leak full URLs (which can carry query params) to third
          // parties; send origin only on cross-origin requests.
          "Referrer-Policy": "strict-origin-when-cross-origin",
          // Nothing here uses these; deny by default.
          "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          // Force HTTPS for two years, including subdomains.
          "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
        },
      },
      // Admin must never be cached by a proxy or archived by a crawler.
      "/admin/**": { headers: { "X-Robots-Tag": "noindex, nofollow, noarchive", "Cache-Control": "no-store" } },
      "/api/**": { headers: { "Cache-Control": "no-store" } },
      // Full-page HTML cache: homepage and blog listing are served from CDN edge
      // on repeat visits; most visitors never hit the Node server at all.
      "/": { swr: 60 }, // 60 s — matches the promo cache TTL
      "/blog": { swr: 300 }, // 5 min — blog listing changes infrequently

      // API-level cache: Firestore not queried on every page SSR
      "/api/projects": { cache: { maxAge: 300, swr: true } }, // 5 min
      "/api/testimonials": { cache: { maxAge: 3600, swr: true } }, // 1 hr
      "/api/promotion": { cache: { maxAge: 60, swr: true } }, // 1 min
      // Prices change a few times a year at most. Cached hard at the edge so a
      // traffic spike cannot turn into a burst of Stripe requests; the server
      // memoises for 15 minutes on top of this.
      "/api/pricing": { cache: { maxAge: 900, swr: true } }, // 15 min
      // Fortune is deterministic per-IP per-day; cache for 15 min at the edge.
      // The client also caches the result in localStorage, so repeat visitors
      // never hit this endpoint at all.
      "/api/fortune": { cache: { maxAge: 900, swr: true } }, // 15 min
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: "en" },
      title: "ILYTAT — Web Design Kankakee County IL",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content:
            "Custom websites for local businesses in Kankakee County, IL — Manteno, Bourbonnais, Bradley, Kankakee, Peotone. You own everything. Managed hosting from $89/mo.",
        },
        {
          property: "og:title",
          content: "ILYTAT — Web Design for Kankakee County Local Businesses",
        },
        {
          property: "og:description",
          content:
            "Professional websites for local businesses in Manteno, Bourbonnais, Bradley, Kankakee & Peotone. Custom-built, fast, and fully managed.",
        },
        { property: "og:type", content: "website" },
        { property: "og:image", content: "https://media.ilytat.com/og-preview.png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: "https://media.ilytat.com/og-preview.png" },
        { name: "robots", content: "index, follow" },
        // Matches --theme-bg for the default (light) theme; the previous
        // #0f0f11 was a neutral black that matched no surface on the page.
        { name: "theme-color", content: "#faf8f5" },
      ],
      link: [
        // Served locally so the tab icon does not depend on the CDN.
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        // Preconnect eliminates the DNS + TLS handshake latency on first image request
        { rel: "preconnect", href: "https://media.ilytat.com" },
        { rel: "dns-prefetch", href: "https://media.ilytat.com" },
        // Turnstile script is injected by nuxt-turnstile into every page head —
        // preconnecting saves the full DNS+TLS round-trip on slow mobile connections
        { rel: "preconnect", href: "https://challenges.cloudflare.com" },
        // Preload the logo — responsive WebP with PNG fallback for older browsers
        {
          rel: "preload",
          as: "image",
          fetchpriority: "high",
          href: "https://media.ilytat.com/logo-72.webp",
          type: "image/webp",
          imagesrcset:
            "https://media.ilytat.com/logo-72.webp, https://media.ilytat.com/logo-144.webp 2x",
        },
        // Canonical — avoids duplicate-content penalties for www vs non-www
        { rel: "canonical", href: process.env.SITE_URL || "https://sites.ilytat.com" },
      ],
      // Plausible analytics — only injected when PLAUSIBLE_DOMAIN is set in .env
      script: process.env.PLAUSIBLE_DOMAIN
        ? [
            {
              src: "https://plausible.io/js/script.js",
              defer: true,
              "data-domain": process.env.PLAUSIBLE_DOMAIN,
            },
          ]
        : [],
    },
    pageTransition: { name: "page", mode: "out-in" },
  },
});
