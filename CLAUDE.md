# CLAUDE.md — ILYTAT Sites

This file documents the codebase structure, conventions, and development workflows for AI assistants working on this project.

## Project Overview

**ILYTAT Sites** is a full-stack SaaS marketplace built with Nuxt 3 that sells web design, marketing, and branding services to local businesses. It features Firebase-based authentication, Stripe payment processing, Firestore order management, and an admin dashboard.

**Live URL:** `https://sites.ilytat.com`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Nuxt 3.15.4 (with Nuxt UI compat v4) |
| UI | Vue 3, Nuxt UI 3, Tailwind CSS |
| Icons | Nuxt Icon (Heroicons + Simple Icons) |
| Fonts | Sora (display), Inter (body) via Google Fonts |
| Auth | Firebase (email/password + Google OAuth) |
| Database | Firebase Firestore (NoSQL) |
| Payments | Stripe (checkout sessions + webhooks) |
| State | Pinia |
| Validation | Zod |
| Language | TypeScript 5.7 |
| Server | Nitro (node-server preset) |
| Animations | GSAP |

---

## Directory Structure

```
/
├── app/
│   ├── components/           # Reusable Vue components
│   │   ├── dashboard/        # DashboardSidebar, DashboardTopbar
│   │   └── layout/           # LayoutAppHeader, LayoutAppFooter
│   ├── composables/          # Vue 3 composition hooks
│   │   ├── useAuth.ts        # Firebase auth (sign in, register, Google, logout)
│   │   ├── useOrders.ts      # Firestore order queries/updates
│   │   └── useQRCode.ts      # QR code generation and download
│   ├── layouts/
│   │   ├── default.vue       # Public layout (header + footer)
│   │   └── dashboard.vue     # Dashboard layout (sidebar + topbar)
│   ├── middleware/
│   │   └── auth.ts           # Protects /dashboard/* routes
│   ├── pages/
│   │   ├── index.vue         # Homepage
│   │   ├── about.vue
│   │   ├── contact.vue
│   │   ├── pricing.vue
│   │   ├── auth/
│   │   │   ├── login.vue
│   │   │   └── register.vue
│   │   ├── dashboard/
│   │   │   └── index.vue     # Protected admin dashboard
│   │   ├── services/
│   │   │   ├── index.vue     # Service catalog
│   │   │   └── [slug].vue    # Service detail page
│   │   ├── order/
│   │   │   └── [service]/[package].vue  # Checkout initiation
│   │   ├── tools/            # Free tools (QR generator)
│   │   └── [...slug].vue     # Catch-all / 404
│   ├── server/
│   │   ├── api/
│   │   │   ├── contact.post.ts              # Contact form → Firestore
│   │   │   ├── stripe/
│   │   │   │   ├── create-checkout.post.ts  # Create Stripe checkout session
│   │   │   │   ├── session.get.ts           # Retrieve session status
│   │   │   │   └── webhook.post.ts          # Stripe webhook (creates orders)
│   │   │   └── qrcode/
│   │   │       └── generate.post.ts         # QR code generation endpoint
│   │   └── utils/
│   │       ├── firebaseAdmin.ts   # Firestore REST API helpers (server-side)
│   │       └── stripe.ts          # Stripe client singleton
│   ├── types/
│   │   └── index.ts           # All TypeScript interfaces and types
│   └── utils/
│       ├── firebase.ts         # Firebase client SDK initialization
│       └── services.ts         # Static service/package data + helpers
├── assets/
│   └── css/
│       └── main.css            # Tailwind base + custom utilities
├── app.vue                     # Root component
├── app.config.ts               # Theme (orange primary, slate neutral)
├── nuxt.config.ts              # Nuxt configuration
├── eslint.config.mjs           # ESLint configuration
├── .env.example                # Required environment variables template
└── package.json
```

---

## Development Setup

### Prerequisites

- Node.js 18+
- A Firebase project (Firestore enabled)
- A Stripe account

### Environment Variables

Copy `.env.example` to `.env` and fill in all values:

```env
# Firebase (client SDK — all go into runtimeConfig.public)
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=

# Stripe
STRIPE_SECRET_KEY=sk_test_...       # server-only
STRIPE_PUBLISHABLE_KEY=pk_test_...  # public
STRIPE_WEBHOOK_SECRET=whsec_...     # server-only

# App
SITE_URL=https://sites.ilytat.com
```

### Commands

```bash
npm install          # Install dependencies (also runs nuxt prepare via postinstall)
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm run preview      # Preview production build locally
npm run generate     # Static site generation
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix linting issues
```

### Stripe Webhooks (local development)

Use the Stripe CLI to forward webhooks:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## Key Conventions

### File Naming

- Vue components: `PascalCase.vue` (auto-imported by Nuxt)
- Composables: `camelCase.ts`, always prefixed `use*`
- Server API files: `[name].[method].ts` (e.g., `contact.post.ts`, `session.get.ts`)
- Pages follow Nuxt file-based routing conventions

### Component Auto-import

Nuxt auto-imports all components from `app/components/`. Subdirectory names become prefixes:
- `components/dashboard/Sidebar.vue` → `<DashboardSidebar />`
- `components/layout/AppHeader.vue` → `<LayoutAppHeader />`

Composables and utils from `app/composables/` and `app/utils/` are also auto-imported.

### TypeScript

- All types live in `app/types/index.ts`
- Add new interfaces there rather than co-locating with components
- Server utilities use `useRuntimeConfig()` for env access
- Zod schemas are defined inline within the API endpoints that use them

### Server-side Firebase Access

The server does **not** use the Firebase Admin SDK. Instead, `app/server/utils/firebaseAdmin.ts` wraps the Firestore REST API directly. When writing/reading server-side Firestore data, always use:

```ts
import { firestoreRequest, toFirestoreFields, fromFirestoreFields } from '~/server/utils/firebaseAdmin'
```

- Use `toFirestoreFields()` to convert plain objects before writing
- Use `fromFirestoreFields()` to convert Firestore REST responses to plain objects
- `firestoreRequest(method, path, body)` handles authentication via API key

### Firestore Collections

Defined as constants in `app/utils/firebase.ts`:

```ts
Collections = {
  ORDERS: 'orders',
  USERS: 'users',
  INQUIRIES: 'inquiries',
  TESTIMONIALS: 'testimonials',
}
```

Always reference `Collections.*` constants, never hardcode collection names.

### Stripe Integration

- **Checkout:** `POST /api/stripe/create-checkout` creates a session with metadata embedded (serviceId, packageId, userId, businessName, notes)
- **Webhook:** `POST /api/stripe/webhook` verifies the Stripe signature and creates an order document in Firestore on `checkout.session.completed`
- **Stripe client:** Instantiated as a singleton in `app/server/utils/stripe.ts` via `useStripe()`
- Always verify webhook signatures using `stripe.webhooks.constructEvent()`

### Auth

- `useAuth()` composable handles all authentication: `signIn`, `signInWithGoogle`, `register`, `logout`, `resetPassword`
- Auth state is stored in Nuxt's `useState` (`auth-user`, `app-user`, `auth-loading`) for SSR-safe sharing
- The `auth.ts` middleware protects all `/dashboard/*` routes — redirect unauthorized users to `/auth/login`
- Admin check is email-based: `adminEmails = ['admin@ilytat.com']`
- User documents are created automatically in Firestore on first Google sign-in or registration via `ensureUserDoc()`

### Styling

- **Color palette:** Primary orange (`#f97316`), neutral slate, dark background `#0f172a` (slate-950)
- **Custom CSS classes** in `assets/css/main.css`:
  - `.gradient-text` — orange gradient text
  - `.glass` / `.glass-dark` — frosted glass morphism cards
  - `.glow-orange` / `.glow-blue` — box-shadow glow effects
  - `.gradient-bg` — animated gradient background
  - `.page-enter-*` / `.page-leave-*` — page transition styles (0.3s fade + slide up)
- Use Nuxt UI components (`UButton`, `UCard`, `UModal`, etc.) as the primary component library
- Tailwind utility classes for layout and spacing

### Service / Product Data

All service offerings are defined statically in `app/utils/services.ts` in the `SERVICES` array. When adding or modifying services:

1. Add/update the `Service` and `Package` objects in `SERVICES`
2. Create matching Stripe products/prices in the Stripe dashboard
3. Update the `priceId` field with the real Stripe price ID (format: `price_*`)
4. Recurring packages are identified by `packageId.startsWith('managed-hosting')`

Helper functions:
- `getServiceBySlug(slug)` — find a service by URL slug
- `getPackageById(serviceSlug, packageId)` — find a specific package
- `formatPrice(price)` — returns `'Free'` for 0, otherwise `$XXX` USD format
- `isRecurring(packageId)` — returns true for subscription packages

### Order Status Flow

```
pending_payment → paid → in_progress → review → completed
                                                ↘ cancelled
```

Orders are created with `status: 'paid'` by the Stripe webhook. Status updates happen through the dashboard.

---

## Data Models (Reference)

Key interfaces from `app/types/index.ts`:

```ts
Order {
  id, userId, serviceId, packageId
  serviceName, packageName
  status: OrderStatus
  amount: number           // in dollars (not cents)
  stripeSessionId, stripePaymentIntentId?
  customerEmail, customerName, businessName
  notes?, deliverables?: Deliverable[]
  createdAt, updatedAt: Date
}

User {
  uid, email, displayName, photoURL
  businessName?, phone?
  createdAt: Date
}

ContactInquiry {
  status: 'new' | 'contacted' | 'converted' | 'closed'
  name, email, businessName, phone?, service, message
  createdAt: Date
}
```

---

## No Testing Framework

There is currently no test setup. If adding tests, prefer **Vitest** (Nuxt's recommended test framework) with `@nuxt/test-utils`.

---

## No CI/CD

There is no CI/CD pipeline configured. All builds and deployments are manual.

---

## Git Workflow

- Active development branch: `claude/add-claude-documentation-LM0zo`
- Main branch: `main`
- Push to origin with: `git push -u origin <branch-name>`

---

## Common Pitfalls

1. **Server vs. client Firebase:** Never import Firebase client SDK in server-side code (`server/api/`, `server/utils/`). Use `firebaseAdmin.ts` REST helpers instead.
2. **Runtime config:** Server-only secrets (Stripe secret key, webhook secret) live under `runtimeConfig` (not `runtimeConfig.public`). Public Firebase keys and Stripe publishable key go under `runtimeConfig.public`.
3. **Stripe price IDs:** The `priceId` values in `services.ts` (e.g., `price_website_starter`) are placeholder IDs. Replace with real Stripe price IDs before going live.
4. **Webhook raw body:** The Stripe webhook handler needs the raw unparsed request body for signature verification. It uses `readRawBody(event)` — do not add body parsers to that route.
5. **Nuxt compat v4:** The project uses `future.compatibilityVersion: 4` in `nuxt.config.ts`. This enables stricter module resolution and Nuxt 4 defaults.
