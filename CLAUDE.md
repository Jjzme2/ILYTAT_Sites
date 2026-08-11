# Working notes for Claude

Project-level preferences for ILYTAT Sites. These apply to every session in this
repository.

## Response format

**End every response with a concise overview, preceded by a horizontal rule.**

Write the rule as a line of hyphens (`---`) on its own, immediately before the
closing summary. The summary is the part that gets read first and returned to
later, so it must be findable at a glance without scrolling back through the
detail above it.

```
…detailed explanation, findings, code, verification…

---

Short overview of what happened and what is left to do.
```

Everything above the rule is the working detail: what was investigated, what
was found, what changed and how it was verified. Everything below it is the
summary a reader can act on without re-reading the rest.

## Context

- **Operator:** JJ, sole operator of ILYTAT LLC, a web design agency in Manteno,
  Illinois serving Kankakee County. There is no team — anything described as
  "someone should" means JJ, so weigh effort accordingly.
- **Stack:** Nuxt 4, Vue 3, TypeScript, Nitro, Tailwind v4, Firestore (REST +
  service-account JWT), Vercel, OpenRouter/DeepSeek, Resend, Cloudflare R2.

## Standing engineering preferences

Drawn from what has actually gone wrong here; see `AI/Backlog.md` for the
specific traps.

- **Silence is a bug.** Repeatedly, the real defect was something reporting
  success while doing nothing — a cron that was never registered, a job that
  returned HTTP 200 after skipping, a page advertising a price the billing
  account disagreed with. Prefer a loud failure to a quiet fallback, and when a
  fallback is right, say so in a log or an email.
- **Verify against the artifact, not the intent.** Config that looks correct in
  source may never reach the build. Read the generated output — check
  `.vercel/output/config.json` for crons, `.vc-config.json` for `maxDuration`,
  the client bundle for anything that should not be in it.
- **One definition of a fact.** Two copies always drift. A provider check that
  disagreed with the code doing the calling silently disabled the blog for
  weeks; a price hardcoded in two places charged one amount and advertised
  another.
- **Say what was not verified.** Sandbox limits are real — the proxy blocks
  `*.vercel.app` and `sites.ilytat.com`, so live deployments cannot be checked
  from here. State that plainly rather than implying verification that did not
  happen.
