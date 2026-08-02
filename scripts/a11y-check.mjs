/**
 * Contrast regression check.
 *
 * Drives the real page in Chromium and computes the WCAG contrast ratio for
 * every rendered text node against its nearest opaque background, in both
 * themes. Exits non-zero on any failure so it can gate a commit or CI job.
 *
 * Usage:  npm run dev   (in another shell)
 *         npm run a11y
 *
 * Env:
 *   A11Y_URL          page to audit          (default http://localhost:3000)
 *   A11Y_CHROMIUM     explicit browser path  (default: Playwright's own)
 *   A11Y_SHOTS        directory for screenshots, if set
 */
import { chromium } from 'playwright'

const URL = process.env.A11Y_URL || 'http://localhost:3000'
const SHOTS = process.env.A11Y_SHOTS || null
const PATHS = (process.env.A11Y_PATHS || '/,/services,/services/contractor-websites')
  .split(',')
  .map(p => p.trim())
  .filter(Boolean)

const browser = await chromium.launch(
  process.env.A11Y_CHROMIUM ? { executablePath: process.env.A11Y_CHROMIUM } : {},
)

let failures = 0

for (const path of PATHS) {
for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(URL + path, { waitUntil: 'networkidle', timeout: 60000 })
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t)
    // Sections use `content-visibility: auto`, so off-screen subtrees are not
    // rendered and getComputedStyle reports values from their last paint —
    // which would be the previous theme. Force them visible before measuring.
    const s = document.createElement('style')
    s.textContent = '*{content-visibility:visible !important;transition:none !important}'
    document.head.appendChild(s)
  }, theme)
  await page.waitForTimeout(800)

  // Walk every text node actually rendered and compute contrast against the
  // nearest non-transparent ancestor background.
  const bad = await page.evaluate(() => {
    const lum = (c) => {
      const [r, g, b] = c.map((v) => {
        v /= 255
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const parse = (s) => {
      const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/)
      if (!m) return null
      return { c: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] }
    }
    const bgOf = (el) => {
      let n = el
      while (n && n !== document.documentElement) {
        const cs2 = getComputedStyle(n)
        // Gradient fills report a transparent backgroundColor; scoring against
        // an ancestor would be wrong, so treat them as opaque and skip.
        if (cs2.backgroundImage && cs2.backgroundImage.includes('gradient')) return null
        const p = parse(cs2.backgroundColor)
        if (p && p.a > 0.6) return p.c
        n = n.parentElement
      }
      const p = parse(getComputedStyle(document.documentElement).backgroundColor)
      return p ? p.c : [255, 255, 255]
    }
    const ratio = (a, b) => {
      const l1 = lum(a), l2 = lum(b)
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
    }

    const out = []
    for (const el of document.querySelectorAll('body *')) {
      const txt = [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join(' ')
        .trim()
      if (!txt) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      if (parseFloat(cs.opacity) < 0.5) continue
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      // Gradient-clipped text has transparent fill by design; skip it.
      if (cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)') continue
      const fg = parse(cs.color)
      if (!fg || fg.a < 0.5) continue

      const size = parseFloat(cs.fontSize)
      const weight = parseInt(cs.fontWeight, 10) || 400
      const large = size >= 24 || (size >= 18.66 && weight >= 700)
      const need = large ? 3 : 4.5
      const bg = bgOf(el)
      if (!bg) continue
      const got = ratio(fg.c, bg)
      if (got < need) {
        out.push({
          text: txt.slice(0, 46),
          tag: el.tagName.toLowerCase(),
          color: cs.color,
          size: Math.round(size),
          got: +got.toFixed(2),
          need,
        })
      }
    }
    return out
  })

  console.log(`\n=== ${path} [${theme}]: ${bad.length} contrast failures ===`)
  for (const b of bad.slice(0, 14)) {
    console.log(`  ${b.got}/${b.need}  ${b.size}px  ${b.color}  "${b.text}"`)
  }
  failures += bad.length
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/theme-${theme}.png`, fullPage: false })
  await ctx.close()
}
}

await browser.close()
console.log('\nTOTAL FAILURES:', failures)
process.exit(failures > 0 ? 1 : 0)
