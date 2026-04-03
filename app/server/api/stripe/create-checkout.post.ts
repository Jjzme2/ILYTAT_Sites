import { z } from 'zod'
import { useStripe } from '~/server/utils/stripe'

const PACKAGE_PRICE_MAP: Record<string, (config: ReturnType<typeof useRuntimeConfig>) => string | undefined> = {
  starter:      (c) => c.stripePriceStarterBuild as string | undefined,
  professional: (c) => c.stripePriceProfessionalBuild as string | undefined,
  premium:      (c) => c.stripePricePremiumBuild as string | undefined,
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

  const hostingPriceId = data.billingCycle === 'yearly'
    ? (config.stripePriceHostingYearly as string)
    : (config.stripePriceHostingMonthly as string)

  if (!hostingPriceId) {
    throw createError({ statusCode: 500, message: `Hosting price ID not configured for billing cycle: ${data.billingCycle}` })
  }

  const session = await stripe.checkout.sessions.create({
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
    cancel_url:  `${config.public.siteUrl}/#pricing`,
    allow_promotion_codes:       true,
    billing_address_collection:  'required',
  })

  return { url: session.url, sessionId: session.id }
})
