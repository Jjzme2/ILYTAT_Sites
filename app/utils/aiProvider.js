// ─── Config ───────────────────────────────────────────────────────────────────
// Server-side only — this module uses process.env directly.
// Never call generateQuote() from component code; use /api/get-quote instead.
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

const providers = {
  gemini: {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    key: process.env.GEMINI_API_KEY,
  },
  opencloud: {
    url: (process.env.OPENCLOUD_BASE_URL ?? "") + "/v1/chat/completions",
    key: process.env.OPENCLOUD_API_KEY,
    // Required by all OpenAI-compatible APIs — set OPENCLOUD_MODEL in your env
    model: process.env.OPENCLOUD_MODEL ?? "gpt-4o-mini",
  },
};

// ─── Startup config checks ────────────────────────────────────────────────────
if (!providers.gemini.key) {
  console.warn("[aiProvider] GEMINI_API_KEY is not set — primary provider disabled.");
}
{
  const missing = [
    !process.env.OPENCLOUD_BASE_URL && "OPENCLOUD_BASE_URL",
    !providers.opencloud.key        && "OPENCLOUD_API_KEY",
  ].filter(Boolean);
  if (missing.length) {
    console.warn(
      `[aiProvider] OpenRouter fallback disabled — missing env var(s): ${missing.join(", ")}. ` +
      "Add them in Vercel → Project Settings → Environment Variables.",
    );
  }
}

const SYSTEM_PROMPT =
  'You are a quote assistant for ILYTAT LLC, a web design company in Manteno, IL. We have 3 tiers: Starter ($499 — single-page site, basic contact/lead form, 1-week delivery), Pro ($999 — up to 5 pages, full SEO + Google Business setup, quote & contact forms, 2-week delivery), Premium ($2,999 — custom admin dashboard, user auth, database, third-party API integrations, 3–5 week delivery). All are one-time builds. We also offer $89/month managed hosting. Respond ONLY in JSON: { "tier": "Starter|Pro|Premium", "price": "$499|$999|$2,999", "summary": "2-sentence plain-english summary of what they get", "addHosting": true|false, "nextStep": "one clear CTA sentence", "message": "A warm 1-2 sentence message spoken directly to this business owner that references their specific business type and situation — make it feel personal, not generic", "rationale": ["2 to 4 short bullet strings. Each bullet must explain a specific reason this tier fits their answers OR why the next-lower tier would fall short — reference their actual answers (business type, features needed, budget, timeline). Be concrete, not generic."] }';

function formatAnswers(answers) {
  return Object.entries(answers)
    .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
    .join("\n");
}

async function callGemini(userMessage) {
  const res = await fetch(`${providers.gemini.url}?key=${providers.gemini.key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${body}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const reason = data.candidates?.[0]?.finishReason ?? "unknown";
    throw new Error(`Gemini empty response (finishReason: ${reason})`);
  }
  return text;
}

async function callOpenCloud(userMessage) {
  const res = await fetch(providers.opencloud.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${providers.opencloud.key}`,
      // OpenRouter requires HTTP-Referer to identify the calling app
      "HTTP-Referer": "https://ilytat.com",
      "X-Title": "ILYTAT LLC",
    },
    signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({
      model: providers.opencloud.model,
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
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenCloud returned empty response");
  return text;
}

/**
 * Generate a quote recommendation from the wizard answers.
 * Tries Gemini first; falls back to OpenCloud silently on any error or timeout.
 *
 * @param {Record<string, string | string[]>} answers
 * @returns {Promise<string>} Raw JSON string from the AI
 */
export async function generateQuote(answers) {
  const userMessage = `Here are the answers:\n${formatAnswers(answers)}`;

  if (providers.gemini.key) {
    try {
      return await callGemini(userMessage);
    } catch (e) {
      console.warn("[aiProvider] Gemini failed, trying OpenCloud:", e.message);
    }
  }

  if (providers.opencloud.key && process.env.OPENCLOUD_BASE_URL) {
    return await callOpenCloud(userMessage);
  }

  const missing = [
    !process.env.OPENCLOUD_BASE_URL && "OPENCLOUD_BASE_URL",
    !providers.opencloud.key        && "OPENCLOUD_API_KEY",
  ].filter(Boolean);
  if (missing.length) {
    console.error(
      `[aiProvider] No fallback available — Gemini failed and OpenRouter is not configured. ` +
      `Missing: ${missing.join(", ")}`,
    );
  }
  throw new Error("No AI provider configured or available. Please try again.");
}
