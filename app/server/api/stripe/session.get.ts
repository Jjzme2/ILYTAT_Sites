import { useStripe } from '~/server/utils/stripe'

export default defineEventHandler(async (event) => {
  const { session_id } = getQuery(event)

  if (!session_id || typeof session_id !== 'string') {
    throw createError({ statusCode: 400, message: 'Missing session_id' })
  }

  const stripe = useStripe()
  const session = await stripe.checkout.sessions.retrieve(session_id, {
    expand: ['line_items'],
  })

  return {
    id: session.id,
    status: session.payment_status,
    customerEmail: session.customer_email || session.customer_details?.email,
    customerName: session.customer_details?.name,
    amount: (session.amount_total || 0) / 100,
    metadata: session.metadata,
  }
})
