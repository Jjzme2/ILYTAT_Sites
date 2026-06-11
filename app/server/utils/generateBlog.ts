/**
 * generateBlog.ts
 *
 * Calls the AI to write a blog post for ILYTAT, then persists it to Firestore.
 * Provider order: Gemini (primary) → OpenCloud/OpenRouter (fallback).
 * Pattern mirrors app/utils/aiProvider.js.
 *
 * Called by:
 *   - POST /api/admin/generate-blog  (manual admin trigger)
 *   - GET  /api/cron/weekly-blog     (Monday auto-generation)
 */

import { firestoreRequest, toFirestoreFields } from "~/server/utils/firebaseAdmin";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GeneratedBlog {
  title: string;
  slug: string;
  excerpt: string;
  content: string; // HTML
  tags: string[];
  accentColor: string;
}

// ── System prompt (injected into every generation) ────────────────────────────

const SYSTEM_PROMPT = `
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
Write for business owners, not developers. Avoid jargon; explain trade-offs simply.

Blog purpose:
- Establish ILYTAT as the go-to web authority for Kankakee County businesses
- Help owners make confident decisions about their web presence
- Drive inbound leads by answering questions they are already Googling

When given a focal point, write one complete blog post and return ONLY a single valid
JSON object — no markdown fences, no commentary outside the JSON:

{
  "title":       "Blog post title, 50–70 characters, compelling and specific",
  "slug":        "url-friendly-slug-all-lowercase-hyphens-no-specials",
  "excerpt":     "2–3 sentence summary for the listing page, 120–160 characters",
  "content":     "Full post as HTML. Use only: <h2> <h3> <p> <ul> <ol> <li> <strong> <em> <blockquote>. No <html>/<body>/<head> wrappers.",
  "tags":        ["tag1", "tag2", "tag3"],
  "accentColor": "Exactly one hex from this list: #6366f1 #10b981 #f59e0b #ef4444 #8b5cf6 #06b6d4"
}

Content requirements:
- 700–1000 words inside the content field
- Open with a locally-relevant hook (Kankakee County or a specific city when natural)
- At least two <h2> section headings
- At least one <ul> or <ol> list
- Close with a short CTA paragraph mentioning ILYTAT by name
- Tone: warm, practical, no tech jargon
`.trim();

// ── Startup config warnings ───────────────────────────────────────────────────

if (!process.env.GEMINI_API_KEY) {
  console.warn("[generateBlog] GEMINI_API_KEY is not set — primary provider disabled.");
}
{
  const missing = [
    !process.env.OPENCLOUD_BASE_URL && "OPENCLOUD_BASE_URL",
    !process.env.OPENCLOUD_API_KEY && "OPENCLOUD_API_KEY",
  ].filter(Boolean);
  if (missing.length) {
    console.warn(`[generateBlog] OpenRouter fallback disabled — missing: ${missing.join(", ")}`);
  }
}

// ── Provider: Gemini ──────────────────────────────────────────────────────────

async function callGemini(userMessage: string): Promise<string> {
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(40_000),
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const reason = data?.candidates?.[0]?.finishReason ?? "unknown";
    throw new Error(`Gemini empty response (finishReason: ${reason})`);
  }
  return text;
}

// ── Provider: OpenCloud / OpenRouter ─────────────────────────────────────────

async function callOpenCloud(userMessage: string): Promise<string> {
  const baseUrl = process.env.OPENCLOUD_BASE_URL;
  const key = process.env.OPENCLOUD_API_KEY;
  const model = process.env.OPENCLOUD_MODEL ?? "gpt-4o-mini";

  if (!baseUrl || !key) throw new Error("OpenCloud not configured");

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://sites.ilytat.com",
      "X-Title": "ILYTAT LLC",
    },
    signal: AbortSignal.timeout(40_000),
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenCloud ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenCloud returned empty response");
  return text;
}

// ── Unified AI call with fallback ─────────────────────────────────────────────

async function callAI(userMessage: string): Promise<string> {
  if (process.env.GEMINI_API_KEY) {
    try {
      return await callGemini(userMessage);
    } catch (e) {
      console.warn("[generateBlog] Gemini failed, trying OpenCloud:", (e as Error).message);
    }
  }

  if (process.env.OPENCLOUD_API_KEY && process.env.OPENCLOUD_BASE_URL) {
    return await callOpenCloud(userMessage);
  }

  const missing = [
    !process.env.OPENCLOUD_BASE_URL && "OPENCLOUD_BASE_URL",
    !process.env.OPENCLOUD_API_KEY && "OPENCLOUD_API_KEY",
  ].filter(Boolean);
  if (missing.length) {
    console.error(`[generateBlog] No fallback available — missing: ${missing.join(", ")}`);
  }
  throw new Error("No AI provider available. Configure GEMINI_API_KEY or OPENCLOUD_API_KEY.");
}

// ── Blog generation ───────────────────────────────────────────────────────────

export async function generateBlogPost(opts: {
  focalPoint: string;
  additionalNotes?: string;
}): Promise<GeneratedBlog> {
  const today = new Date().toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const userMessage = [
    `Today is ${today}.`,
    `Write a blog post with this focal point: "${opts.focalPoint}"`,
    opts.additionalNotes ? `Extra context from the team:\n${opts.additionalNotes}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const raw = await callAI(userMessage);

  let parsed: GeneratedBlog;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`AI returned non-JSON: ${raw.slice(0, 300)}`);
    parsed = JSON.parse(match[0]);
  }

  if (!parsed.title || !parsed.slug || !parsed.content) {
    throw new Error(`AI response missing required fields: ${JSON.stringify(parsed).slice(0, 300)}`);
  }

  const validAccents = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  return {
    title: String(parsed.title).trim(),
    slug: String(parsed.slug)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, ""),
    excerpt: String(parsed.excerpt || "").trim(),
    content: String(parsed.content || ""),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
    accentColor: validAccents.includes(parsed.accentColor) ? parsed.accentColor : "#6366f1",
  };
}

// ── Persist to Firestore ──────────────────────────────────────────────────────

export async function createAiBlogPost(opts: {
  focalPoint: string;
  additionalNotes?: string;
  status?: "draft" | "published";
}): Promise<{ id: string; title: string; slug: string }> {
  const blog = await generateBlogPost(opts);
  const now = new Date().toISOString();
  const status = opts.status ?? "draft";

  const data = {
    title: blog.title,
    slug: blog.slug,
    excerpt: blog.excerpt,
    content: blog.content,
    coverImage: "",
    tags: blog.tags,
    status,
    style: {
      accentColor: blog.accentColor,
      heroStyle: "gradient",
      fontStyle: "sans",
    },
    authorName: "Aria — ILYTAT AI",
    publishedAt: status === "published" ? now : null,
    createdAt: now,
    updatedAt: now,
  };

  const res = await firestoreRequest("POST", "blog_posts", {
    fields: toFirestoreFields(data as Record<string, unknown>),
  });

  return {
    id: res.name?.split("/").pop() as string,
    title: blog.title,
    slug: blog.slug,
  };
}
