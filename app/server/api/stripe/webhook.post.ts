import { useStripe } from '~/server/utils/stripe'
import { firestoreRequest, toFirestoreFields } from '~/server/utils/firebaseAdmin'

export default defineEventHandler(async (event) => {
  const stripe = useStripe()
  const config = useRuntimeConfig()

  const body = await readRawBody(event)
  const sig = getHeader(event, 'stripe-signature')

  if (!body || !sig) {
    throw createError({ statusCode: 400, message: 'Missing body or signature' })
  }

  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(body, sig, config.stripeWebhookSecret)
  } catch (err) {
    throw createError({ statusCode: 400, message: `Webhook signature verification failed` })
  }

  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object
      const meta = session.metadata || {}

      const order = {
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent as string || '',
        serviceId: meta.serviceId || '',
        packageId: meta.packageId || '',
        serviceName: meta.serviceName || '',
        packageName: meta.packageName || '',
        userId: meta.userId || '',
        businessName: meta.businessName || '',
        notes: meta.notes || '',
        customerEmail: session.customer_email || session.customer_details?.email || '',
        customerName: session.customer_details?.name || '',
        amount: (session.amount_total || 0) / 100,
        status: 'paid',
        deliverables: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await firestoreRequest('POST', 'orders', {
        fields: toFirestoreFields(order),
      })

      break
    }

    case 'payment_intent.payment_failed': {
      const pi = stripeEvent.data.object
      console.error('Payment failed:', pi.id)
      break
    }
  }

  return { received: true }
})
