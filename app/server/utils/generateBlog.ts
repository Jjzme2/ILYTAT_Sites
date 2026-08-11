/**
 * generateBlog.ts
 *
 * Calls the AI to write a blog post for ILYTAT, then persists it to Firestore.
 * Provider: OpenRouter, via the shared client in server/utils/ai.ts.
 *
 * Called by:
 *   - POST /api/admin/generate-blog  (manual admin trigger)
 *   - GET  /api/cron/weekly-blog     (Monday auto-generation)
 */

import { firestoreRequest, toFirestoreFields } from "~/server/utils/firebaseAdmin";
import { callAI as callProvider, parseAiJson, BACKGROUND_TIMEOUT_MS } from "~/server/utils/ai";
import { sanitizePostHtml } from "~/server/utils/sanitizeHtml";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GeneratedBlog {
  title: string;
  slug: string;
  excerpt: string;
  content: string; // HTML
  tags: string[];
  accentColor: string;
  /**
   * Suggested topic for next week, produced by the same call that wrote this
   * post. Extracted separately and never rendered into the post itself — the
   * model has just spent a full generation thinking about this subject, so it
   * is better placed than a fresh call to say what should follow.
   */
  nextFocalPoint?: string;
  nextFocalPointWhy?: string;
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
  "accentColor": "Exactly one hex from this list: #6366f1 #10b981 #f59e0b #ef4444 #8b5cf6 #06b6d4",
  "nextFocalPoint": "A different topic for NEXT week's post, phrased as the question a business owner would actually type into Google. Must not repeat this week's topic, and should follow on naturally from it.",
  "nextFocalPointWhy": "One short sentence on why that follows from this post."
}

Content requirements:
- 700–1000 words inside the content field
- Open with a locally-relevant hook (Kankakee County or a specific city when natural)
- At least two <h2> section headings
- At least one <ul> or <ol> list
- Close with a short CTA paragraph mentioning ILYTAT by name
- Tone: warm, practical, no tech jargon

nextFocalPoint and nextFocalPointWhy are the final two keys and are never
optional. They set next week's topic automatically, so an object that omits them
leaves the schedule with nothing to write about. If you are running long, shorten
the post rather than dropping them.
`.trim();

// ── Startup config warnings ───────────────────────────────────────────────────

// ── Provider ─────────────────────────────────────────────────────────────────
// Delegates to the shared client in server/utils/ai.ts. This module previously
// carried its own Gemini + OpenCloud implementations whose error handling
// swallowed the real provider failure into a console.warn, then reported
// "No AI provider available" even when a key was configured — which is what
// made the admin 500 undiagnosable.


async function callAI(userMessage: string): Promise<string> {
  return callProvider({
    system: SYSTEM_PROMPT,
    user: userMessage,
    json: true,
    // Configurable: OpenRouter reserves against the requested ceiling, so this
    // has to fit the available balance, not the expected post length.
    maxTokens: useRuntimeConfig().aiBlogMaxTokens,
    // A whole post is a few thousand tokens of generation and routinely takes
    // longer than the interactive default, which is what aborted this call with
    // "The operation was aborted due to timeout". Nobody is waiting on a spinner
    // here — a cron is — so it gets the long budget.
    timeoutMs: BACKGROUND_TIMEOUT_MS,
  });
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

  const parsed = parseAiJson<GeneratedBlog>(raw);

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
    // Sanitised here rather than at render: v-html executes whatever it is
    // given, and post bodies are model-authored.
    content: sanitizePostHtml(String(parsed.content || "")),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
    accentColor: validAccents.includes(parsed.accentColor) ? parsed.accentColor : "#6366f1",
    // Trimmed and length-capped: this lands in an admin input, and the model
    // occasionally returns a paragraph where a question was asked for.
    nextFocalPoint: String(parsed.nextFocalPoint ?? "").trim().slice(0, 200) || undefined,
    nextFocalPointWhy: String(parsed.nextFocalPointWhy ?? "").trim().slice(0, 300) || undefined,
  };
}

// ── Persist to Firestore ──────────────────────────────────────────────────────

export async function createAiBlogPost(opts: {
  focalPoint: string;
  additionalNotes?: string;
  status?: "draft" | "published";
}): Promise<{ id: string; title: string; slug: string; nextFocalPoint?: string; nextFocalPointWhy?: string }> {
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
    nextFocalPoint: blog.nextFocalPoint,
    nextFocalPointWhy: blog.nextFocalPointWhy,
  };
}
