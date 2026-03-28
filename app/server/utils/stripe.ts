import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function useStripe(): Stripe {
  if (_stripe) return _stripe
  const config = useRuntimeConfig()
  _stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
  })
  return _stripe
}
