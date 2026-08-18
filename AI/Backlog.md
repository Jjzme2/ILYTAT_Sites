---
owner: JJ
updated: 2026-08-12
---

# Dev Backlog

Outstanding work, roughly in priority order. Items are written so they can be
picked up cold — each says what to do, where, and how to tell it worked.

---

## ⭐ JJ's list — things only you can do

Nothing here needs a developer. Ranked by what actually moves the needle, and
kept short on purpose: the first two are worth more than everything below them
combined.

### 1. Get reviews on the Google Business Profile

The single biggest lever available. `sameAs` now connects the profile to the
site, so reviews compound across both — they lift the listing in the local pack
*and* the site in ordinary results. Ten genuine reviews would likely outrank
every technical change made to this site.

Ask the last five clients. A text with the direct review link converts far
better than "leave us a review sometime".

- [ ] Send review requests to recent clients

### 2. Write five `proof` sentences

`app/config/site.config.ts` → `locations` → each entry has an empty `proof`.

One real sentence per town: a client, a job, a business known by name. This is
the highest-value edit in the codebase and the one thing that cannot be written
for you — inventing a client would be worse than leaving it blank, so the block
simply does not render while empty.

Example shape: *"The site for [shop] in Bradley went live in nine days."*

- [ ] Manteno   - [ ] Kankakee   - [ ] Bourbonnais   - [ ] Bradley   - [ ] Peotone

### 3. Publish the drafted blog posts

Generated posts save as drafts by design. They are invisible until published —
to visitors, to the homepage blog section, and to search. Admin → Blog.

- [ ] Review and publish the pending drafts

### 4. Google Business Profile housekeeping

- [ ] List all five towns as service areas, matching `areaServed` in the schema
- [ ] Add real photos — profiles with them get materially more engagement
- [ ] Post weekly; the blog already supplies the content

### 5. Environment and config

- [ ] `STRIPE_RESTRICTED_KEY` in Vercel — Products: Read, Prices: Read, nothing
      else. Worth doing now that the product names are verified: all six tiers
      will sync. Prices are already correct either way.
- [ ] Delete `GEMINI_API_KEY` — nothing reads it since Gemini was removed
- [ ] Confirm nothing still sets `OPENCLOUD_*`, then those two lines in
      `nuxt.config.ts` and their reads in `server/utils/ai.ts` can go
- [ ] Add Facebook / LinkedIn URLs to `businessConfig.profiles` when accounts exist

### 6. Two things to eyeball that could not be checked from a sandbox

- [ ] The "Forgot your password?" link on `/admin` — `/admin` cannot render
      without Firebase credentials, so it is verified in code and in the built
      bundle but never seen
- [ ] That the crons fire on Monday (15:00–15:59 UTC). Actions → Scheduled jobs
      shows the run history

### 7. Set the response-format preference globally

Claude app → Settings → Personal preferences. Applies across every chat, which
a repo file cannot:

```
End every response with a short summary, preceded by a horizontal rule
(a line of --- on its own) so I can jump straight to it. Everything above
the rule is detail; everything below is what I can act on.
```

- [ ] Paste into personal preferences

---

## 🔧 Open engineering items

Things a developer can pick up, none blocking.

### ⚠️ When www.ilytat.com becomes the ILYTAT brand

Structure, for whoever picks this up cold:

- `ilytat.com` / `www.ilytat.com` — ILYTAT itself. **Not this app.**
- `sites.ilytat.com` — this application. Canonical, permanently.
- `games.ilytat.com` — a separate branch.
- A hub tying them together is under consideration.

Both hostnames currently serve this app, which is an accident of setup. The
first item below exists only because of that and should be undone the moment it
stops being true.

#### Will break silently if missed

- [ ] **Remove `www.ilytat.com` from `ALIASES`** in
      `app/server/middleware/canonical-host.ts` **before** pointing that
      hostname anywhere else. Otherwise the brand root 301s into one of its own
      branches. Browsers cache 301s, so the breakage outlives the deploy that
      caused it and visitors who hit it once stay broken.
- [ ] **Update the website field on the Google Business Profile.** It currently
      points at `sites.ilytat.com`. Decide deliberately whether the profile
      should send people to the brand or to this product — see below — but
      either way it must not point at a URL that redirects.
- [ ] **Add the new hostname to Search Console as its own property.** Each
      subdomain is separate there. Without it, the hub's coverage and query data
      simply do not exist, which looks identical to the hub getting no traffic.

#### Decisions worth making deliberately

- [ ] **Which URL is ILYTAT the *organisation*.** Today the `LocalBusiness`
      schema on this app claims `url: sites.ilytat.com` and carries the phone,
      address, `areaServed` and the `sameAs` link to the Business Profile. With
      a hub, the business plausibly lives at the root and this app becomes one
      of its offerings. Getting it wrong splits entity signals across two URLs —
      the same failure the www redirect was added to fix, one level up.
- [ ] **Whether the Business Profile points at the brand or the product.** There
      is only one profile, and its reviews and prominence attach to whatever it
      links to. If most inbound work is web design, sending it here may stay
      correct even after a hub exists.
- [ ] **Cross-linking between branches.** A hub that links to sites and games,
      and branches that link back, is how authority moves between them. Without
      it each subdomain accumulates reputation alone.

#### Cosmetic, but noticeable once a brand exists

- [ ] Shared brand assets: `og:image`, favicon and logo currently live under
      `media.ilytat.com` and are referenced per-app.
- [ ] `RESEND_FROM` and `RESEND_INVOICE_FROM` send as `@ilytat.com` already, so
      those stay correct — worth re-reading once the brand voice is settled.
- [ ] Analytics and Speed Insights are per-Vercel-project, so each branch
      reports separately. Fine, but there is no combined view without building
      one.

The canonical host for *this* app comes from `SITE_URL`. It exists so the value
has one home, not because it is meant to be changed — pointing this app at www
or the apex would hand a brand hostname to a single product.

### ~~The iOS Safari `o.id` error~~ — solved

Was: `TypeError: null is not an object (evaluating 'o.id')` on iPhone Safari,
alongside `Cannot read properties of undefined (reading 'render')` on Chrome.

**One bug, two engines.** Confirmed against the built bundle: nuxt-turnstile's
plugin does `await this.loadTurnstile()` then `window.turnstile.render(...)`.
`loadTurnstile()` awaits `window.loadTurnstile`, which the inline bootstrap only
defines once Cloudflare's script has run — so when challenges.cloudflare.com is
blocked, that value is undefined, `await undefined` resolves immediately, and it
dereferences a `window.turnstile` that never arrived.

The log line was the smaller half. The review tool's submit button is gated on
the Turnstile token, so it stayed disabled forever with no explanation — the
free tool was silently broken for anyone running a content blocker.

Fixed: the tool now waits ten seconds and, if no token has arrived, explains
what happened and offers a way through. Both messages are suppressed in the
client error reporter **only because the condition is handled** — if that
handling is ever removed, remove the suppression with it.

### Blog generation is close to the serverless ceiling

Vercel's Hobby plan caps a function at sixty seconds. Weekly blog generation
spends 50s of that on the model and the rest on the Firestore read before it and
the write, sanitise and email after — so post length is bounded by the platform,
not by editorial preference.

That is why the prompt asks for 600–800 words rather than 700–1000. Raising
`AI_BLOG_MAX_TOKENS` does not help: it is a ceiling, not a throttle, and raising
it is what let the model produce the full thousand words that tipped generation
past the deadline in the first place.

Estimated at ~40 tokens/sec: 800 words is roughly 42s of generation, 1000 words
roughly 48s. The margin is real but not large, and a slow day at the provider
could still time out. If that starts happening, or if longer posts are wanted:

- **Vercel Pro** raises `maxDuration` to 300s — the smallest change, and it also
  removes the cold-start pressure on `/api/promotion`.
- **A faster model** via `OPENROUTER_MODEL`.
- **Generate out of band** — have the cron enqueue the work rather than do it,
  so no single request has to finish inside sixty seconds. The most work, and
  the only option that stops the ceiling mattering at all.

The failure is loud either way: the job emails on failure and the GitHub Actions
run goes red.

### Standalone draft preview was removed, not broken-in-place

`/blog/preview/:id` and its admin endpoint are gone. The page fetched an
admin-only route with no auth headers, so it always 404'd — but the deeper
reason it could not simply be patched is that `useAdminHeaders` reads the TOTP
session from `sessionStorage`, which is per-tab. The link opened a new tab, so
that session was never present. Any fix would have meant either moving the TOTP
session to `localStorage` (persisting it across tabs and restarts, which is a
real weakening for a second factor) or previewing in the same tab.

Neither is worth it while the edit modal's Live Preview toggle renders the post
with the real blog styling from data already in memory. If a full-page preview
is ever wanted — to see a draft exactly as a reader will, at full width — the
same-tab route is the one to take.

### Enforce the Content-Security-Policy

Shipped as `Content-Security-Policy-Report-Only`. Watch Admin → Logs, area
`security`, for a week or two of real traffic. When the only reports left are
browser extensions, rename the header to `Content-Security-Policy` in
`nuxt.config.ts`. Not before — a wrong CSP breaks the contact form silently.

### Per-page `og:image`

Every shared link uses the same generic card. Blog posts already use their cover
image when one is set; town pages and service pages have nothing. Doing this
properly needs an image-generation endpoint (Satori/resvg or similar), since
social platforms will not accept SVG.

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

## ⚠️ Cron schedules live in `nuxt.config.ts`, never in `vercel.json`

The scheduled jobs silently never ran — not once. Vercel's Cron Jobs page showed
no invocations because there were no cron jobs registered.

**Why:** Nitro's `vercel` preset builds with the Build Output API, so
`.vercel/output/config.json` *is* the deployment configuration. Nothing copies
`crons` out of the root `vercel.json` into it. The jobs looked correctly
declared, the dashboard showed the file, and nothing was scheduled.

**Fix:** schedules are defined in `nuxt.config.ts` and injected via
`nitro.vercel.config`. `vercel.json` was deleted — it contained nothing else.

> **Do not re-add a `vercel.json` with `crons`.** Declaring them in both places
> is a hard deployment failure, not a harmless duplicate: Vercel rejects a build
> whose crons come from `vercel.json` and the Build Output API at once. That
> mistake was made and caught here — the first attempt at this fix left the
> `vercel.json` crons in place and the deployment errored.

**To verify after any change to schedules or the Nitro config:**

```bash
VERCEL=1 npm run build
node -e "console.log(JSON.parse(require('fs').readFileSync('.vercel/output/config.json','utf8')).crons)"
```

If that prints `undefined`, nothing is scheduled no matter what `vercel.json`
says.

Route headers (`routeRules`) are *not* affected — those come from Nuxt config
and are emitted correctly. `crons` was the only casualty, because it is the one
setting that lives outside Nuxt config. Verified: the security headers all reach
the build output.

**Note on the watchdog.** The nightly report checks whether a blog post has
appeared in the last nine days, but it is itself a cron — so it could not have
caught this, since it was never registered either. It guards "the job ran and
did nothing"; it cannot guard "no jobs exist." If crons ever go quiet again, the
durable answer is an external trigger (a scheduled GitHub Actions workflow
calling the endpoint with `CRON_SECRET`), which shares no machinery with Vercel
scheduling.

---

## Prices now follow Stripe automatically

**One thing to do:** add `STRIPE_RESTRICTED_KEY` in Vercel. Until it is set the
site runs on the prices committed in `site.config.ts`, exactly as before — so
there is no rush and nothing breaks in the meantime.

### Creating the key (this part matters)

Stripe → Developers → API keys → **Create restricted key**:

- **Products: Read**
- **Prices: Read**
- Everything else: **None**

Then set it in Vercel as `STRIPE_RESTRICTED_KEY`. It will start with `rk_`.

**Do not use your normal secret key (`sk_live_…`).** A full secret can read
customers, charges and balances and can move money. The site only needs to read
the product catalogue, which is already printed on the pricing page — so a
restricted key that leaks costs you nothing. `stripePricing.ts` refuses an `sk_`
key outright and falls back to the committed prices, so a mistake here degrades
instead of leaking, but it is worth getting right the first time.

### What happens after that

Change a price in the Stripe dashboard and the website follows within about 15
minutes. No code change, no deploy, no asking.

Guards, in case something goes wrong:

- **Products are pinned by id and verified by name.** The Stripe account also
  holds Can Do Crew and some promotional prices; a mis-pinned id fails closed
  rather than publishing another venture's price here.
- **Implausible amounts are rejected.** Anything below a quarter or above four
  times the committed price is refused — that catches a cents/dollars unit
  error or a $0 draft.
- **Every failure falls back per tier**, so one bad product cannot blank the
  pricing page.
- **The nightly email reports any price that moved**, and shouts if a tier is
  stuck on the fallback (meaning the site and Stripe have diverged again).
- **Admin → Health** shows each tier and whether it is reading `stripe` or
  `fallback`, with the reason. That is the place to confirm the key works.

### Still maintained by hand

- **Web Application ($2,999)** has no Stripe product, so it stays committed in
  `site.config.ts`. Create the product in Stripe and add it to `TIERS` in
  `app/server/utils/stripePricing.ts` if you want it synced too.
- **`priceRange`** in the SEO schema, and the overage rate.
- **Product *names*** — renaming a product in Stripe will fail the identity
  check until `expectedName` in `TIERS` is updated to match. This is deliberate.

> Product ids in `TIERS` were matched from the live catalogue by amount and
> type. If Health reports a name mismatch on first run, the id is pointing at
> the wrong product — correct it there.

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
