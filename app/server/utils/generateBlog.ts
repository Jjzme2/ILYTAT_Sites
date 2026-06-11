/**
 * generateBlog.ts
 *
 * Calls the Gemini API to write a blog post for ILYTAT, then persists it
 * as a Firestore document in `blog_posts`.
 *
 * Called by:
 *   - POST /api/admin/generate-blog  (manual admin trigger)
 *   - GET  /api/cron/weekly-blog     (Monday auto-generation)
 */

import { firestoreRequest, toFirestoreFields } from '~/server/utils/firebaseAdmin'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GeneratedBlog {
  title:       string
  slug:        string
  excerpt:     string
  content:     string   // HTML
  tags:        string[]
  accentColor: string
}

// ── Brand context injected into every prompt ──────────────────────────────────

const BRAND_CONTEXT = `
ILYTAT LLC is a boutique web design agency based in Manteno, Illinois. We serve small
businesses in Kankakee County — Manteno, Bourbonnais, Bradley, Kankakee, Peotone —
and surrounding areas in northeast Illinois.

What we do:
- Custom-built websites (never templates) — clients own every line of code
- Full-service: design, development, hosting, maintenance
- Managed hosting plans starting at $89/month
- Ideal clients: local brick-and-mortar shops, service businesses (contractors,
  plumbers, electricians, HVAC), restaurants, medical practices, salons, fitness,
  real estate, nonprofits

Brand voice: professional but warm, plainspoken, practical. Never condescending.
We write for business owners, not developers. Avoid jargon; explain trade-offs simply.

Blog purpose:
- Establish ILYTAT as the go-to web authority for Kankakee County businesses
- Help owners make confident decisions about their web presence
- Drive inbound leads by answering questions they are already Googling
`.trim()

// ── Gemini REST call ──────────────────────────────────────────────────────────

export async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'
  const url   = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Gemini API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error(`Gemini returned no content: ${JSON.stringify(data).slice(0, 300)}`)
  return text
}

// ── Blog generation ───────────────────────────────────────────────────────────

export async function generateBlogPost(opts: {
  focalPoint:      string
  additionalNotes?: string
  apiKey:          string
}): Promise<GeneratedBlog> {
  const today = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  const prompt = `
${BRAND_CONTEXT}

Today is ${today}.

Write one blog post for the ILYTAT website with this focal point:
"${opts.focalPoint}"
${opts.additionalNotes ? `\nExtra context from the team:\n${opts.additionalNotes}` : ''}

Return ONLY a single valid JSON object — no markdown fences, no commentary outside the JSON:

{
  "title":       "Blog post title, 50–70 characters, compelling and specific",
  "slug":        "url-friendly-slug-all-lowercase-hyphens-no-specials",
  "excerpt":     "2–3 sentence summary for the listing page, 120–160 characters",
  "content":     "Full post as HTML. Use only: <h2> <h3> <p> <ul> <ol> <li> <strong> <em> <blockquote>. No <html>/<body>/<head> wrappers.",
  "tags":        ["tag1", "tag2", "tag3"],
  "accentColor": "One hex color from this list only: #6366f1 #10b981 #f59e0b #ef4444 #8b5cf6 #06b6d4"
}

Content requirements:
- 700–1 000 words inside the content field
- Open with a locally-relevant hook (Kankakee County or a specific city when natural)
- At least two <h2> section headings
- At least one <ul> or <ol> list
- Close with a short call-to-action paragraph mentioning ILYTAT by name
- Tone: warm, practical, no tech jargon
`.trim()

  const raw = await callGemini(opts.apiKey, prompt)

  let parsed: GeneratedBlog
  try {
    parsed = JSON.parse(raw)
  }
  catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error(`Gemini returned non-JSON: ${raw.slice(0, 300)}`)
    parsed = JSON.parse(match[0])
  }

  if (!parsed.title || !parsed.slug || !parsed.content) {
    throw new Error(`Gemini response missing required fields: ${JSON.stringify(parsed).slice(0, 300)}`)
  }

  const validAccents = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

  return {
    title:       String(parsed.title).trim(),
    slug:        String(parsed.slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
    excerpt:     String(parsed.excerpt || '').trim(),
    content:     String(parsed.content || ''),
    tags:        Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
    accentColor: validAccents.includes(parsed.accentColor) ? parsed.accentColor : '#6366f1',
  }
}

// ── Persist to Firestore ──────────────────────────────────────────────────────

export async function createAiBlogPost(opts: {
  focalPoint:      string
  additionalNotes?: string
  status?:         'draft' | 'published'
  apiKey:          string
}): Promise<{ id: string; title: string; slug: string }> {
  const blog   = await generateBlogPost(opts)
  const now    = new Date().toISOString()
  const status = opts.status ?? 'draft'

  const data = {
    title:       blog.title,
    slug:        blog.slug,
    excerpt:     blog.excerpt,
    content:     blog.content,
    coverImage:  '',
    tags:        blog.tags,
    status,
    style: {
      accentColor: blog.accentColor,
      heroStyle:   'gradient',
      fontStyle:   'sans',
    },
    authorName:  'Aria — ILYTAT AI',
    publishedAt: status === 'published' ? now : null,
    createdAt:   now,
    updatedAt:   now,
  }

  const res = await firestoreRequest('POST', 'blog_posts', {
    fields: toFirestoreFields(data as Record<string, unknown>),
  })

  return {
    id:    res.name?.split('/').pop() as string,
    title: blog.title,
    slug:  blog.slug,
  }
}
