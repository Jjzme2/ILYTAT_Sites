<script setup lang="ts">
// Onboarding page — redirected here natively by Stripe upon checkout success.

useHead({
  title: 'Onboarding Questionnaire — ILYTAT',
  meta: [
    { name: 'robots', content: 'noindex,nofollow' }
  ]
})

const route = useRoute()
const sessionId = route.query.session_id as string

const { track } = useAnalytics()
onMounted(() => {
  // Fire once — confirms the customer completed checkout and landed here
  track('checkout_success', { stripeSessionId: sessionId || '' })
})

useReveal()

// The link to the Tally.so or Fillout form goes here. 
// You can pass the session_id to the form via URL parameters 
// so you can link the finalized assets to the correct Stripe order.
const formUrl = `https://tally.so/r/YOUR_FORM_ID?session_id=${sessionId || ''}`

// ── Developer Instructions ──────────────────────────────────────────────────
// To use Tally.so or Fillout for Single-Point Asset Collection:
// 1. Create a free form asking for Business Name, Competitors, Colors, etc.
// 2. Add an "Upload File" block for logos, menus, or photos.
// 3. Connect the form integration to Google Drive to route files neatly to your workspace.
// 4. Copy the embed URL from the form builder and paste it in `formUrl` above.
</script>

<template>
  <div class="min-h-screen bg-[#0f0f11] text-[#f0ece6] font-sans">
    <div class="grain" aria-hidden="true" />
    
    <!-- Header -->
    <header class="py-8 px-6 border-b border-[#1e1e26] bg-[rgba(20,20,23,0.9)] sticky top-0 z-50 backdrop-blur-md">
      <div class="max-w-[1080px] mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <img src="https://media.ilytat.com/logo.png" alt="ILYTAT" class="h-6 w-auto opacity-50">
          <span class="text-[#f5c518] opacity-30">/</span>
          <span class="font-mono text-[11px] tracking-[1.5px] uppercase text-[#f5c518] font-bold">Onboarding</span>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-[800px] mx-auto px-6 py-16 relative z-10">
      <div class="mb-12 text-center" data-reveal>
        <div class="w-16 h-16 rounded-full border border-[rgba(245,197,24,0.35)] bg-[rgba(245,197,24,0.08)] flex items-center justify-center text-[#f5c518] mb-6 mx-auto shadow-[0_0_24px_rgba(245,197,24,0.1)]">
          <UIcon name="i-heroicons-check" class="w-7 h-7" />
        </div>
        <h1 class="font-display text-[clamp(28px,4vw,40px)] font-bold tracking-[-1px] text-[#f0ece6] mb-3 leading-[1.1]">
          Payment successful.<br>Let's get started.
        </h1>
        <p class="text-[16px] text-[#8e8ba0] max-w-[500px] mx-auto leading-[1.75]">
          Please answer a few quick questions and drop in your logo / photos below. 
          Everything you provide goes straight to our workspace so we can hit the ground running.
        </p>
      </div>

      <!-- Secure Form Embed Wrapper -->
      <div 
        class="bg-white/[0.02] border border-white/[0.08] rounded-[16px] overflow-hidden min-h-[600px] shadow-[0_12px_40px_rgba(0,0,0,0.4)] relative"
        data-reveal
        data-reveal-delay="100"
      >
        <iframe 
          title="Onboarding Form"
          :src="formUrl" 
          width="100%" 
          height="100%" 
          frameborder="0" 
          marginheight="0" 
          marginwidth="0"
          style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
        >
          Loading form...
        </iframe>
      </div>
      
      <p class="text-center text-[13px] text-[#68667a] mt-8" data-reveal data-reveal-delay="200">
        Takes about 5 minutes. Form auto-saves your progress.
      </p>
    </main>
  </div>
</template>

<style scoped>
/* Scoped overrides if needed */
</style>
