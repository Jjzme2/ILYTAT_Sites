/**
 * GET /api/admin/spam-attempts
 *
 * Returns all blocked contact form submissions from the `spamAttempts`
 * Firestore collection, sorted newest first.
 *
 * Each record contains:
 *   - reason:    which protection layer caught it (honeypot | turnstile | gibberish)
 *   - email:     the email address submitted
 *   - name:      the name submitted
 *   - ip:        client IP address (from x-forwarded-for on Vercel)
 *   - userAgent: browser / bot user-agent string
 *   - createdAt: ISO timestamp
 *
 * Why a dedicated collection instead of filtering the general logs?
 * Spam attempts are security-relevant, actionable records with structured
 * fields (IP, reason, email). General logs are a stream of operational
 * events serialized as strings. Separating them lets the admin UI surface
 * each purpose correctly without cross-collection joins.
 */

import { requireAdmin } from '~/server/utils/verifyAdmin'
import { firestoreRequest, fromFirestoreFields } from '~/server/utils/firebaseAdmin'

interface SpamAttempt {
  id:        string
  reason:    'honeypot' | 'turnstile' | 'gibberish'
  email:     string
  name:      string
  ip:        string
  userAgent: string
  createdAt: string
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const res  = await firestoreRequest('GET', 'spamAttempts')
  const docs = res.documents ?? []

  const attempts: SpamAttempt[] = docs
    .map((doc: { name: string; fields?: Record<string, unknown> }) => ({
      id: doc.name.split('/').pop() as string,
      ...fromFirestoreFields(doc.fields ?? {}),
    }))
    .sort((a: SpamAttempt, b: SpamAttempt) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

  return { attempts }
})
