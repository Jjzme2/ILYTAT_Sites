import { z } from 'zod'
import { useStripe } from '~/server/utils/stripe'

const schema = z.object({
  serviceId: z.string(),
  packageId: z.string(),
  serviceName: z.string(),
  packageName: z.string(),
  price: z.number().min(0),
  userId: z.string().optional(),
  customerEmail: z.string().email().optional(),
  businessName: z.string().optional(),
  notes: z.string().optional(),
  billingCycle: z.enum(['monthly', 'yearly']).optional().default('monthly')
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = schema.parse(body)
  const config = useRuntimeConfig()
  const stripe = useStripe()

  // Free items go straight to order creation
  if (data.price === 0) {
    return { free: true, redirect: `/tools/qr-code` }
  }

  const maintenanceAmount = data.billingCycle === 'yearly' ? 50000 : 5000;
  const maintenanceInterval = data.billingCycle === 'yearly' ? 'year' : 'month';

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: data.price * 100, // convert to cents
          product_data: {
            name: `${data.serviceName} — ${data.packageName}`,
            description: `ILYTAT Sites: ${data.serviceName} - ${data.packageName} upfront build fee`,
            metadata: {
              serviceId: data.serviceId,
              packageId: data.packageId,
            },
          },
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: 'usd',
          unit_amount: maintenanceAmount,
          recurring: { interval: maintenanceInterval },
          product_data: {
            name: `Managed Hosting & Maintenance (${data.billingCycle})`,
            description: `Hosting, SSL, domain, and updates`,
          },
        },
        quantity: 1,
      }
    ],
    subscription_data: {
      trial_period_days: 30,
    },
    customer_email: data.customerEmail,
    metadata: {
      serviceId: data.serviceId,
      packageId: data.packageId,
      serviceName: data.serviceName,
      packageName: data.packageName,
      userId: data.userId || '',
      businessName: data.businessName || '',
      notes: data.notes || '',
    },
    success_url: `${config.public.siteUrl}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.public.siteUrl}/services/${data.serviceId}`,
    allow_promotion_codes: true,
    billing_address_collection: 'required',
  })

  return { url: session.url, sessionId: session.id }
})
