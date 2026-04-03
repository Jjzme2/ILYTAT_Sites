---
model: Antigravity (Gemini 2.0 Pro)
date: 2026-04-03
---

# Task: Subscription Billing Options

## Interpretation
We added an option for clients to select a "Monthly" or "Yearly" maintenance billing cycle via the contact form on the frontend, and fed this choice straight into the API structure. To execute this, we effectively merged the one-time web build fee into the recurring maintenance subscription through Stripe's native checkout, creating an intelligent invoice that processes upfront fees today and delays recurring fees for 30 days.

## Model Metadata
Configured `mode: 'subscription'` on `/api/stripe/create-checkout.post.ts`. 
Utilized Stripe's array of `line_items` to cleanly separate the web build `price_data` without a `recurring` interval, and the maintenance `price_data` with a `recurring` interval. Hooked into `subscription_data.trial_period_days` to effectively delay the recurring element while the one-time elements execute instantly.
