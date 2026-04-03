# Subscription Billing Options Summary

## Logic Used
Modified the core contact inquiry flow inside Vue to extract the user's billing preference up front. Then, migrated the Stripe Checkout generation endpoint from single `payment` mode to `subscription` mode. This allows the backend to bind a zero-day layout build fee logically to a 30-day delayed recurring maintenance fee (Monthly or Yearly based on the form query), fulfilling all requirements inside a simple checkout UX for the client.

## Steps Taken
1. Embedded a `billingPreference` field directly into `index.vue` form reactivity and layout components.
2. Formatted the `/api/contact.post.ts` Resend HTML layout to highlight this preference inside the generated lead email for the admin.
3. Completely restructured `/api/stripe/create-checkout.post.ts` to output a subscripted checkout instead of a single payment, computing and attaching the Yearly equivalent 10-month discount dynamically upon session creation.

## Code Changed
- `app/pages/index.vue`
- `app/server/api/contact.post.ts`
- `app/server/api/stripe/create-checkout.post.ts`
