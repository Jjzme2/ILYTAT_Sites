/**
 * Live pricing, read from Stripe.
 *
 * The site's prices and the Stripe catalogue were linked only by remembering to
 * change both. That had already failed once: Stripe billed $999 while the page
 * advertised $1,499. This closes the loop so a price change in the Stripe
 * dashboard reaches the website on its own.
 *
 * ── Security ──────────────────────────────────────────────────────────────
 *
 * Adding a payments API to a site that had no Stripe integration at all is new
 * attack surface, so the design assumes the key will leak one day and makes
 * that boring:
 *
 *   1. RESTRICTED KEYS ONLY. `assertRestrictedKey` refuses anything that is not
 *      an `rk_` key. A full `sk_` secret can read customers, charges and
 *      balances and can move money; a restricted key scoped to read Products
 *      and Prices can read the catalogue — which is published on the pricing
 *      page anyway. The check is deliberately a hard failure rather than a
 *      warning, because "we'll tighten it later" is how a full secret ends up
 *      in production for two years.
 *   2. Server-only. The key lives outside `runtimeConfig.public`, so it is
 *      never serialised into the client bundle or the SSR payload.
 *   3. Never logged. Failures report status codes and Stripe's error message,
 *      never the request headers.
 *
 * ── Correctness ───────────────────────────────────────────────────────────
 *
 * A pricing page that displays a wrong number is worse than one that displays
 * a stale number, so every value is checked before it is trusted:
 *
 *   IDENTITY — the Stripe account also carries an unrelated venture (Can Do
 *   Crew) and some promotional prices. Products are pinned by id AND verified
 *   by name, so a mis-pinned id fails closed instead of quietly publishing
 *   another business's price on this site.
 *
 *   SHAPE — currency, livemode, active, and one-time vs monthly vs yearly all
 *   have to match what the tier is supposed to be.
 *
 *   MAGNITUDE — the amount must be within a wide band of the committed
 *   fallback. Wide enough for a real price rise, tight enough to catch a
 *   cents/dollars unit error or a $0 draft price.
 *
 * Anything that fails falls back to the value in `site.config.ts` for that tier
 * alone. The page always renders a real price.
 *
 * Products are pinned by **product id, not price id**: Stripe prices are
 * immutable, so changing a price creates a new one and repoints the product's
 * `default_price`. Pinning the price id would have frozen the number at
 * whatever it was the day it was pinned — the exact bug this file exists to
 * prevent.
 */

import { siteConfig } from '~/config/site.config'
import { log } from './logger'

const STRIPE_API = 'https://api.stripe.com/v1'

/** How long a successful read is reused before Stripe is asked again. */
const CACHE_TTL_MS = 15 * 60 * 1000
/** How long to wait before giving up and serving the fallback. */
const TIMEOUT_MS = 4000
/**
 * Accepted multiples of the committed fallback price. A genuine price change
 * lands inside this; a unit error (cents read as dollars) or a $0 draft does
 * not.
 */
const MIN_FACTOR = 0.25
const MAX_FACTOR = 4

export type TierKey
  = | 'popUp' | 'localBusiness'
    | 'standardHosting' | 'premiumHosting'
    | 'standardHostingYearly' | 'premiumHostingYearly'

export interface LivePrice {
  /** Whole dollars. */
  amount: number
  /** Where the number came from — surfaced in the admin health check. */
  source: 'stripe' | 'fallback'
  /** Why it fell back, when it did. */
  reason?: string
}

export type PricingMap = Record<TierKey, LivePrice>

interface StripePrice {
  id?: string
  active?: boolean
  currency?: string
  livemode?: boolean
  type?: 'one_time' | 'recurring'
  unit_amount?: number | null
  recurring?: { interval?: string } | null
}

interface StripeProduct {
  id?: string
  name?: string
  active?: boolean
  default_price?: StripePrice | string | null
}

/**
 * The one place a Stripe id appears in this codebase.
 *
 * Ids are not secrets — they identify a product, they do not grant access to
 * it. `expectedName` is the identity guard described above; update it here if
 * a product is ever renamed in Stripe, and the sync will fail closed and email
 * until the two agree again.
 *
 * `Web Application` is intentionally absent: no such product exists in Stripe,
 * so it has nothing to sync against and stays on the committed value.
 */
const TIERS: Record<TierKey, {
  productId: string
  expectedName: string
  kind: 'one_time' | 'month' | 'year'
  label: string
}> = {
  popUp: {
    productId: 'prod_UGn8HAdh17qjWT',
    expectedName: 'Pop-Up',
    kind: 'one_time',
    label: 'Pop-Up build',
  },
  localBusiness: {
    productId: 'prod_UGn9d4aa9ynv4c',
    expectedName: 'Local Business',
    kind: 'one_time',
    label: 'Local Business build',
  },
  standardHosting: {
    productId: 'prod_UGnGHV02szLvRS',
    expectedName: 'Managed Hosting & Infrastructure',
    kind: 'month',
    label: 'Standard hosting, monthly',
  },
  premiumHosting: {
    productId: 'prod_UKGX81DmGc4BsR',
    expectedName: 'Managed Hosting and Infrastructure (Premium)',
    kind: 'month',
    label: 'Premium hosting, monthly',
  },
  standardHostingYearly: {
    productId: 'prod_UKGars7KYxDP0x',
    expectedName: 'Managed Hosting and Infrastructure -Yearly',
    kind: 'year',
    label: 'Standard hosting, yearly',
  },
  premiumHostingYearly: {
    productId: 'prod_UKGYIOhAdZi74O',
    expectedName: 'Managed Hosting and Infrastructure (Premium) - Yearly',
    kind: 'year',
    label: 'Premium hosting, yearly',
  },
}

/** Committed prices, used whenever Stripe cannot be trusted or reached. */
export function fallbackPricing(): PricingMap {
  const { subscriptions, packages } = siteConfig
  const pkg = (name: string): number => {
    const found = packages.find(p => p.name === name)
    return found ? Number(String(found.price).replace(/[^0-9.]/g, '')) : 0
  }
  const fb = (amount: number, reason?: string): LivePrice => ({
    amount,
    source: 'fallback',
    ...(reason ? { reason } : {}),
  })

  return {
    popUp: fb(pkg('Pop-Up')),
    localBusiness: fb(pkg('Local Business')),
    standardHosting: fb(subscriptions.STANDARD_HOSTING.price),
    premiumHosting: fb(subscriptions.PREMIUM_HOSTING.price),
    standardHostingYearly: fb(subscriptions.STANDARD_HOSTING_YEARLY.price),
    premiumHostingYearly: fb(subscriptions.PREMIUM_HOSTING_YEARLY.price),
  }
}

/**
 * Rejects anything that is not a restricted key.
 *
 * Returns a reason rather than throwing: a misconfigured key must degrade to
 * the committed prices, not take the pricing page down.
 */
function assertRestrictedKey(key: string): string | null {
  if (!key) return 'no key configured'
  if (key.startsWith('sk_')) {
    return 'refusing a full secret key — create a restricted (rk_) key with read access to Products and Prices only'
  }
  if (!key.startsWith('rk_')) return 'key does not look like a Stripe restricted key'
  return null
}

async function fetchProduct(id: string, key: string): Promise<StripeProduct> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    // Expanding default_price makes this one round-trip per product instead of
    // two, and means the amount can never be read from a price that belongs to
    // a different product.
    const res = await fetch(
      `${STRIPE_API}/products/${encodeURIComponent(id)}?expand[]=default_price`,
      {
        headers: { Authorization: `Bearer ${key}` },
        signal: controller.signal,
      },
    )
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message = (body as { error?: { message?: string } })?.error?.message ?? res.statusText
      throw new Error(`Stripe ${res.status}: ${message}`)
    }
    return body as StripeProduct
  }
  finally {
    clearTimeout(timer)
  }
}

/**
 * Normalises a product name for comparison.
 *
 * The names in Stripe are inconsistent in ways that carry no meaning — one uses
 * "&" where the others use "and", and one runs "-Yearly" together where its
 * sibling has " - Yearly". Comparing raw strings would fail the identity check
 * on a cosmetic difference, which reads as "the site and Stripe disagree" when
 * they do not. Case, spacing, punctuation and the and/&/ampersand split are all
 * flattened; the words themselves still have to match, so a genuinely
 * mis-pinned product still fails.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Applies every identity, shape and magnitude check. Returns null if it passes. */
function reject(
  spec: typeof TIERS[TierKey],
  product: StripeProduct,
  price: StripePrice | null,
  fallbackAmount: number,
  amount: number,
): string | null {
  if (product.active === false) return 'product is archived in Stripe'

  if (normalizeName(product.name ?? '') !== normalizeName(spec.expectedName)) {
    return `product is named "${product.name}", expected "${spec.expectedName}"`
  }

  if (!price) return 'product has no default price set'
  if (price.active === false) return 'default price is archived'
  if (price.currency && price.currency !== 'usd') return `price is in ${price.currency}, expected usd`
  if (price.livemode === false) return 'price is a test-mode price'

  if (spec.kind === 'one_time') {
    if (price.type !== 'one_time') return `expected a one-time price, got ${price.type}`
  }
  else {
    if (price.type !== 'recurring') return `expected a recurring price, got ${price.type}`
    if (price.recurring?.interval !== spec.kind) {
      return `expected a ${spec.kind}ly price, got ${price.recurring?.interval}`
    }
  }

  if (!Number.isFinite(amount) || amount <= 0) return 'price is zero or unreadable'
  if (fallbackAmount > 0) {
    if (amount < fallbackAmount * MIN_FACTOR || amount > fallbackAmount * MAX_FACTOR) {
      return `price $${amount} is implausibly far from the committed $${fallbackAmount}`
    }
  }
  return null
}

let cache: { at: number, value: PricingMap } | null = null

/**
 * Current prices, live from Stripe where every check passes and committed
 * values everywhere else. Never throws.
 */
export async function getPricing(force = false): Promise<PricingMap> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value

  const fallback = fallbackPricing()
  const key = String(useRuntimeConfig().stripeRestrictedKey || '')

  const keyProblem = assertRestrictedKey(key)
  if (keyProblem) {
    // Not having a key configured is a normal state, not an incident — the site
    // works fine on committed prices. A *rejected* key is worth a log line.
    if (key) await log('error', 'api', 'Stripe price sync disabled', { reason: keyProblem })
    const result = Object.fromEntries(
      Object.entries(fallback).map(([k, v]) => [k, { ...v, reason: keyProblem }]),
    ) as PricingMap
    cache = { at: Date.now(), value: result }
    return result
  }

  const entries = await Promise.all(
    (Object.keys(TIERS) as TierKey[]).map(async (tier): Promise<[TierKey, LivePrice]> => {
      const spec = TIERS[tier]
      const fallbackAmount = fallback[tier].amount
      try {
        const product = await fetchProduct(spec.productId, key)
        const raw = product.default_price
        const price = (raw && typeof raw === 'object' ? raw : null) as StripePrice | null
        const amount = price?.unit_amount != null ? price.unit_amount / 100 : NaN

        const problem = reject(spec, product, price, fallbackAmount, amount)
        if (problem) {
          return [tier, { amount: fallbackAmount, source: 'fallback', reason: problem }]
        }
        return [tier, { amount, source: 'stripe' }]
      }
      catch (err) {
        return [tier, {
          amount: fallbackAmount,
          source: 'fallback',
          reason: err instanceof Error ? err.message : String(err),
        }]
      }
    }),
  )

  const result = Object.fromEntries(entries) as PricingMap

  // A rejected tier means the site is advertising a number Stripe disagrees
  // with — the original bug. Worth a log entry every time it happens.
  const rejected = (Object.keys(result) as TierKey[]).filter(
    t => result[t].source === 'fallback' && result[t].reason,
  )
  if (rejected.length) {
    await log('warn', 'api', 'Some Stripe prices could not be used', {
      tiers: rejected.map(t => `${TIERS[t].label}: ${result[t].reason}`),
    })
  }

  cache = { at: Date.now(), value: result }
  return result
}

/** Exposed for the admin health check and the nightly diff. */
export function tierLabels(): Record<TierKey, string> {
  return Object.fromEntries(
    (Object.keys(TIERS) as TierKey[]).map(t => [t, TIERS[t].label]),
  ) as Record<TierKey, string>
}
