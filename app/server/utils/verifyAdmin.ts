/**
 * requireAdmin — server-side Firebase ID token verification.
 *
 * Reads the `Authorization: Bearer <idToken>` header, validates the token
 * against the Firebase REST API, and checks that the authenticated user's
 * email is in the admin list.
 *
 * Throws 401 if the token is missing or invalid; 403 if the user is not admin.
 *
 * Usage:
 *   import { requireAdmin } from '~/server/utils/verifyAdmin'
 *   export default defineEventHandler(async (event) => {
 *     await requireAdmin(event)
 *     // ... rest of handler
 *   })
 */

import type { H3Event } from 'h3'

export async function requireAdmin(event: H3Event): Promise<void> {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const idToken = authHeader.slice(7)
  const config = useRuntimeConfig()

  // Verify the Firebase ID token via the accounts:lookup REST endpoint.
  // This validates the token signature server-side and returns the user record.
  let email: string | undefined
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${config.public.firebaseApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      },
    )
    if (!res.ok) throw new Error(`Firebase returned ${res.status}`)
    const data = await res.json() as { users?: Array<{ email?: string }> }
    email = data.users?.[0]?.email
  }
  catch {
    throw createError({ statusCode: 401, message: 'Invalid or expired token' })
  }

  if (!email) {
    throw createError({ statusCode: 401, message: 'Token contains no email' })
  }

  // Admin email list — override via ADMIN_EMAILS env var (comma-separated)
  const rawList = (config.adminEmails as string | undefined) || 'admin@ilytat.com'
  const adminEmails = rawList.split(',').map(e => e.trim().toLowerCase())

  if (!adminEmails.includes(email.toLowerCase())) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
}
