/**
 * Sends alias hostnames to the canonical one, permanently.
 *
 * `www.ilytat.com` and `sites.ilytat.com` both serve this application, which
 * means every page on the site exists at two addresses. To a search engine that
 * is two sites saying identical things: links, relevance and authority are
 * split between them, and neither ranks as well as the one site would have.
 *
 * The `<link rel="canonical">` tags already point at sites.ilytat.com and help,
 * but they are a hint. A 301 is an instruction, it consolidates the signals
 * rather than merely expressing a preference, and it stops a visitor who
 * arrived on the wrong host from staying there for the rest of their session.
 *
 * ── Deliberately narrow ───────────────────────────────────────────────────
 *
 * This redirects only hosts named in ALIASES. The tempting shorter rule —
 * "redirect anything that is not canonical" — would break every Vercel preview
 * deployment, since those are served from generated *.vercel.app hostnames, and
 * would break local development too. An SEO fix that silently disables preview
 * review is a bad trade.
 *
 * The apex `ilytat.com` is deliberately absent: it was never confirmed to serve
 * this app, and redirecting a domain that hosts something else would take that
 * other thing offline. Add it below only after checking.
 *
 * ── Changing which host is canonical ──────────────────────────────────────
 *
 * The target comes from SITE_URL, so flipping to www is an env change plus
 * moving `www.ilytat.com` out of ALIASES and `sites.ilytat.com` into it. If you
 * do that, also update the website field on the Google Business Profile, or the
 * profile will point at a URL that immediately redirects.
 */

/** Hosts confirmed to serve this app that should not rank on their own. */
const ALIASES = new Set([
  'www.ilytat.com',
])

export default defineEventHandler((event) => {
  const host = getRequestHeader(event, 'host')?.toLowerCase().split(':')[0]
  if (!host || !ALIASES.has(host)) return

  const canonical = String(useRuntimeConfig(event).public.siteUrl || '')
  if (!canonical.startsWith('http')) return

  let target: URL
  try {
    target = new URL(canonical)
  }
  catch {
    return
  }

  // Never redirect a host to itself — that is an infinite loop, and it is one
  // of two mistakes in this file that would take the site down.
  if (target.hostname.toLowerCase() === host) return

  // The other one. SITE_URL defaults to http://localhost:3000, so an
  // environment that forgot to set it would send every visitor on the alias
  // domain to their own machine — a 301, which browsers cache, so the damage
  // outlives the fix. Refuse to send public traffic anywhere unroutable.
  const unroutable = target.hostname === 'localhost'
    || target.hostname === '127.0.0.1'
    || target.hostname === '::1'
    || target.hostname.endsWith('.local')
    || !target.hostname.includes('.')
  if (unroutable) {
    console.warn(
      `[canonical-host] refusing to redirect ${host} to "${canonical}" — `
      + 'SITE_URL is not set to a public origin',
    )
    return
  }

  const path = event.path || '/'
  // 301 rather than 302: a temporary redirect tells search engines to keep
  // indexing the alias, which leaves the duplication in place.
  return sendRedirect(event, `${target.origin}${path}`, 301)
})
