<script setup lang="ts">
definePageMeta({ layout: false })

useHead({
  title: 'Privacy Policy — ILYTAT LLC',
  meta: [{ name: 'robots', content: 'noindex' }],
})
</script>

<template>
  <div class="privacy-page">
    <nav class="privacy-nav">
      <a href="/" class="logo">ILYTAT<span>.com</span></a>
    </nav>

    <main class="privacy-body">
      <h1>Privacy Policy</h1>
      <p class="updated">Last updated: April 1, 2026</p>

      <p>
        ILYTAT LLC ("we," "us," or "our") operates the website at ilytat.com. This policy explains what
        personal information we collect, how we use it, and your rights under Illinois law.
      </p>

      <h2>Information We Collect</h2>
      <p>
        When you submit the contact form, we collect your name, business name, email address, and optionally
        your phone number and a description of your project. We do not collect payment information directly —
        payments are processed through Stripe, which has its own privacy policy.
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

      <h2>Cookies</h2>
      <p>
        This site uses only a functional cookie to remember if you have dismissed a promotional banner.
        No tracking cookies or advertising cookies are set.
      </p>

      <h2>Your Rights</h2>
      <p>
        You may request to view, correct, or delete any personal information we hold about you at any time.
        Contact us at the email below.
      </p>

      <h2>Contact</h2>
      <p>
        ILYTAT LLC<br>
        Manteno, IL<br>
        <a href="mailto:support@ilytat.com">Support@ilytat.com</a>
      </p>

      <div class="privacy-back">
        <a href="/">← Back to home</a>
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

p,
li {
  color: #b8b4ae;
  font-size: 15px;
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
}
</style>
