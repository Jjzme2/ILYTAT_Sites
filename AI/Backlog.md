---
owner: JJ
updated: 2026-08-02
---

# Dev Backlog

Outstanding work, roughly in priority order. Items are written so they can be
picked up cold — each says what to do, where, and how to tell it worked.

---

## Imagery

The site currently ships with no photography and one placeholder asset. Every
slot below is already wired — supplying the file is the whole task, no code
changes needed.

### 1. Hero image

- **What:** A photo for the hero's right column. Best options, in order: a real
  project screenshot on a device, JJ working, or a recognisable Kankakee County
  streetscape. Avoid stock — it reads as stock.
- **Where:** Drop the file in `public/`, then set `heroImage` in
  `app/config/site.config.ts` (e.g. `heroImage: '/hero.jpg'`).
- **Spec:** 420×470 or larger, same aspect. It renders `object-cover`, so the
  subject should sit centre.
- **Until then:** falls back to the typographic stat panel (build time /
  hosting / ownership). That fallback is deliberate and fine to ship — the slot
  never looks empty.
- **Verify:** load `/`, confirm the photo replaces the stat panel and the hero
  still fits above the fold at 1440×900.

### 2. Founder photo

- **What:** A headshot. This is the single highest-trust asset on a
  one-person-agency site — buyers want to see who they'd be working with.
- **Where:** `public/`, then set `founder.photo` in `app/utils/siteContent.ts`.
- **Spec:** square, 112×112 minimum (rendered at 56px, 2x for retina).
- **Until then:** falls back to a "J" monogram.
- **Verify:** load `/#about` and check the photo is sharp, not stretched.

### 3. Logo — confirm the CDN, then commit a local copy

- **What:** The logo loads from `https://media.ilytat.com/logo.png`. This was
  never verified from a build environment because outbound HTTPS is blocked
  there, so it is unknown whether it currently serves.
- **First step:** Load the live site. If you see the **ILYTAT wordmark** instead
  of the logo, the CDN is failing and the fallback is doing its job. If you see
  the logo, everything is fine.
- **Either way:** commit `logo.png` + `logo-72.webp` + `logo-144.webp` into
  `public/` and point `SiteNav.vue`, `SiteFooter.vue` and `layouts/blog.vue` at
  the local paths. A third-party CDN is a single point of failure for the first
  thing on the page, and self-hosting removes a DNS+TLS round trip.
- **Verify:** load the site with the network throttled — the logo should appear
  without a flash of the wordmark.

### 4. Favicon — replace the placeholder

- **What:** `public/favicon.svg` is a placeholder monogram, not the real mark.
- **Where:** replace the file; `nuxt.config.ts` already points at it.
- **Verify:** hard-reload and check the browser tab.

### 5. Social share image (`og:image`)

- **What:** Also CDN-hosted (`media.ilytat.com/og-preview.png`) and unverified.
  This is what renders when anyone shares the site in Facebook, iMessage or
  LinkedIn — a broken one looks worse than none.
- **Where:** commit a local `public/og-preview.png` and update the `og:image`
  and `twitter:image` entries in `nuxt.config.ts` and `app/pages/index.vue`.
- **Spec:** exactly 1200×630.
- **Verify:** paste the URL into
  [opengraph.xyz](https://www.opengraph.xyz) after deploying.

### 6. Portfolio projects

- **What:** The portfolio section pulls from the Firestore `projects`
  collection. With none, it shows the "what ships in every build" cards instead
  of work samples.
- **Where:** add documents to `projects` — see the field list documented at the
  top of `app/server/api/projects.get.ts` (`title`, `description`, `industry`,
  `url`, `imageUrl`, `order`, `visible`).
- **Note:** even one real project changes the section from an argument into
  evidence. Screenshots of live sites are enough; they don't need to be styled.

---

## Configuration

### 7. Rename OPENCLOUD_* to OPENROUTER_*

- **What:** The env vars `OPENCLOUD_BASE_URL` and `OPENCLOUD_API_KEY` are a
  misnomer. They were always meant to be OpenRouter — the code appends
  `/chat/completions` and speaks the OpenAI wire format, which is exactly
  OpenRouter's API. There is no product called "OpenCloud" involved.
- **Current state:** both names are read, and `OPENROUTER_*` wins when both are
  set, so nothing breaks either way.
- **To finish:** set `OPENROUTER_API_KEY` (and `OPENROUTER_BASE_URL` if you are
  not on the default) in Vercel, delete the `OPENCLOUD_*` vars, then remove the
  two legacy lines in `nuxt.config.ts` and their reads in
  `app/server/utils/ai.ts`.
- **Model:** `OPENROUTER_MODEL` defaults to `deepseek/deepseek-chat` — roughly
  an order of magnitude cheaper than the Gemini/GPT tier and strong at the
  structured-JSON work every call here does. Change the env var to switch; no
  deploy needed.

### 8. PageSpeed API key

- **What:** `/tools/website-audit` returns "Google is rate-limiting audits"
  without a key. Anonymous PageSpeed quota is per-IP, and Vercel functions
  egress from shared IP pools, so that quota is effectively always exhausted.
- **How:** Google Cloud Console → enable **PageSpeed Insights API** → create an
  API key → restrict to that API only, application restrictions **None** (the
  call is server-side, so a referrer restriction would break it).
- **Set as:** `NUXT_PAGESPEED_API_KEY` in Vercel (Production + Preview). Use the
  `NUXT_` prefix — it is read at runtime, so no redeploy is needed. The bare
  `PAGESPEED_API_KEY` is only read at build time.
- **Verify:** run an audit on the live site and get real scores back.

---

## Reminders

### Stripe prices need updating

The site's package prices live in `app/config/site.config.ts` (Pop-Up $499 /
Local Business $999 / Web Application $2,999, plus $89-$149/mo hosting).
**Stripe does not read from this file** — there are no Stripe references left
in the codebase at all, so the products and prices in the Stripe dashboard are
maintained entirely by hand. Whenever pricing changes here, change it there
too, or a checkout will charge the old amount.

---

## Observability — how it works now

Nothing here needs configuring to work; the defaults are sensible. This is a
map so future-you knows where to look.

- **Every server error is captured automatically.** `app/server/plugins/
  observability.ts` hooks Nitro and writes any unhandled 5xx to the `logs`
  collection with the route, a request id, and the stack. 4xx responses are
  recorded at `info` so patterns stay visible without crying wolf. Every
  response carries an `x-request-id` header — if someone reports a problem, ask
  for that id and search the Logs tab for it.
- **Browser errors reach you too.** `app/plugins/error-reporting.client.ts`
  forwards JavaScript failures to `/api/analytics/error`. They appear in the
  admin Analytics tab under "Browser errors". Known browser noise
  (ResizeObserver, extensions, cancelled navigations) is filtered out.
- **Criticals email immediately**, throttled to one per 30 minutes per distinct
  message. Everything else waits for the 2 AM digest.
- **Repeated identical log lines collapse.** A failing dependency writes one
  Firestore document per 5-minute window with a `repeats` count, rather than one
  per request. The console still shows every occurrence.
- **Only allowlisted analytics events are stored.** Adding a new `track()` call
  means adding its name to `EVENTS` in
  `app/server/api/analytics/event.post.ts`, or it is silently dropped. This is
  deliberate — a typo should not create a metric nobody reads.

Optional environment variables, both with working defaults:

- `LOG_RETENTION_DAYS` (default 45) — logs older than this are deleted nightly.
- `ANALYTICS_RETENTION_DAYS` (default 180) — same for `analytics_events`.

### Turnstile can throw on locked-down networks

If a visitor's network or extension blocks `challenges.cloudflare.com`,
`nuxt-turnstile` throws `Cannot read properties of undefined (reading 'render')`
and the contact form's verification widget never appears. This is a gap in the
library, not our code, and it is invisible in dev. It will now show up in the
Browser errors panel — if the count is more than a trickle, the fix is to gate
the widget behind a load check and fall back to letting the form submit without
it.

---

## Known rough edges

Not urgent, but worth knowing about.

- **`text-[var(--x)]` emits no CSS.** Tailwind can't tell whether the value is
  a colour or a font-size, so it silently skips the utility. Use the
  `text-(--x)` shorthand. Also avoid naming a token `--theme-text` — that exact
  name fails to resolve even in shorthand form, which is why the base text
  token is `--theme-fg`.
- **Tailwind's `dark:` variant does not follow the site theme.** It keys off
  `prefers-color-scheme`, while the site themes via `data-theme` on `<html>`.
  Add a themed token instead (see `--status-good/warn/bad` in `main.css`).
- **`npm run a11y`** drives the real page in Chromium and asserts WCAG contrast
  on every text node in both themes. Run it after any colour or typography
  change. `A11Y_PATHS` takes a comma-separated route list.
- **Dev server serves stale CSS** after edits to `main.css` more often than it
  should. If a style change appears not to apply, restart it before debugging.
- **11 pre-existing lint errors** on `main` (unused vars in
  `nightly-report.get.ts` and `firebaseAdmin.ts`). Untouched so far because
  they're unrelated to any change made; worth a cleanup pass.
