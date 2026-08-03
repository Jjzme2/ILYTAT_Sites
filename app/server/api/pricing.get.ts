/**
 * GET /api/pricing
 *
 * Current prices for the pricing section, live from Stripe where possible.
 *
 * Safe to serve publicly: every value here is already printed on the pricing
 * page. It exposes amounts only — no product ids, no Stripe metadata, and
 * nothing about why a tier fell back, since that would leak internal
 * configuration state to anyone who asked.
 *
 * Edge-cached via routeRules, and the underlying read is memoised for 15
 * minutes, so Stripe is contacted roughly a handful of times an hour no matter
 * how much traffic arrives.
 */

import { getPricing } from '~/server/utils/stripePricing'

export default defineEventHandler(async () => {
  const pricing = await getPricing()

  return {
    popUp: pricing.popUp.amount,
    localBusiness: pricing.localBusiness.amount,
    standardHosting: pricing.standardHosting.amount,
    premiumHosting: pricing.premiumHosting.amount,
    standardHostingYearly: pricing.standardHostingYearly.amount,
    premiumHostingYearly: pricing.premiumHostingYearly.amount,
  }
})
