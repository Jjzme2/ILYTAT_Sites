/**
 * usePricing — the displayed price for every tier.
 *
 * Reads /api/pricing, which reports what Stripe is actually charging, and
 * falls back to the committed values in site.config.ts.
 *
 * The fallback is supplied as the initial value rather than fetched into an
 * empty ref, so the pricing section renders a real number on the very first
 * paint. Prices resolve during SSR, so there is no flash of one number being
 * replaced by another — which on a pricing page would look like a bait and
 * switch rather than a loading state.
 */

import { computed } from 'vue'
import { siteConfig } from '~/config/site.config'

export interface Pricing {
  popUp: number
  localBusiness: number
  standardHosting: number
  premiumHosting: number
  standardHostingYearly: number
  premiumHostingYearly: number
}

/** Strips the formatting off a committed price string like "$1,499". */
function numeric(value: string | number): number {
  return typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.]/g, '')) || 0
}

export function committedPricing(): Pricing {
  const { packages, subscriptions } = siteConfig
  const pkg = (name: string) => numeric(packages.find(p => p.name === name)?.price ?? 0)
  return {
    popUp: pkg('Pop-Up'),
    localBusiness: pkg('Local Business'),
    standardHosting: subscriptions.STANDARD_HOSTING.price,
    premiumHosting: subscriptions.PREMIUM_HOSTING.price,
    standardHostingYearly: subscriptions.STANDARD_HOSTING_YEARLY.price,
    premiumHostingYearly: subscriptions.PREMIUM_HOSTING_YEARLY.price,
  }
}

/** "$1,499" — the form every price is shown in on the site. */
export function formatPrice(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`
}

export function usePricing() {
  const fallback = committedPricing()

  const { data } = useFetch<Pricing>('/api/pricing', {
    key: 'site-pricing',
    default: () => fallback,
    // A pricing endpoint that fails must not fail the page it is on.
    onResponseError: () => {},
    // Shared across every component that asks, for one request per render.
    dedupe: 'defer',
  })

  const pricing = computed<Pricing>(() => data.value ?? fallback)

  /** Price for a package by its site.config name, formatted for display. */
  function packagePrice(name: string): string {
    if (name === 'Pop-Up') return formatPrice(pricing.value.popUp)
    if (name === 'Local Business') return formatPrice(pricing.value.localBusiness)
    // Web Application has no Stripe product, so it keeps its committed price.
    const committed = siteConfig.packages.find(p => p.name === name)?.price
    return typeof committed === 'string' ? committed : formatPrice(numeric(committed ?? 0))
  }

  return { pricing, packagePrice, formatPrice }
}
