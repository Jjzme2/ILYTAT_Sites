import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function useStripe(): Stripe {
  if (_stripe) return _stripe
  const config = useRuntimeConfig()
  _stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2026-03-25.dahlia',
    typescript: true,
  })
  return _stripe
}
