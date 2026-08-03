<script setup lang="ts">
definePageMeta({ layout: false })

useHead({
  title: 'Privacy Policy — ILYTAT LLC',
  meta: [
    { name: 'description', content: 'Privacy policy for ILYTAT LLC — how we collect, store, and use your information.' },
  ],
})
</script>

<template>
  <div class="privacy-page">
    <nav class="privacy-nav">
      <a href="/" class="logo">ILYTAT<span>.com</span></a>
    </nav>

    <main class="privacy-body">
      <h1>Privacy Policy</h1>
      <p class="updated">Last updated: May 5, 2026</p>

      <p>
        ILYTAT LLC ("we," "us," or "our") operates the website at ilytat.com. This policy explains what
        personal information we collect, how we use it, and your rights under Illinois law.
      </p>

      <h2>Information We Collect</h2>
      <p>
        When you submit the contact form, we collect your name, business name, email address, and optionally
        your phone number and a description of your project. We do not collect or store payment information.
      </p>

      <h2>How We Use Your Information</h2>
      <ul>
        <li>To respond to your inquiry within 24 hours</li>
        <li>To send a quote or project proposal</li>
        <li>To follow up on an active project</li>
      </ul>
      <p>We do not sell, rent, or share your information with third parties for marketing purposes.</p>

      <h2>Data Storage</h2>
      <p>
        Inquiry data is stored in Google Firebase Firestore, hosted in the United States. Form submission
        notifications are delivered via Resend. Both services maintain their own security and compliance
        programs.
      </p>

      <h2>Browser Storage (localStorage)</h2>
      <p>
        This site saves a small number of display preferences directly in your browser using
        <strong>localStorage</strong> — a client-side storage mechanism that never leaves your device
        and is never transmitted to our servers. The keys stored are:
      </p>
      <ul>
        <li><code>ilytat-lumen</code> — whether the ambient kintsugi light effects are on or off</li>
        <li><code>ilytat-promo-dismissed</code> — whether you have dismissed the promotional banner</li>
      </ul>
      <p>
        You can clear these at any time by clearing your browser's site data for ilytat.com.
      </p>

      <h2>Anonymous Analytics</h2>
      <p>
        To help us understand how visitors use the site and which design features people find valuable, we
        record a limited set of anonymous usage events — for example, which color theme you selected or
        whether you toggled the light effects on or off. These events are associated with a randomly
        generated session ID stored in <strong>sessionStorage</strong> (cleared when you close the tab)
        and contain no personally identifiable information.
      </p>
      <p>
        Analytics event data is stored in Google Firebase Firestore and is only accessible to
        ILYTAT LLC administrators. It is used solely to improve the site experience and is never
        shared with or sold to third parties.
      </p>

      <h2>Cookies</h2>
      <p>
        This site does not set any tracking or advertising cookies. The only cookie-like mechanism in
        use is the localStorage preference storage described above, which is not a cookie and is not
        transmitted with HTTP requests.
      </p>

      <h2>Free Tools and Artificial Intelligence</h2>
      <p>
        This site offers free tools — a website audit, a review reply writer and a local SEO
        checklist — and a quote estimator. Some of them send what you type to services operated by
        other companies. This is what happens to that text.
      </p>
      <ul>
        <li>
          <strong>Review reply writer.</strong> The review text, star rating and business name you
          enter are sent to <strong>OpenRouter</strong>, which routes the request to a language
          model provider (currently <strong>DeepSeek</strong>) to draft the replies. We do not store
          what you paste or what is generated — it exists only for the length of the request. Those
          providers process it under their own terms and may retain it briefly for abuse monitoring.
          <strong>Do not paste anything confidential.</strong>
        </li>
        <li>
          <strong>Quote estimator.</strong> Your answers are sent to the same provider to produce a
          recommendation. Treat it as an estimate, not a binding quote.
        </li>
        <li>
          <strong>Website audit.</strong> The address you enter is sent to
          <strong>Google PageSpeed Insights</strong>, which loads that page and returns performance
          scores. Only the URL leaves this site.
        </li>
        <li>
          <strong>Blog posts.</strong> Some articles are drafted with AI assistance and reviewed
          before publication. Posts written this way are credited in the byline.
        </li>
      </ul>
      <p>
        None of these tools require an account, and none of them are used to build a profile of you.
        We do not train any model on what you enter.
      </p>

      <h2>Service Providers</h2>
      <p>
        Running this site means relying on other companies. Each one only receives what it needs to
        do its job, and each processes data under its own privacy policy.
      </p>
      <ul>
        <li><strong>Vercel</strong> — hosting and delivery. Processes your IP address and request details as part of serving the site.</li>
        <li><strong>Google Firebase / Firestore</strong> — stores contact form submissions, enquiries and site content.</li>
        <li><strong>Cloudflare Turnstile</strong> — the anti-spam check on forms. Receives a token and your IP address to distinguish people from bots. It is not a tracking cookie and does not follow you across sites.</li>
        <li><strong>Resend</strong> — delivers email, including the copy of your enquiry that reaches us.</li>
        <li><strong>OpenRouter and DeepSeek</strong> — process text you enter into the AI tools, as described above.</li>
        <li><strong>Google PageSpeed Insights</strong> — receives URLs submitted to the audit tool.</li>
        <li><strong>Cloudflare R2</strong> — internal document storage. No visitor data.</li>
      </ul>
      <p>
        We do not sell your personal information, and we do not share it for cross-context
        behavioural advertising.
      </p>

      <h2>Your Rights</h2>
      <p>
        You may request to view, correct, or delete any personal information we hold about you at any time.
        Contact us at the email below.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. When we do, the "Last updated" date at the top of
        this page will change. Continued use of the site after a change constitutes acceptance of the
        revised policy.
      </p>

      <h2>Contact</h2>
      <p>
        ILYTAT LLC<br>
        Manteno, IL<br>
        <a href="mailto:support@ilytat.com">Support@ilytat.com</a>
      </p>

      <div class="privacy-back">
        <a href="/">← Back to home</a>
        <span class="sep">·</span>
        <a href="/terms">Terms of Service</a>
      </div>
    </main>
  </div>
</template>

<style scoped>
.privacy-page {
  background: #0f0f11;
  color: #f0ece6;
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
}

.privacy-nav {
  padding: 20px 48px;
  border-bottom: 1px solid #2a2a32;
}

@media (max-width: 640px) {
  .privacy-nav { padding: 16px 20px; }
  .privacy-body { margin: 40px auto; }
}

.logo {
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 1px;
  color: #f0ece6;
  text-decoration: none;
}

.logo span {
  color: #f5c518;
}

.privacy-body {
  max-width: 660px;
  margin: 64px auto;
  padding: 0 24px 80px;
  line-height: 1.8;
}

h1 {
  font-family: 'Sora', sans-serif;
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 800;
  letter-spacing: -1.5px;
  margin-bottom: 8px;
}

.updated {
  font-size: 13px;
  color: #68667a;
  margin-bottom: 40px;
}

h2 {
  font-family: 'Sora', sans-serif;
  font-size: 18px;
  font-weight: 700;
  margin-top: 40px;
  margin-bottom: 12px;
  color: #f0ece6;
}

p, li {
  color: #b8b4ae;
  font-size: 15px;
}

code {
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 1px 6px;
  border-radius: 3px;
  color: #f5c518;
}

ul {
  padding-left: 20px;
  margin-bottom: 16px;
}

li {
  margin-bottom: 6px;
}

a {
  color: #f5c518;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.privacy-back {
  margin-top: 64px;
  padding-top: 24px;
  border-top: 1px solid #2a2a32;
  font-size: 14px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.sep {
  color: #3a3840;
}
</style>
