/**
 * Site Configuration Module
 * * Intent: Centralizes all static content, pricing, and feature arrays used across the application.
 * Rationale (12-Month Rule): Separating data from UI components enforces a Configuration-Driven Architecture, 
 * allowing non-technical updates to pricing or copy without risking regressions in Vue component logic.
 */

const monthlyRate = '$89'
const premiumRate = '$149'
// Stated rate for edits past the included time. Unbounded scope, not bad
// pricing, is what kills one-person shops on retainers.
const overageRate = '$85'

export const siteConfig = {
    monthlyRate,
    premiumRate,
    overageRate,
    // Ships in the LocalBusiness structured data on every page. Was '$499–$1,499',
    // a leftover from a retired tier that under-stated the real top end.
    priceRange: '$499–$5,000+', // Used dynamically in SEO schema

    /**
     * Profiles that represent this same business elsewhere.
     *
     * Emitted as `sameAs` on the LocalBusiness entity, which is how Google is
     * told "the site at this URL and that listing are one business". Without it
     * the site and the Google Business Profile are two unconnected things, and
     * the reviews and prominence attached to the listing do nothing for the
     * site's own results.
     *
     * ⚠️ A Google *search* URL is not a profile URL. It points at a query, not
     * an entity, and carries the searcher's own session parameters. The value
     * needed here is one of:
     *
     *   https://maps.app.goo.gl/XXXXXXXX      (Maps → your business → Share)
     *   https://www.google.com/maps/place/... (the address bar on Maps)
     *   https://www.google.com/maps?cid=123…  (the numeric profile id)
     *
     * Blank entries are dropped, so adding one is: paste, commit, deploy.
     * Nothing here is secret — every value is a public profile link.
     */
    profiles: {
        // The `?g_st=ic` the iOS share sheet appends is dropped — it records
        // which app the link was copied from, not which business it is.
        googleBusiness: 'https://maps.app.goo.gl/b9vdykozVqrsRqzr8',
        facebook: '',
        linkedin: '',
        instagram: '',
    } as Record<string, string>,

    /**
     * Towns served, each with its own page at /web-design/{slug}.
     *
     * These exist because Google ranks pages, not intentions. `areaServed` in
     * the structured data tells Google the towns are covered; it does not give
     * anyone searching "web designer bourbonnais" a page to land on.
     *
     * ── The trap these are written to avoid ──────────────────────────────
     *
     * Five pages with the town name swapped are doorway pages, and Google
     * demotes them — correctly, since they are the same page pretending to be
     * five. So each entry below leads with a genuinely different *angle*, not
     * different adjectives:
     *
     *   Manteno      home ground, and the in-person argument
     *   Kankakee     the county seat, where the competition actually is
     *   Bourbonnais  losing searches to the bigger neighbour next door
     *   Bradley      the same problem, from the retail side
     *   Peotone      a different county, routinely skipped by Kankakee firms
     *
     * Every claim here is either geography or something already true of the
     * business. Nothing asserts a local statistic, employer or landmark,
     * because a confident wrong detail on a sales page costs more than a
     * missing one.
     *
     * ⚠️ `proof` is the one thing that cannot be written from here. One real
     * sentence — a client, a job, a business you know by name — is what turns
     * these from competent into convincing, and it is the single highest-value
     * edit available on this page. Blank is handled: the section is omitted
     * rather than rendering an empty promise.
     */
    locations: [
        {
            slug: 'manteno',
            city: 'Manteno',
            county: 'Kankakee County',
            metaTitle: 'Web Design in Manteno, IL — ILYTAT',
            metaDescription: 'Custom websites for Manteno businesses, built by someone who works here. Own your code, launch in weeks, hosting from $89/month.',
            angle: 'This is home ground',
            intro: 'ILYTAT works out of Manteno. That means the person designing your site can meet you at your counter rather than on a call, and can see the thing you are trying to sell before writing a word about it.',
            emphasis: ['local-business-websites', 'restaurant-websites', 'contractor-websites'],
            proof: '',
        },
        {
            slug: 'kankakee',
            city: 'Kankakee',
            county: 'Kankakee County',
            metaTitle: 'Web Design in Kankakee, IL — ILYTAT',
            metaDescription: 'Websites for Kankakee businesses competing in the busiest search results in the county. Custom-built, fast, and yours to keep.',
            angle: 'The most competitive search results in the county',
            intro: 'Kankakee is the county seat and the biggest name in local search here, which cuts both ways: more people searching, and more businesses trying to be found. A template that loads slowly is the difference between page one and page two.',
            emphasis: ['local-business-websites', 'restaurant-websites', 'custom-software'],
            proof: '',
        },
        {
            slug: 'bourbonnais',
            city: 'Bourbonnais',
            county: 'Kankakee County',
            metaTitle: 'Web Design in Bourbonnais, IL — ILYTAT',
            metaDescription: 'Websites for Bourbonnais businesses that keep getting found last. Built to rank for your own town, not just the one next door.',
            angle: 'Getting found for your town, not the one next door',
            intro: 'Businesses in Bourbonnais lose searches to Kankakee constantly — someone searches for a service, and the results fill with the larger neighbour. Being explicit about where you are, on your own site and your Google listing, is most of the fix.',
            emphasis: ['local-business-websites', 'contractor-websites', 'event-websites'],
            proof: '',
        },
        {
            slug: 'bradley',
            city: 'Bradley',
            county: 'Kankakee County',
            metaTitle: 'Web Design in Bradley, IL — ILYTAT',
            metaDescription: 'Websites for Bradley shops and services. Fast on a phone, accurate on your hours, and built so customers can act without calling.',
            angle: 'Built for people deciding on their phone',
            intro: 'Most people looking for somewhere in Bradley are already out, already on a phone, and deciding in seconds. Are you open, what do you cost, and can I get there — a site that answers those three fast beats a prettier one that does not.',
            emphasis: ['local-business-websites', 'restaurant-websites', 'event-websites'],
            proof: '',
        },
        {
            slug: 'peotone',
            city: 'Peotone',
            county: 'Will County',
            metaTitle: 'Web Design in Peotone, IL — ILYTAT',
            metaDescription: 'Websites for Peotone businesses in Will County. Local enough to meet in person, without being priced like a Chicago agency.',
            angle: 'Close by, and not treated as an afterthought',
            intro: 'Peotone sits in Will County, which means designers focused on Kankakee tend to skip it and Chicago agencies price it like a city job. It is a short drive from Manteno, so you get someone local without the city rate.',
            emphasis: ['local-business-websites', 'contractor-websites', 'custom-software'],
            proof: '',
        },
    ],

    /**
     * Hero visual. Drop a real image at /public and point heroImage at it
     * (e.g. '/hero.jpg') and the hero renders the photo. Until then the slot
     * falls back to the typographic panel below, so it never looks unfinished.
     */
    heroImage: null as string | null,
    /**
     * Shown in the portfolio section while there are no published projects, so
     * the section still makes the case instead of rendering an empty shelf.
     */
    deliverables: [
        {
            icon: 'i-heroicons-device-phone-mobile',
            title: 'Built for phones first',
            body: 'Most local searches happen on a phone. Your site is designed for that screen before any other.',
        },
        {
            icon: 'i-heroicons-map-pin',
            title: 'Found on Google Maps',
            body: 'Local search setup and a connected Google Business Profile, so nearby customers actually find you.',
        },
        {
            icon: 'i-heroicons-inbox-arrow-down',
            title: 'Turns visitors into calls',
            body: 'Contact and quote forms that reach your inbox immediately — not a contact page nobody uses.',
        },
    ],

    heroStats: [
        { value: '1 week',     label: 'Typical build time' },
        { value: monthlyRate,  label: 'Managed hosting, per month' },
        { value: '100%',       label: 'Code ownership, yours' },
    ],

    pillars: [
        { icon: 'i-heroicons-lock-closed', title: 'You own your site' },
        { icon: 'i-heroicons-currency-dollar', title: 'Simple, clear pricing' },
        { icon: 'i-heroicons-shield-check', title: 'Fully managed' },
        { icon: 'i-heroicons-arrow-path', title: 'Revisions included' },
        { icon: 'i-heroicons-cpu-chip', title: 'AI-accelerated builds' },
        { icon: 'i-heroicons-bolt', title: 'Ships in days, not months' },
    ],

    /**
     * Services drive both the homepage cards and the /services/[slug] pages.
     *
     * `tag` / `title` / `body` are the card. Everything below `slug` is the
     * dedicated page: each one is its own indexable URL with its own title tag,
     * meta description and Service schema, which the single-page site had no
     * way to express.
     */
    services: [
        {
            slug: 'local-business-websites',
            tag: 'Retail & Services',
            title: 'Local Business Sites',
            body: 'Shops, salons, offices — everything a customer needs at a glance. Hours, location, contact, and a reason to choose you.',
            metaTitle: 'Small Business Website Design — Kankakee County, IL | ILYTAT',
            metaDescription: 'Custom websites for shops, salons and offices in Manteno, Bourbonnais, Bradley and Kankakee. Fast, mobile-first, and built to turn searches into customers.',
            headline: 'Websites for local shops, salons and offices',
            intro: 'Your customers are already searching for what you sell. The question is whether they find you — or the competitor two towns over.',
            problem: {
                title: 'What usually goes wrong',
                points: [
                    'You show up on page three of Google, or not at all.',
                    'Your Facebook page is doing the work a website should do.',
                    'Customers call to ask your hours because the answer is not online.',
                    'The site you have looks wrong on a phone, which is where most people find you.',
                ],
            },
            solution: {
                title: 'What I build instead',
                points: [
                    'A fast, mobile-first site with your hours, location and services above the fold.',
                    'Local search setup so you appear when someone nearby searches your category.',
                    'A contact form that reaches your inbox immediately.',
                    'Copy that sounds like you, not like a template.',
                ],
            },
            includes: [
                'Up to 5 custom pages',
                'Google Business Profile setup',
                'Contact and enquiry forms',
                'Local SEO foundations',
                'Mobile-first responsive build',
                'Managed hosting, SSL and domain',
            ],
        },
        {
            slug: 'restaurant-websites',
            tag: 'Food & Beverage',
            title: 'Restaurants & Food',
            body: 'Menus, hours, reservations, and ordering links. Get off Facebook and start showing up in Google searches.',
            metaTitle: 'Restaurant Website Design — Kankakee County, IL | ILYTAT',
            metaDescription: 'Restaurant and cafe websites for Kankakee County, IL. Menus that load fast on a phone, accurate hours, reservations and ordering links.',
            headline: 'Restaurant sites that answer the only three questions people ask',
            intro: 'Are you open, what do you serve, and how do I order? A hungry person on a phone will give you about ten seconds to answer.',
            problem: {
                title: 'What usually goes wrong',
                points: [
                    'The menu is a PDF that has to be pinched and zoomed on a phone.',
                    'Hours live on Facebook and disagree with what Google shows.',
                    'No online ordering or reservation link, so the order goes elsewhere.',
                    'Photos of the food are buried three taps deep, if they exist at all.',
                ],
            },
            solution: {
                title: 'What I build instead',
                points: [
                    'A real HTML menu that loads instantly and is readable without zooming.',
                    'Hours synced with your Google Business Profile so both agree.',
                    'Direct links to whatever ordering or reservation system you already use.',
                    'Food photography placed where it does the most work.',
                ],
            },
            includes: [
                'Mobile-readable menu pages',
                'Hours and location, kept accurate',
                'Ordering and reservation links',
                'Google Business Profile setup',
                'Photo galleries',
                'Managed hosting, SSL and domain',
            ],
        },
        {
            slug: 'contractor-websites',
            tag: 'Trades & Contractors',
            title: 'Contractors & Trades',
            body: 'Photo galleries, service areas, quote request forms. Look as professional online as you are on the job.',
            metaTitle: 'Contractor & Trades Website Design — Kankakee County, IL | ILYTAT',
            metaDescription: 'Websites for contractors, trades and home services in Kankakee County, IL. Project galleries, service-area pages and quote forms that bring in real leads.',
            headline: 'Look as professional online as you do on the job',
            intro: 'Your work speaks for itself — but only if people can see it. Most trades lose jobs to a competitor with worse work and a better website.',
            problem: {
                title: 'What usually goes wrong',
                points: [
                    'Your best work lives in a camera roll nobody can see.',
                    'Customers cannot tell whether you cover their town.',
                    'Quote requests arrive by voicemail and get lost.',
                    'No online presence at all, so referrals are the only pipeline.',
                ],
            },
            solution: {
                title: 'What I build instead',
                points: [
                    'A project gallery that shows before-and-after work properly.',
                    'Clear service-area coverage so nobody has to guess.',
                    'A quote request form that captures job details up front.',
                    'Trust signals — licensing, insurance, years in business — where buyers look.',
                ],
            },
            includes: [
                'Project photo galleries',
                'Service-area pages',
                'Quote request forms',
                'Licensing and insurance details',
                'Local SEO foundations',
                'Managed hosting, SSL and domain',
            ],
        },
        {
            slug: 'event-websites',
            tag: 'Local Events',
            title: 'Local Events',
            body: 'Event pages, RSVPs, and promotion. Get your event in front of the right people in Kankakee County.',
            metaTitle: 'Event Website Design — Kankakee County, IL | ILYTAT',
            metaDescription: 'Event websites for Kankakee County, IL. Schedules, RSVPs, ticket links and directions in one page people can actually share.',
            headline: 'One page that tells people everything about your event',
            intro: 'Events live or die on logistics. If somebody has to hunt for the start time or the parking situation, they stop hunting.',
            problem: {
                title: 'What usually goes wrong',
                points: [
                    'Details are scattered across a Facebook event, a flyer and word of mouth.',
                    'No single link you can put on a poster or hand to a sponsor.',
                    'RSVPs arrive in four different inboxes.',
                    'Nobody can find parking, timings or the schedule on the day.',
                ],
            },
            solution: {
                title: 'What I build instead',
                points: [
                    'One shareable page with schedule, location, parking and directions.',
                    'RSVP or ticket links wired to whatever system you use.',
                    'A layout that works when half your traffic arrives on the day, on a phone.',
                    'Sponsor and vendor placement that looks intentional.',
                ],
            },
            includes: [
                'Event schedule and details',
                'RSVP and ticketing links',
                'Directions and parking info',
                'Sponsor and vendor sections',
                'Shareable social preview',
                'Managed hosting, SSL and domain',
            ],
        },
        {
            slug: 'custom-software',
            tag: 'Custom Software',
            title: 'Custom Software & Apps',
            body: 'Booking systems, internal tools, customer portals, or anything beyond a standard website. If you can describe it, I can scope and build it.',
            metaTitle: 'Custom Software & Web Apps for Small Business | ILYTAT',
            metaDescription: 'Booking systems, internal tools and customer portals for small businesses in Illinois. Scoped honestly, built properly, and you own the code.',
            headline: 'When a website is not the thing you actually need',
            intro: 'Sometimes the problem is not marketing — it is the spreadsheet holding your business together. That is a software problem.',
            problem: {
                title: 'What usually goes wrong',
                points: [
                    'A spreadsheet is doing a job it was never meant to do.',
                    'Off-the-shelf software costs per seat, per month, forever, and still does not fit.',
                    'Staff re-key the same data into three different systems.',
                    'Booking and scheduling happen by phone tag.',
                ],
            },
            solution: {
                title: 'What I build instead',
                points: [
                    'A tool scoped to your actual workflow, not a generic template.',
                    'Booking, scheduling or portal functionality your customers can self-serve.',
                    'Integrations with the systems you already pay for.',
                    'Code you own outright — no per-seat licensing, no lock-in.',
                ],
            },
            includes: [
                'Discovery and honest scoping',
                'Custom application build',
                'Integration with existing tools',
                'Staff training and handover',
                'Full source-code ownership',
                'Ongoing support options',
            ],
        },
    ],

    steps: [
        {
            n: '01',
            title: 'Tell me about your business',
            body: "Fill out the form below. Share your services, your goals, any materials you have. The more I understand your situation, the better the result.",
        },
        {
            n: '02',
            title: 'I design and build it',
            body: "I use the best AI tools available to speed up design, copywriting, and first drafts — delivering faster and at a lower cost than a traditional agency. Every output is reviewed and refined by me personally. You'll see the site before it's finalized, and revisions are built into every package.",
        },
        {
            n: '03',
            title: 'Your site goes live — and stays live',
            body: `I launch your site and handle everything technical. Hosting, SSL, domain, and small updates are covered for ${monthlyRate}/month. First month is free.`,
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
                'Your data, backed up and looked after',
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
                'Your data, backed up and looked after',
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
            // Raised from $999 to match Stripe, where the live price is now
            // $1,499. Leaving these out of step means the page quotes one
            // number and checkout charges another.
            price: '$1,499',
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
                'Your Own Control Panel to Manage Content',
                'Member Login & User Accounts',
                'Live Data — Inventory, Bookings, or Anything That Changes',
                'Custom Forms & Booking Flows',
                'Connections to Your Existing Tools (Payments, Scheduling, CRM)'
            ],
            delivery: '3–5 weeks',
            featured: false,
        },
    ],

    faqs: [
        {
            q: 'Do I need to already have a domain?',
            a: `No — domain registration and management are included in the ${monthlyRate}/month plan. If you already own a domain, I'll point it to your new site at no extra cost.`,
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
            a: "Yes — I'm happy to walk you through it or do it for you. Mention it in your inquiry and I'll include it in the conversation.",
        },
        {
            q: 'Can you work with my existing logo and branding?',
            a: "Absolutely. Send over what you have — logo files, brand colors, photos — and I'll build around it. No logo yet? I can work with what you have or point you to the right person.",
        },
        {
            q: 'Do you use AI to build sites?',
            a: "Yes — and I'm upfront about it. I use the best AI tools available to help with copywriting, layout drafts, and first-pass content. That's how I deliver faster and at a lower cost than a traditional agency. Every result is reviewed and refined by me personally. You get the speed of modern tooling with the judgment of someone who actually cares about the outcome.",
        },
    ]
}