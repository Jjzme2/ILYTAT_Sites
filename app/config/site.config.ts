/**
 * Site Configuration Module
 * * Intent: Centralizes all static content, pricing, and feature arrays used across the application.
 * Rationale (12-Month Rule): Separating data from UI components enforces a Configuration-Driven Architecture, 
 * allowing non-technical updates to pricing or copy without risking regressions in Vue component logic.
 */

const monthlyRate = '$89'

export const siteConfig = {
    monthlyRate,
    priceRange: '$499–$1,499', // Used dynamically in SEO schema

    pillars: [
        { icon: 'i-heroicons-lock-closed', title: 'You own your site' },
        { icon: 'i-heroicons-currency-dollar', title: 'Simple, clear pricing' },
        { icon: 'i-heroicons-shield-check', title: 'Fully managed' },
        { icon: 'i-heroicons-arrow-path', title: 'Revisions included' },
    ],

    services: [
        {
            tag: 'Retail & Services',
            title: 'Local Business Sites',
            body: 'Shops, salons, offices — everything a customer needs at a glance. Hours, location, contact, and a reason to choose you.',
        },
        {
            tag: 'Food & Beverage',
            title: 'Restaurants & Food',
            body: 'Menus, hours, reservations, and ordering links. Get off Facebook and start showing up in Google searches.',
        },
        {
            tag: 'Trades & Contractors',
            title: 'Contractors & Trades',
            body: 'Photo galleries, service areas, quote request forms. Look as professional online as you are on the job.',
        },
        {
            tag: 'Local Events',
            title: 'Local Events',
            body: 'Event pages, ticket sales, and promotion. Get your event in front of the right people.',
        }
    ],

    steps: [
        {
            n: '01',
            title: 'Tell us about your business',
            body: "Fill out the form below. Share your services, your goals, any materials you have. The more we know, the better the result.",
        },
        {
            n: '02',
            title: 'We design and build it',
            body: "You'll see the site before it's finalized. Revisions are built into every package — no surprises, no rush.",
        },
        {
            n: '03',
            title: 'Your site goes live — and stays live',
            body: `We launch your site and handle everything technical. Hosting, SSL, domain, and small updates are covered for ${monthlyRate}/month. First month is free.`,
        },
    ],

    aboutStats: [
        { value: '100%', label: 'Client ownership' },
        { value: monthlyRate, label: 'Monthly hosting' },
        { value: '24h', label: 'Response time' },
    ],

    subscriptions: {
        STANDARD_HOSTING: {
            isRequired: true,
            price: 89,
            billingCycle: 'monthly',
            features: [
                'Vercel Edge-Network Hosting',
                'Custom Domain Name & Automated SSL',
                'Up to 30 Minutes of Minor Content Edits/mo',
                '99.9% Uptime Guarantee',
                'Monthly Traffic Analytics'
            ]
        },

        PREMIUM_HOSTING: {
            isRequired: true,
            price: 149,
            billingCycle: 'monthly',
            features: [
                'Vercel Edge-Network Hosting',
                'Custom Domain Name & Automated SSL',
                'Up to 60 Minutes of Priority Content Edits/mo',
                'Firestore Database Maintenance',
                'Priority Support & Security Patching'
            ]
        },

        // YEARLY - 2 months free
        STANDARD_HOSTING_YEARLY: {
            isRequired: true,
            price: 89 * 10,
            billingCycle: 'yearly',
            features: [
                'Vercel Edge-Network Hosting',
                'Custom Domain Name & Automated SSL',
                'Up to 30 Minutes of Minor Content Edits/mo',
                '99.9% Uptime Guarantee',
                'Monthly Traffic Analytics'
            ]
        },

        PREMIUM_HOSTING_YEARLY: {
            isRequired: true,
            price: 149 * 10,
            billingCycle: 'yearly',
            features: [
                'Vercel Edge-Network Hosting',
                'Custom Domain Name & Automated SSL',
                'Up to 60 Minutes of Priority Content Edits/mo',
                'Firestore Database Maintenance',
                'Priority Support & Security Patching'
            ]
        }
    },

    packages: [
        {
            name: 'Pop-Up',
            includeStartingAt: false,
            price: '$499',
            note: 'one-time build',
            best: 'Businesses that need a presence fast',
            features: [
                'Single-Page Landing Site',
                'Done-For-You Copywriting',
                'Event/Lead Capture Form (Email Delivery)',
                'Mobile-First Design',
                'Rapid 1-Week Deployment'
            ],
            delivery: '1 week',
            featured: false,
        },
        {
            name: 'Local Business',
            includeStartingAt: false,
            price: '$999',
            note: 'one-time build',
            best: 'Businesses that need a professional online presence',
            features: [
                'Up to 5 Custom Pages',
                'Targeted Industry Copywriting',
                'Quote & Contact Forms (Email Delivery)',
                'Complete SEO & Local Search Setup',
                'Google Business Profile Integration'
            ],
            delivery: '2 weeks',
            featured: true,
        },
        {
            name: 'Web Application',
            includeStartingAt: true,
            price: '$2,999',
            note: 'one-time build',
            best: 'Businesses that need full functionality',
            features: [
                'Custom Admin Dashboard / CMS',
                'Secure User Authentication via Firebase',
                'Dynamic Database Integration using Firebase/Supabase',
                'Stripe / Payment Integration',
                'Third-Party API Integrations'
            ],
            delivery: '3–5 weeks',
            featured: false,
        },
    ],

    faqs: [
        {
            q: 'Do I need to already have a domain?',
            a: `No — domain registration and management are included in the ${monthlyRate}/month plan. If you already own a domain, we'll point it to your new site at no extra cost.`,
        },
        {
            q: `When does the ${monthlyRate}/month start?`,
            a: `Month two. Your first month of hosting is always free — so your site is live and running before any billing begins. After that it's a flat ${monthlyRate}/month with no surprises.`,
        },
        {
            q: 'What platform will my site be built on?',
            a: "Sites are custom-built — not WordPress, not Wix, not Squarespace. They load faster, rank better, and I maintain them directly so you never have to log in to anything.",
        },
        {
            q: 'What happens if I need changes after the site is delivered?',
            a: `Small updates — text edits, photo swaps, hours changes — are covered under the ${monthlyRate}/month plan. Larger additions like new pages or features are quoted separately at fair rates.`,
        },
        {
            q: 'Will you help me set up Google Business Profile?',
            a: "Yes — I'm happy to walk you through it or do it for you. Mention it in your inquiry and we'll include it in the conversation.",
        },
        {
            q: 'Can you work with my existing logo and branding?',
            a: "Absolutely. Send over what you have — logo files, brand colors, photos — and we'll build around it. No logo yet? I can work with what you have or point you to the right person.",
        },
    ]
}