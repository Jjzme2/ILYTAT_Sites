import type { Service } from '~/types'

export const SERVICES: Service[] = [
  {
    id: 'website',
    name: 'Business Website',
    slug: 'website',
    tagline: 'Your storefront on the internet',
    description:
      'A professionally designed, mobile-friendly website delivered as clean, ready-to-deploy code. You own it fully — host it anywhere, modify it anytime.',
    icon: 'i-heroicons-globe-alt',
    category: 'web',
    features: [
      'Custom design tailored to your brand',
      'Mobile-first, responsive layout',
      'Fast loading & SEO optimized',
      'Contact form & Google Maps integration',
      'Social media links & integrations',
      'Full source code delivered to you',
    ],
    packages: [
      {
        id: 'website-starter',
        name: 'Starter',
        price: 499,
        priceId: 'price_website_starter',
        description: 'Perfect for getting online fast',
        turnaround: '5–7 business days',
        features: [
          '3-page site (Home, About, Contact)',
          'Mobile responsive design',
          'Contact form (client-side)',
          'Basic SEO setup',
          '2 revision rounds',
          'Full source code handoff',
          'Hosting setup guide included',
        ],
      },
      {
        id: 'website-pro',
        name: 'Professional',
        price: 999,
        priceId: 'price_website_pro',
        description: 'Everything you need to grow',
        turnaround: '7–10 business days',
        popular: true,
        features: [
          'Up to 7 pages',
          'Premium custom design',
          'Gallery / portfolio section',
          'Blog setup',
          'Full SEO optimization',
          'Google Analytics integration',
          '4 revision rounds',
          'Full source code handoff',
          'Hosting setup guide included',
        ],
      },
      {
        id: 'website-ecommerce',
        name: 'E-Commerce',
        price: 1999,
        priceId: 'price_website_ecommerce',
        description: 'Sell online with confidence',
        turnaround: '10–14 business days',
        features: [
          'Full Shopify or Stripe-powered storefront',
          'Up to 50 products',
          'Secure payment processing',
          'Order notification setup',
          'Unlimited revisions',
          'Full source code handoff',
          '30-day post-launch support',
          'Data storage recommendations included',
        ],
      },
    ],
  },
  {
    id: 'flier',
    name: 'Flier Design',
    slug: 'flier',
    tagline: 'Print-ready designs that get noticed',
    description:
      'Eye-catching fliers for events, promotions, grand openings, and more. Delivered as print-ready PDFs and digital-ready files — yours to use forever.',
    icon: 'i-heroicons-document-text',
    category: 'print',
    features: [
      'Print & digital formats included',
      'Professional typography',
      'Brand-consistent design',
      'Print-ready 300 DPI files',
      'Multiple size options',
      'Fast 24–48hr turnaround available',
    ],
    packages: [
      {
        id: 'flier-basic',
        name: 'Single Flier',
        price: 79,
        priceId: 'price_flier_basic',
        description: 'One professional flier design',
        turnaround: '2–3 business days',
        features: [
          '1 flier design (your choice of size)',
          'Print-ready PDF (300 DPI)',
          'Digital version (PNG/JPG)',
          '2 revision rounds',
          'Source file included',
        ],
      },
      {
        id: 'flier-pack',
        name: 'Flier Pack',
        price: 199,
        priceId: 'price_flier_pack',
        description: 'Get more, spend less',
        turnaround: '3–5 business days',
        popular: true,
        features: [
          '3 flier designs',
          'Consistent branding across all',
          'Print-ready PDFs (300 DPI)',
          'Digital & social media sizes',
          '4 revision rounds per flier',
          'All source files',
        ],
      },
      {
        id: 'flier-campaign',
        name: 'Campaign',
        price: 449,
        priceId: 'price_flier_campaign',
        description: 'Full marketing campaign materials',
        turnaround: '5–7 business days',
        features: [
          '6 matching flier designs',
          'Social media graphics (all platforms)',
          'Email banner',
          'Brand style guide',
          'Unlimited revisions',
          'All source files + assets',
        ],
      },
    ],
  },
  {
    id: 'qrcode',
    name: 'QR Code Design',
    slug: 'qrcode',
    tagline: 'Smart codes that look as good as they work',
    description:
      'Custom-branded QR codes for menus, promotions, business cards, and more. Generate one free instantly, or get a professionally styled design delivered as a high-res file.',
    icon: 'i-heroicons-qr-code',
    category: 'digital',
    features: [
      'Instant free generator available',
      'Custom colors & logo embedding',
      'High-resolution export',
      'Menu, WiFi, vCard, URL support',
      'Print-ready file delivery',
      'Use in any print or digital material',
    ],
    packages: [
      {
        id: 'qrcode-basic',
        name: 'Free Generator',
        price: 0,
        priceId: 'price_qrcode_free',
        description: 'Instant online tool, no account needed',
        turnaround: 'Instant',
        features: [
          'Custom URL, text, or vCard',
          'Color customization',
          'PNG download',
          'Standard size options',
        ],
      },
      {
        id: 'qrcode-branded',
        name: 'Branded QR',
        price: 49,
        priceId: 'price_qrcode_branded',
        description: 'With your logo & custom design',
        turnaround: '1–2 business days',
        popular: true,
        features: [
          'Logo embedded in QR code',
          'Custom shape & color design',
          'Print-ready resolution',
          'PNG, SVG, PDF formats',
          'Business card optimized version',
          '2 revision rounds',
        ],
      },
      {
        id: 'qrcode-set',
        name: 'QR Set',
        price: 129,
        priceId: 'price_qrcode_set',
        description: '5 branded QR codes for your business',
        turnaround: '2–3 business days',
        features: [
          '5 custom-designed QR codes',
          'Consistent branded style',
          'All formats (PNG, SVG, PDF)',
          'Use for menu, WiFi, socials, reviews & more',
          '2 revision rounds',
        ],
      },
    ],
  },
  {
    id: 'branding',
    name: 'Brand Identity',
    slug: 'branding',
    tagline: 'Look the part from day one',
    description:
      'A complete brand identity package so your business looks consistent and professional everywhere. All files delivered to you — no lock-in, no subscriptions.',
    icon: 'i-heroicons-sparkles',
    category: 'digital',
    features: [
      'Logo design (multiple concepts)',
      'Color palette & typography',
      'Business card design',
      'Social media profile kit',
      'Brand usage guidelines',
      'All source files delivered',
    ],
    packages: [
      {
        id: 'branding-essential',
        name: 'Essential',
        price: 299,
        priceId: 'price_branding_essential',
        description: 'The foundation of your brand',
        turnaround: '5–7 business days',
        features: [
          'Logo design (2 concepts, 3 revision rounds)',
          'Color palette',
          'Font selection',
          'Business card design',
          'All formats (PNG, SVG, PDF)',
        ],
      },
      {
        id: 'branding-complete',
        name: 'Complete',
        price: 599,
        priceId: 'price_branding_complete',
        description: 'Everything for a consistent brand',
        turnaround: '7–10 business days',
        popular: true,
        features: [
          'Logo (3 concepts, unlimited revisions)',
          'Full color palette & typography system',
          'Business card & letterhead',
          'Social media profile kit',
          'Email signature',
          'Brand style guide PDF',
          'All source files',
        ],
      },
      {
        id: 'branding-launch',
        name: 'Launch Kit',
        price: 1199,
        priceId: 'price_branding_launch',
        description: 'Launch-ready across every format',
        turnaround: '10–14 business days',
        features: [
          'Everything in Complete, plus:',
          'Landing page design (Figma/code)',
          'Social media banner set (all platforms)',
          'Presentation template',
          'Invoice & quote template',
          'Branded QR code',
          'Priority turnaround',
        ],
      },
    ],
  },
  {
    id: 'social',
    name: 'Social Media Kit',
    slug: 'social',
    tagline: 'Content that stops the scroll',
    description:
      'Professional social media graphics, banners, and post templates — delivered as editable Canva or Figma files so you can update them yourself forever.',
    icon: 'i-heroicons-photo',
    category: 'digital',
    features: [
      'All major platform formats',
      'Editable Canva or Figma templates',
      'Story, post & cover designs',
      'Brand-consistent aesthetics',
      'Edit yourself — no designer needed after',
      'Quick turnaround',
    ],
    packages: [
      {
        id: 'social-starter',
        name: 'Starter Pack',
        price: 129,
        priceId: 'price_social_starter',
        description: 'Get your profiles looking sharp',
        turnaround: '2–3 business days',
        features: [
          'Profile + cover photos (2 platforms)',
          '5 post templates',
          '2 story templates',
          'Editable Canva templates',
        ],
      },
      {
        id: 'social-pro',
        name: 'Pro Pack',
        price: 299,
        priceId: 'price_social_pro',
        description: 'Full content arsenal',
        turnaround: '4–5 business days',
        popular: true,
        features: [
          'Profile + cover photos (all platforms)',
          '15 post templates',
          '8 story templates',
          '3 highlight cover sets',
          'Editable Canva & Figma files',
          '4 revision rounds',
        ],
      },
    ],
  },
  {
    id: 'managed-hosting',
    name: 'Domain & Hosting Management',
    slug: 'managed-hosting',
    tagline: 'We handle the technical stuff so you don\'t have to',
    description:
      'An optional ongoing service where we purchase, configure, and manage your domain name and web hosting on your behalf. You get a monthly invoice — we handle everything else.',
    icon: 'i-heroicons-server',
    category: 'web',
    features: [
      'Domain registration & renewal',
      'DNS configuration & management',
      'Hosting setup & maintenance',
      'SSL certificate management',
      'Site monitoring & uptime alerts',
      'Cancel anytime',
    ],
    packages: [
      {
        id: 'managed-hosting-basic',
        name: 'Domain Only',
        price: 15,
        priceId: 'price_managed_domain',
        description: 'We register & renew your domain',
        turnaround: 'Setup within 1 business day',
        features: [
          'Domain registration (most TLDs)',
          'Annual renewal handled',
          'DNS management',
          'Transfer away anytime',
          'Billed monthly',
        ],
      },
      {
        id: 'managed-hosting-full',
        name: 'Domain + Hosting',
        price: 45,
        priceId: 'price_managed_hosting',
        description: 'Fully managed domain & hosting',
        turnaround: 'Setup within 1–2 business days',
        popular: true,
        features: [
          'Domain registration & renewal',
          'Web hosting (fast CDN-backed)',
          'SSL certificate (HTTPS)',
          'Site deployment & updates',
          'Monthly uptime monitoring',
          'Billed monthly — cancel anytime',
        ],
      },
    ],
  },
]

export const DATA_RECOMMENDATIONS = [
  {
    name: 'Firebase / Firestore',
    description: 'Google\'s real-time database. Great for forms, bookings, customer lists. Free tier is very generous for small businesses.',
    icon: 'i-simple-icons-firebase',
    url: 'https://firebase.google.com',
    bestFor: 'Real-time apps, contact forms, simple databases',
    pricing: 'Free up to generous limits',
  },
  {
    name: 'Supabase',
    description: 'Open-source Firebase alternative with a full Postgres database. Easy to self-host or use their cloud.',
    icon: 'i-simple-icons-supabase',
    url: 'https://supabase.com',
    bestFor: 'Relational data, user auth, file storage',
    pricing: 'Free tier available',
  },
  {
    name: 'Airtable',
    description: 'A spreadsheet that acts like a database. Perfect for small businesses who want to manage records without code.',
    icon: 'i-heroicons-table-cells',
    url: 'https://airtable.com',
    bestFor: 'Non-technical owners, inventory, CRM',
    pricing: 'Free for small teams',
  },
  {
    name: 'Notion',
    description: 'All-in-one workspace that can double as a lightweight CMS or content backend via their API.',
    icon: 'i-simple-icons-notion',
    url: 'https://notion.so',
    bestFor: 'Content management, team wikis, simple CMS',
    pricing: 'Free personal plan',
  },
]

export function getServiceBySlug(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug)
}

export function getPackageById(
  serviceSlug: string,
  packageId: string,
): { service: Service; pkg: Service['packages'][0] } | null {
  const service = getServiceBySlug(serviceSlug)
  if (!service) return null
  const pkg = service.packages.find((p) => p.id === packageId)
  if (!pkg) return null
  return { service, pkg }
}

export function formatPrice(price: number): string {
  if (price === 0) return 'Free'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(price)
}

export function isRecurring(packageId: string): boolean {
  return packageId.startsWith('managed-hosting')
}
