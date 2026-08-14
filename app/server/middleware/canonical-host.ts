/**
 * Sends alias hostnames to the canonical one, permanently.
 *
 * ⚠️ THIS REDIRECT IS TEMPORARY. Read the brand note before extending it.
 *
 * ── Brand architecture ────────────────────────────────────────────────────
 *
 * `ilytat.com` is the root of ILYTAT itself, not of this application. This app
 * is one branch — `sites` — alongside `games`, with a hub under consideration
 * that would tie them together. So `sites.ilytat.com` is the correct canonical
 * host for this codebase permanently, and no future change should point it at
 * the apex or at www.
 *
 * `www.ilytat.com` currently serves this app, which is an accident of setup
 * rather than a decision. That is the only reason it is redirected here.
 *
 * ⚠️ WHEN www.ilytat.com BECOMES THE ILYTAT HUB, DELETE IT FROM ALIASES FIRST.
 * Leaving it would 301 the brand root into one of its own branches — the hub
 * would be unreachable, and because 301s are cached by browsers the breakage
 * would outlive the deploy that caused it.
 *
 * ── Why it exists in the meantime ─────────────────────────────────────────
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
 * ── Do not flip the canonical ─────────────────────────────────────────────
 *
 * The target comes from SITE_URL and should stay on sites.ilytat.com. Pointing
 * this app at www or the apex would take a hostname that belongs to the brand
 * and give it to one product — the opposite of the structure above. The knob
 * exists so the value has one home, not because it is meant to be turned.
 */

/**
 * Hosts confirmed to serve this app that should not rank on their own.
 *
 * Only add a host after confirming it actually serves this application. The
 * apex `ilytat.com` is deliberately absent for two reasons: it was never
 * confirmed, and it is reserved for ILYTAT itself — redirecting it here would
 * hand the brand root to one branch of it.
 */
const ALIASES = new Set([
  // Remove when this becomes the ILYTAT hub. See the warning above.
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
