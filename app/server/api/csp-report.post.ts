/**
 * POST /api/csp-report
 *
 * Receives Content-Security-Policy violation reports from browsers.
 *
 * The policy ships in **report-only** mode first. A CSP written from reading the
 * code rather than watching the browser is how you silently break a contact
 * form: the page still renders, the script that submits it does not run, and
 * nobody finds out until leads stop arriving. Report-only blocks nothing, so
 * the cost of being wrong is a log entry instead of lost business.
 *
 * Read these for a week or two. When the only reports left are noise —
 * extensions injecting scripts, in-app browsers rewriting pages — the same
 * policy can be moved to the enforcing header.
 *
 * Public and unauthenticated by necessity: the browser sends it, not our code.
 * So it is treated as hostile input — hard rate limit, tight size caps, no
 * reflection, and violations are logged rather than emailed. A misbehaving
 * extension can generate hundreds of reports per page load, and one bad policy
 * line across all traffic would be an inbox flood.
 */

import { clientIp, rateLimit } from '~/server/utils/guard'
import { log } from '~/server/utils/logger'

/** Reports the browser sends that say nothing about our policy. */
const IGNORED_SOURCES = [
  'chrome-extension',
  'moz-extension',
  'safari-extension',
  'safari-web-extension',
  'webkit-masked-url',
  'about:blank',
]

/**
 * The two wire formats disagree on spelling, not meaning.
 *
 * report-uri sends kebab-case (`effective-directive`); the Reporting API sends
 * camelCase (`effectiveDirective`). Reading only one shape logs half the
 * reports as "unknown" — which is worse than not logging them, because it looks
 * like data.
 */
interface ViolationReport {
  'document-uri'?: string
  'documentURL'?: string
  'violated-directive'?: string
  'effective-directive'?: string
  'effectiveDirective'?: string
  'blocked-uri'?: string
  'blockedURL'?: string
  'source-file'?: string
  'sourceFile'?: string
  'line-number'?: number
  'lineNumber'?: number
}

/** First non-empty value across the spellings of one field. */
function pick(r: ViolationReport, ...keys: (keyof ViolationReport)[]): string {
  for (const k of keys) {
    const v = r[k]
    if (v !== undefined && v !== null && String(v).trim()) return String(v)
  }
  return ''
}

export default defineEventHandler(async (event) => {
  const ip = clientIp(event)
  // Generous enough for a genuinely misconfigured page, low enough that this
  // cannot become a write amplifier against the log collection.
  rateLimit({ scope: 'csp-report', ip, max: 20, windowMs: 60_000 })

  // Read the raw text and parse it here rather than relying on readBody.
  //
  // Browsers post these as `application/csp-report` or
  // `application/reports+json`, and h3 only auto-parses JSON content types. It
  // handed back an empty object instead, which sailed straight through the
  // checks below and produced log entries with every field blank — worse than
  // no entry, because an empty row still looks like data.
  const raw = await readRawBody(event).catch(() => null)
  if (!raw) return setResponseStatus(event, 204)

  let body: unknown
  try {
    body = JSON.parse(typeof raw === 'string' ? raw : raw.toString('utf8'))
  }
  catch {
    // Log what actually arrived rather than dropping it — the shape is the
    // thing we would need to add support for.
    await log('warn', 'security', 'Unparseable CSP report', {
      sample: String(raw).slice(0, 300),
      contentType: getRequestHeader(event, 'content-type') ?? '',
    }, { ip })
    return setResponseStatus(event, 204)
  }
  if (!body || typeof body !== 'object') return setResponseStatus(event, 204)

  // Browsers send either the legacy `{"csp-report": {...}}` shape (report-uri)
  // or an array of Reporting API envelopes (report-to). Accept both.
  const reports: ViolationReport[] = Array.isArray(body)
    ? (body as { body?: ViolationReport }[]).map(r => r?.body ?? {})
    : [(body as { 'csp-report'?: ViolationReport })['csp-report'] ?? (body as ViolationReport)]

  for (const r of reports.slice(0, 5)) {
    const directive = (pick(r, 'effectiveDirective', 'effective-directive', 'violated-directive') || 'unknown').slice(0, 60)
    const blocked = pick(r, 'blockedURL', 'blocked-uri').slice(0, 200)
    const source = pick(r, 'sourceFile', 'source-file').slice(0, 200)

    if (IGNORED_SOURCES.some(p => blocked.startsWith(p) || source.startsWith(p))) continue

    // A report naming neither a directive nor a blocked resource tells us
    // nothing. Record the payload once so the shape can be supported, rather
    // than emitting "CSP would have blocked unknown" with every field empty.
    if (directive === 'unknown' && !blocked && !source) {
      await log('warn', 'security', 'CSP report in an unrecognised shape', {
        keys: Object.keys(r).slice(0, 12).join(', '),
        sample: JSON.stringify(r).slice(0, 300),
      }, { ip })
      continue
    }

    // The logger already collapses identical entries per window, so a violation
    // firing on every page load costs one document, not one per visitor.
    await log('warn', 'security', `CSP would have blocked ${directive}`, {
      directive,
      blocked,
      source,
      line: r.lineNumber ?? r['line-number'] ?? null,
      page: pick(r, 'documentURL', 'document-uri').slice(0, 200),
    }, { ip })
  }

  // 204: the browser does not read the response, and returning a body would
  // only give a prober something to measure.
  return setResponseStatus(event, 204)
})
