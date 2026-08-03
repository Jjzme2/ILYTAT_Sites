/**
 * Admin email notifications.
 *
 * Four places each rolled their own Resend fetch with their own HTML and their
 * own failure handling. This centralises it so a new notification is one call.
 *
 * Sending is always best-effort: a notification failing must never fail the
 * operation it is reporting on. A blog post that generated successfully but
 * whose "it worked" email bounced is still a successful generation.
 */

export type NotifyLevel = 'info' | 'success' | 'error'

const TONE: Record<NotifyLevel, { accent: string, label: string }> = {
  info: { accent: '#8a6a00', label: 'Notice' },
  success: { accent: '#0f7b3d', label: 'Success' },
  error: { accent: '#b3261e', label: 'Action needed' },
}

export interface NotifyOptions {
  subject: string
  title: string
  /** Body lines. Rendered as paragraphs; keep each one short. */
  lines: string[]
  level?: NotifyLevel
  /** Optional monospace block — an error message, a payload, a stack. */
  detail?: string
  /** Optional call-to-action link. */
  action?: { label: string, url: string }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Sends an email to the configured admin address.
 * Returns whether it was sent; never throws.
 */
export async function notifyAdmin(opts: NotifyOptions): Promise<boolean> {
  const config = useRuntimeConfig()
  const key = config.resendApiKey as string | undefined
  const to = config.notificationEmail as string | undefined

  if (!key || !to) {
    console.warn(`[notify] skipped "${opts.subject}" — RESEND_API_KEY or NOTIFICATION_EMAIL not set`)
    return false
  }

  const level = opts.level ?? 'info'
  const tone = TONE[level]

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#141210;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e6e1d8;border-radius:12px;overflow:hidden;">
    <div style="border-left:4px solid ${tone.accent};padding:20px 24px;">
      <p style="margin:0 0 4px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${tone.accent};font-weight:700;">${tone.label}</p>
      <h1 style="margin:0;font-size:19px;line-height:1.3;color:#141210;">${escapeHtml(opts.title)}</h1>
    </div>
    <div style="padding:0 24px 20px;">
      ${opts.lines.map(l => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#4d4841;">${escapeHtml(l)}</p>`).join('')}
      ${opts.detail
        ? `<pre style="margin:16px 0 0;padding:14px;background:#f4f1ec;border:1px solid #e6e1d8;border-radius:8px;font-size:12.5px;line-height:1.5;color:#4d4841;white-space:pre-wrap;word-break:break-word;">${escapeHtml(opts.detail)}</pre>`
        : ''}
      ${opts.action
        ? `<p style="margin:20px 0 0;"><a href="${escapeHtml(opts.action.url)}" style="display:inline-block;background:#f7cc1e;color:#1a1400;text-decoration:none;font-weight:700;font-size:14px;padding:11px 20px;border-radius:8px;">${escapeHtml(opts.action.label)}</a></p>`
        : ''}
    </div>
    <div style="padding:14px 24px;border-top:1px solid #e6e1d8;background:#faf8f5;">
      <p style="margin:0;font-size:12px;color:#767065;">ILYTAT — automated notification</p>
    </div>
  </div>
</body></html>`

  try {
    await $fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: {
        from: config.resendFrom || 'ILYTAT <noreply@ilytat.com>',
        to: [to],
        subject: opts.subject,
        html,
      },
    })
    return true
  }
  catch (e) {
    // Best-effort by design — log and move on.
    console.error(`[notify] failed to send "${opts.subject}":`, e instanceof Error ? e.message : String(e))
    return false
  }
}
