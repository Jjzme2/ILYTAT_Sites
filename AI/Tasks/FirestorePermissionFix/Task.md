---
model: Antigravity (Gemini 2.0 Pro)
date: 2026-04-03
---

# Task: Firestore Permission Denied

## Interpretation
The client was encountering a consistent `Firestore error: 403 Missing or insufficient permissions` exception when submitting the `contact.post.ts` form locally pointing to the production Firebase. The original `firebaseAdmin.ts` infrastructure relied entirely on anonymous REST API calls mapping to the public `FIREBASE_API_KEY`. As the security on this environment matured (via updated Rules and generic API key constraints), the unauthenticated server-side requests were blocked.

## Model Metadata
We rewrote `firebaseAdmin.ts`. Instead of calling `npm i firebase-admin` and introducing heavy cold-start dependencies to an Edge/Serverless web app, we programmed a native Service Account JWT generator using the built-in Node `crypto` library.
It now seamlessly parses `.env` secrets (`FIREBASE_CLIENT_EMAIL` & `FIREBASE_PRIVATE_KEY`) exported into the Nuxt Runtime Config, creates a standard RS256 token, and trades it automatically with `oauth2.googleapis.com` to receive an Admin `access_token`. This access token guarantees the contact POST REST payload succeeds instantaneously every time without any rule constraints.
