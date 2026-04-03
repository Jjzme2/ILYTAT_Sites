# Firestore Permission Fix Summary

## Logic Used
The internal server actions required Admin authority over Firestore databases without inflating Edge/Serverless endpoints with heavy SDK dependencies (like `firebase-admin`). To overcome anonymous `403` Firebase API restrictions placed upon general REST architecture, we implemented a custom JWT authentication service.

## Steps Taken
1. Added `firebaseClientEmail` and `firebasePrivateKey` cleanly into `nuxt.config.ts` runtime config to provide safe, localized access to `.env` admin secrets.
2. Completely rewrote `app/server/utils/firebaseAdmin.ts` with an asynchronous `getAccessToken()` architecture.
3. Implemented standard Node `crypto` algorithms natively to sign a secure RS256 Web Token targeting the Google API scope without installing external packages.
4. Bound the generated JWT exchange token correctly into the `/databases/(default)` REST endpoint's header (`Authorization: Bearer <token>`), entirely negating Firebase Security Rules blocking standard inquiries.

## Code Changed
- `nuxt.config.ts`
- `app/server/utils/firebaseAdmin.ts`
