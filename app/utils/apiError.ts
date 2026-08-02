/**
 * Extracts the human-readable reason from a failed $fetch call.
 *
 * ofetch sets `error.message` to a generic summary like
 * "[POST] /api/admin/generate-blog: 502 Bad Gateway". The message the server
 * actually wrote lives in `error.data.statusMessage`. Reading `.message`
 * therefore throws away the only useful part — which is why the admin's AI
 * generation failures showed a bare status code and nothing about the cause.
 */
export function apiErrorMessage(e: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (!e) return fallback

  const err = e as {
    data?: { statusMessage?: string, message?: string }
    statusMessage?: string
    message?: string
  }

  const detail = err.data?.statusMessage || err.data?.message || err.statusMessage
  if (detail) return detail

  // Only fall back to .message when it carries more than the status line.
  const msg = err.message
  if (msg && !/^\[\w+\]\s+\/.*:\s*\d{3}/.test(msg)) return msg

  return fallback
}
