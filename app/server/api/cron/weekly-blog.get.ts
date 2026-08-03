/**
 * GET /api/cron/weekly-blog
 *
 * Scheduled via vercel.json — runs every Monday at 10 AM CT (15:00 UTC).
 * Can also be triggered manually:
 *   curl -H "x-cron-secret: <CRON_SECRET>" https://sites.ilytat.com/api/cron/weekly-blog
 *
 * Reads the saved blog plan from adminConfig/blog-plan.
 * Falls back to a rotating default topic if no plan was saved.
 * Generates a draft blog post via Gemini, persists it, clears the plan,
 * and sends a notification email.
 */

import { createAiBlogPost } from "~/server/utils/generateBlog";
import { hasAiProvider } from "~/server/utils/ai";
import {
  firestoreRequest,
  fromFirestoreFields,
  toFirestoreFields,
} from "~/server/utils/firebaseAdmin";
import { log } from "~/server/utils/logger";
import { notifyAdmin } from "~/server/utils/notify";

// ── Default fallback topics (rotates by week-of-year) ────────────────────────

const DEFAULT_TOPICS = [
  "Why every local business in Kankakee County needs a professional website in 2025",
  "How to tell if your current website is hurting your business",
  "What to look for when hiring a web designer for your small business",
  'The real cost of a "free" website builder for your local business',
  "How fast-loading websites win more customers for local service businesses",
  "Why your Google Business Profile and website need to work together",
  "What questions to ask before signing a web design contract",
  "How a blog can drive new customers to your local business",
  "Mobile-first websites: why it matters more than ever for local businesses",
  "The difference between a website template and a custom-built site",
  "How ILYTAT helped a Kankakee County business grow their online presence",
  "Common website mistakes local businesses make — and how to fix them",
];

function defaultTopic(): string {
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return DEFAULT_TOPICS[week % DEFAULT_TOPICS.length]!;
}

// ── Auth guard ────────────────────────────────────────────────────────────────

function isAuthorised(
  event: Parameters<typeof defineEventHandler>[0] extends (e: infer E) => unknown ? E : never,
): boolean {
  const config = useRuntimeConfig();
  const secret = config.cronSecret as string;
  if (!secret) return false;
  const vercelCron = getHeader(event, "x-vercel-cron");
  const provided = getHeader(event, "x-cron-secret");
  return vercelCron === "1" || provided === secret;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  if (!isAuthorised(event)) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const config = useRuntimeConfig(event);

  // Shared with callAI, deliberately. This check used to be a local copy that
  // predated the OpenRouter migration: it knew only about Gemini and OpenCloud,
  // demanded a base URL that has a default, and read process.env directly so it
  // could not see a NUXT_-prefixed override. With OPENROUTER_API_KEY set it
  // reported "no provider", skipped the week, and returned 200.
  if (!hasAiProvider(event)) {
    // `error`, not `critical`: critical auto-emails a generic alert, and the
    // specific one below carries the actual fix. One useful email beats two.
    await log("error", "cron", "weekly-blog skipped: no AI provider configured");
    // Skipping used to be silent — a warning in a log nobody reads, and an
    // HTTP 200. From the outside that is indistinguishable from success, so a
    // missed post could only be noticed by its absence, weeks later.
    await notifyAdmin({
      level: "error",
      subject: "Weekly blog skipped — no AI provider configured",
      title: "This week's post was not generated",
      lines: [
        "The weekly job ran but found no usable AI key, so nothing was written.",
        "Set OPENROUTER_API_KEY (or GEMINI_API_KEY) in Vercel, then trigger the job manually to catch up this week.",
      ],
      action: { label: "Open admin", url: `${config.public.siteUrl}/admin` },
    });
    return { skipped: true, reason: "No AI provider configured" };
  }

  // ── Read saved plan ─────────────────────────────────────────────────────────
  let focalPoint = defaultTopic();
  let additionalNotes = "";

  try {
    const planDoc = await firestoreRequest("GET", "adminConfig/blog-plan");
    const plan = fromFirestoreFields(planDoc.fields || {});
    if (plan.focalPoint && String(plan.focalPoint).trim()) {
      focalPoint = String(plan.focalPoint).trim();
      additionalNotes = String(plan.additionalNotes ?? "").trim();
    }
  } catch {
    // No plan saved yet — use the default topic
  }

  // ── Generate & save ─────────────────────────────────────────────────────────
  let result: { id: string; title: string; slug: string };

  try {
    result = await createAiBlogPost({
      focalPoint,
      additionalNotes,
      status: "draft",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await log("error", "cron", `weekly-blog generation failed: ${msg}`);
    await notifyAdmin({
      level: "error",
      subject: "Weekly blog generation failed",
      title: "This week's post was not generated",
      lines: [
        `Focal point: "${focalPoint}"`,
        "Nothing was published. The provider error is below — billing and quota are the usual causes.",
      ],
      detail: msg,
      action: { label: "Open admin", url: `${config.public.siteUrl}/admin` },
    });
    throw createError({ statusCode: 500, statusMessage: msg });
  }

  // ── Roll the plan forward ───────────────────────────────────────────────────
  // The generation that just ran also proposed next week's topic. Writing it
  // back means the schedule keeps itself going; the previous behaviour blanked
  // the plan, so the next run fell back to the rotating default list and the
  // suggestion was discarded.
  const now = new Date().toISOString();
  firestoreRequest("PATCH", "adminConfig/blog-plan", {
    fields: toFirestoreFields({
      focalPoint: result.nextFocalPoint ?? "",
      additionalNotes: "",
      weekOf: "",
      updatedAt: now,
    }),
  }).catch(() => {
    /* non-fatal */
  });

  // ── Email notification ──────────────────────────────────────────────────────
  await notifyAdmin({
    level: "success",
    subject: `New AI draft ready: "${result.title}"`,
    title: result.title,
    lines: [
      "Your weekly post has been saved as a draft — review it before it goes live.",
      `Focal point used: "${focalPoint}"`,
      result.nextFocalPoint
        ? `Next week's plan is now: "${result.nextFocalPoint}"`
        : "No follow-up topic was suggested, so next week will use the default rotation.",
    ],
    action: { label: "Review and publish", url: `${config.public.siteUrl}/admin` },
  });

  await log("info", "cron", `weekly-blog generated: "${result.title}" (${result.id})`);

  return { success: true, id: result.id, title: result.title, slug: result.slug };
});
