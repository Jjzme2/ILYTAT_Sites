import { z } from 'zod'
import { useStripe } from '~/server/utils/stripe'
import { log } from '~/server/utils/logger'

const PACKAGE_PRICE_MAP: Record<string, (config: ReturnType<typeof useRuntimeConfig>) => string | undefined> = {
  popup:           (c) => c.stripePriceStarterBuild as string | undefined,
  localbusiness:   (c) => c.stripePriceProfessionalBuild as string | undefined,
  webapplication:  (c) => c.stripePricePremiumBuild as string | undefined,
}

function getBuildPriceId(packageName: string, config: ReturnType<typeof useRuntimeConfig>): string {
  const key = packageName.toLowerCase().replace(/[^a-z]/g, '')
  for (const [k, fn] of Object.entries(PACKAGE_PRICE_MAP)) {
    if (key.includes(k)) {
      const id = fn(config)
      if (id) return id
    }
  }
  throw createError({ statusCode: 400, message: `No Stripe price ID configured for package: ${packageName}` })
}

const schema = z.object({
  packageName: z.string().min(1),
  serviceName: z.string().optional().default('Website'),
  packageId:   z.string().optional().default(''),
  serviceId:   z.string().optional().default(''),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
  hostingTier: z.enum(['standard', 'premium']).default('standard'),
  customerEmail: z.string().email().optional(),
  businessName:  z.string().optional(),
  notes:         z.string().optional(),
  userId:        z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = schema.parse(body)
  const config = useRuntimeConfig()
  const stripe = useStripe()

  const buildPriceId = getBuildPriceId(data.packageName, config)

  let hostingPriceId: string
  if (data.hostingTier === 'premium') {
    hostingPriceId = data.billingCycle === 'yearly'
      ? (config.stripePricePremiumHostingYearly as string)
      : (config.stripePricePremiumHostingMonthly as string)
  } else {
    hostingPriceId = data.billingCycle === 'yearly'
      ? (config.stripePriceHostingYearly as string)
      : (config.stripePriceHostingMonthly as string)
  }

  if (!hostingPriceId) {
    throw createError({ statusCode: 500, message: `Hosting price ID not configured for tier ${data.hostingTier} and cycle ${data.billingCycle}` })
  }

  let session
  try {
    session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    // Build fee (one-time) — charged immediately at checkout.
    // Hosting subscription — starts with a 30-day free trial.
    line_items: [
      { price: buildPriceId, quantity: 1 },
      { price: hostingPriceId, quantity: 1 },
    ],
    subscription_data: {
      trial_period_days: 30,
      metadata: {
        packageName: data.packageName,
        serviceName: data.serviceName,
        billingCycle: data.billingCycle,
      },
    },
    customer_email: data.customerEmail,
    metadata: {
      serviceId:    data.serviceId,
      packageId:    data.packageId,
      serviceName:  data.serviceName,
      packageName:  data.packageName,
      userId:       data.userId || '',
      businessName: data.businessName || '',
      notes:        data.notes || '',
    },
    success_url: `${config.public.siteUrl}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
    // cancel carries context so the frontend can fire a checkout_abandoned analytics event
    // Query string MUST precede the hash so window.location.search can read it.
    // Pattern: /?checkout=cancelled&...#pricing  (not /#pricing?...)
    cancel_url:  `${config.public.siteUrl}/?checkout=cancelled&pkg=${encodeURIComponent(data.packageName)}&cycle=${data.billingCycle}#pricing`,
      allow_promotion_codes:       true,
      billing_address_collection:  'required',
    })
  }
  catch (err: unknown) {
    await log('error', 'stripe', 'Failed to create checkout session', {
      packageName: data.packageName,
      billingCycle: data.billingCycle,
      error: err instanceof Error ? err.message : String(err),
    })
    throw createError({ statusCode: 500, message: 'Failed to create checkout session' })
  }

  await log('info', 'stripe', 'Checkout session created', {
    packageName:  data.packageName,
    billingCycle: data.billingCycle,
    sessionId:    session.id,
  })

  return { url: session.url, sessionId: session.id }
})
