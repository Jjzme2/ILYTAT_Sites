---
model: Antigravity (Gemini 2.0 Pro)
date: 2026-04-03
---

# Task: Automated Onboarding Pipeline

## Interpretation
The goal was to eliminate manual friction between payment collection and asset gathering (intake questionnaire, logos, photos). We needed to seamlessly chain these events together utilizing Stripe's native checkout redirection into our own platform's onboarding view.

## Model Metadata
Configured Stripe's `success_url` to capture the checkout session and drop immediately into an embedded onboarding form.
Modified the Stripe webhook endpoint to extract and persist the generated `onboardingUrl` onto the created `orders` object stored in Firestore.
Augmented the Resend confirmation email to supply a permanently accessible onboarding link natively in the automated initial contact.
