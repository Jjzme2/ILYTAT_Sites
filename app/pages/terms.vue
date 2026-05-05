<script setup lang="ts">
definePageMeta({ layout: false })

useHead({
  title: 'Terms of Service — ILYTAT LLC',
  meta: [
    { name: 'description', content: 'Terms of service for ILYTAT LLC web design and hosting services.' },
  ],
})
</script>

<template>
  <div class="terms-page">
    <nav class="terms-nav">
      <a href="/" class="logo">ILYTAT<span>.com</span></a>
    </nav>

    <main class="terms-body">
      <h1>Terms of Service</h1>
      <p class="updated">Last updated: May 5, 2026</p>

      <p>
        These Terms of Service ("Terms") govern your use of ilytat.com and any services provided by
        ILYTAT LLC ("ILYTAT," "we," "us," or "our"). By engaging our services or using our website,
        you agree to these Terms in full. If you disagree with any part, do not use our services.
      </p>

      <h2>1. Services</h2>
      <p>
        ILYTAT LLC provides custom website design, development, and managed hosting services for local
        businesses. The specific scope of work, deliverables, and timeline for each project are defined
        in a separate project agreement or statement of work ("SOW") provided to the client prior to
        project commencement.
      </p>

      <h2>2. Payment Terms</h2>
      <p>
        Build fees are quoted as a flat one-time price and are due as specified in your SOW — typically
        50% upfront and 50% upon project completion. Recurring hosting and maintenance fees are billed
        monthly and processed automatically through Stripe. All prices are in USD.
      </p>
      <p>
        Payments are non-refundable once a project phase has begun. If you cancel a project mid-build,
        any work completed to that point is billable at the agreed rate. Recurring hosting fees are
        non-refundable for the current billing month.
      </p>
      <p>
        Late payments (more than 14 days overdue) may result in suspension of hosted services until
        the balance is settled.
      </p>

      <h2>3. Client Responsibilities</h2>
      <p>You agree to:</p>
      <ul>
        <li>Provide accurate business information, copy, images, and other content required for your project in a timely manner</li>
        <li>Review and provide feedback on deliverables within 5 business days of submission</li>
        <li>Ensure that any content you supply does not infringe on the intellectual property, privacy, or other rights of third parties</li>
        <li>Maintain the confidentiality of any account credentials provided to you</li>
      </ul>
      <p>
        Project delays caused by late feedback or missing content from the client may result in
        timeline adjustments at ILYTAT's discretion.
      </p>

      <h2>4. Intellectual Property</h2>
      <p>
        Upon receipt of full payment for a project, you own all custom design assets, written content,
        and code produced specifically for your project. ILYTAT retains the right to display the
        completed work in its portfolio and marketing materials unless you request otherwise in writing.
      </p>
      <p>
        Third-party assets incorporated into your project (fonts, icon libraries, stock photos, open-source
        libraries) remain subject to their respective licenses. ILYTAT will identify any such assets and
        ensure they are licensed for commercial use.
      </p>
      <p>
        ILYTAT retains ownership of any internal tooling, templates, frameworks, or processes used
        during development that are not bespoke to your project.
      </p>

      <h2>5. Hosting &amp; Uptime</h2>
      <p>
        Managed hosting is provided on a best-effort basis through our infrastructure partners. We target
        99.9% uptime but do not guarantee it. Scheduled maintenance windows will be communicated in
        advance when possible. ILYTAT is not liable for downtime caused by third-party infrastructure
        providers, DNS propagation delays, or events outside our reasonable control.
      </p>

      <h2>6. Warranty Disclaimer</h2>
      <p>
        Services are provided "as is" and "as available." ILYTAT makes no warranty — express or implied —
        regarding fitness for a particular purpose, merchantability, or that the services will be
        uninterrupted or error-free. We do not guarantee specific search engine rankings or business
        outcomes resulting from the work delivered.
      </p>

      <h2>7. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, ILYTAT LLC's total liability to you for any claim
        arising out of or related to these Terms or our services shall not exceed the total fees paid
        by you to ILYTAT in the three months preceding the event giving rise to the claim.
      </p>
      <p>
        ILYTAT is not liable for any indirect, incidental, consequential, special, or punitive damages,
        including but not limited to loss of revenue, loss of data, or loss of business opportunity,
        even if advised of the possibility of such damages.
      </p>

      <h2>8. Confidentiality</h2>
      <p>
        Both parties agree to keep confidential any non-public business information shared during the
        course of a project. This obligation does not apply to information that is publicly available,
        independently developed, or required to be disclosed by law.
      </p>

      <h2>9. Termination</h2>
      <p>
        Either party may terminate the service relationship with 30 days' written notice. Upon
        termination, all outstanding balances become immediately due. ILYTAT will provide a reasonable
        transition period to help you migrate your website to another provider.
      </p>
      <p>
        ILYTAT reserves the right to terminate services immediately and without refund if a client
        uses the hosted website for illegal activity, distributes malware, or engages in conduct that
        causes harm to ILYTAT's infrastructure or reputation.
      </p>

      <h2>10. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the State of Illinois, without regard to its conflict
        of law provisions. Any disputes shall be resolved in the courts of Kankakee County, Illinois.
      </p>

      <h2>11. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. When we do, the "Last updated" date at the top
        will change. For active clients, material changes will be communicated via email. Continued
        use of our services after a change constitutes acceptance of the revised Terms.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these Terms? Reach out:<br>
        ILYTAT LLC — Manteno, IL<br>
        <a href="mailto:support@ilytat.com">Support@ilytat.com</a>
      </p>

      <div class="terms-back">
        <a href="/">← Back to home</a>
        <span class="sep">·</span>
        <a href="/privacy">Privacy Policy</a>
      </div>
    </main>
  </div>
</template>

<style scoped>
.terms-page {
  background: #0f0f11;
  color: #f0ece6;
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
}

.terms-nav {
  padding: 20px 48px;
  border-bottom: 1px solid #2a2a32;
}

@media (max-width: 640px) {
  .terms-nav  { padding: 16px 20px; }
  .terms-body { margin: 40px auto; }
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

.terms-body {
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

.terms-back {
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
