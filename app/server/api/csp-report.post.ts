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
  'disposition'?: string
}

/** A report plus the Reporting API `type` that carried it, if there was one. */
interface Envelope {
  type: string
  report: ViolationReport
}

/**
 * Pull the violation out of whichever wrapper the browser used.
 *
 * There are four, and the previous version handled two. It unwrapped the
 * Reporting API's `body` only when the payload was an *array* of envelopes —
 * but Chrome also posts a single bare envelope, and every one of those was
 * logged as "CSP report in an unrecognised shape" with the real report sitting
 * one level down, untouched, inside it. Eleven of them in one nightly digest,
 * each carrying a violation nobody could read.
 *
 * That is the failure this endpoint's own comments warn about: a log entry that
 * looks like data and is not. The parser must be as forgiving as the senders
 * are inconsistent.
 */
function unwrap(v: unknown): Envelope[] {
  if (Array.isArray(v)) return v.flatMap(unwrap)
  if (!v || typeof v !== 'object') return []
  const o = v as Record<string, unknown>

  // report-uri: {"csp-report": {...}}. Checked first — a violation report never
  // contains a key called `body`, but this wrapper could gain one.
  const legacy = o['csp-report']
  if (legacy && typeof legacy === 'object') {
    return [{ type: 'csp-violation', report: legacy as ViolationReport }]
  }

  // Reporting API: {type, url, age, user_agent, body: {...}}, sent either bare
  // or inside an array.
  if (o.body && typeof o.body === 'object') {
    return [{ type: String(o.type ?? 'csp-violation'), report: o.body as ViolationReport }]
  }

  // Already the report itself.
  return [{ type: 'csp-violation', report: o as ViolationReport }]
}

/** Host only — the actionable part of a blocked URL when writing a policy. */
function hostOf(url: string): string {
  if (!url || !url.includes('://')) return url.slice(0, 60)
  try {
    return new URL(url).host
  }
  catch {
    return url.slice(0, 60)
  }
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

  for (const { type, report: r } of unwrap(body).slice(0, 5)) {
    // A Reporting-Endpoints endpoint can receive deprecation, intervention and
    // crash reports as well as violations. Only `report-to csp` points here, so
    // this should not fire — recorded at info rather than warn if it ever does,
    // because a browser telling us about a deprecated API is worth reading and
    // is not a security warning.
    if (type !== 'csp-violation') {
      await log('info', 'security', `Browser sent a ${type.slice(0, 40)} report`, {
        sample: JSON.stringify(r).slice(0, 300),
      }, { ip })
      continue
    }

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
    //
    // The blocked host is part of the *message*, not just the data, because the
    // logger dedups on the message: without it every connect-src violation in a
    // window collapses into one row and you learn that something was blocked
    // but not what. One row per (directive, host) is the unit you actually act
    // on when widening a policy.
    const target = hostOf(blocked || source)
    await log('warn', 'security', `CSP would have blocked ${directive}${target ? ` \u2192 ${target}` : ''}`, {
      directive,
      blocked,
      source,
      disposition: r.disposition ?? '',
      line: r.lineNumber ?? r['line-number'] ?? null,
      page: pick(r, 'documentURL', 'document-uri').slice(0, 200),
    }, { ip })
  }

  // 204: the browser does not read the response, and returning a body would
  // only give a prober something to measure.
  return setResponseStatus(event, 204)
})
