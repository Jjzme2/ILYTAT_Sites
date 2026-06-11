<script setup lang="ts">
import { ref, computed } from 'vue'

// ─── Question config ──────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    key:     'businessType',
    label:   'What type of business do you run?',
    type:    'radio' as const,
    options: ['Restaurant/Food', 'Service Business', 'Retail/Shop', 'Health/Wellness', 'Other'],
  },
  {
    key:     'websiteSituation',
    label:   "What's your current website situation?",
    type:    'radio' as const,
    options: ['No website', 'Outdated site', 'Have one but need a refresh'],
  },
  {
    key:     'features',
    label:   'What features do you need?',
    type:    'multiselect' as const,
    options: ['Online booking', 'Menu/catalog', 'Contact form', 'Photo gallery', 'E-commerce'],
  },
  {
    key:     'timeline',
    label:   'When do you need this done?',
    type:    'radio' as const,
    options: ['ASAP', 'Within 1 month', '1–3 months', 'Just exploring'],
  },
  {
    key:     'budget',
    label:   "What's your approximate budget?",
    type:    'radio' as const,
    options: ['Under $500', '$500–$1,000', '$1,000–$1,500', 'Not sure yet'],
  },
] as const

type Phase = 'questions' | 'loading' | 'result' | 'submitted'
type QuoteResult = { tier: string; price: string; summary: string; addHosting: boolean; nextStep: string }

const phase       = ref<Phase>('questions')
const currentStep = ref(0)
const answers     = ref<Record<string, string | string[]>>({})
const quote       = ref<QuoteResult | null>(null)
const leadName    = ref('')
const leadEmail   = ref('')
const leadPhone   = ref('')
const error       = ref('')
const submitting  = ref(false)

const currentQuestion = computed(() => QUESTIONS[currentStep.value])

const isAnswered = computed(() => {
  const a = answers.value[currentQuestion.value.key]
  if (currentQuestion.value.type === 'multiselect') return Array.isArray(a) && a.length > 0
  return !!a
})

function isSelected(option: string): boolean {
  const a = answers.value[currentQuestion.value.key]
  return Array.isArray(a) ? a.includes(option) : a === option
}

function selectOption(option: string) {
  const key = currentQuestion.value.key
  if (currentQuestion.value.type === 'multiselect') {
    const current = (answers.value[key] as string[] | undefined) ?? []
    answers.value[key] = current.includes(option)
      ? current.filter(o => o !== option)
      : [...current, option]
  }
  else {
    answers.value[key] = option
  }
}

async function next() {
  if (!isAnswered.value) return
  if (currentStep.value < QUESTIONS.length - 1) {
    currentStep.value++
    return
  }

  // Last step complete — call AI
  phase.value = 'loading'
  error.value = ''
  try {
    quote.value = await $fetch<QuoteResult>('/api/get-quote', {
      method: 'POST',
      body: { answers: answers.value },
    })
    phase.value = 'result'
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Something went wrong. Please try again.'
    phase.value = 'questions'
  }
}

function prev() {
  if (currentStep.value > 0) currentStep.value--
}

async function submitLead() {
  if (!leadName.value.trim() || !leadEmail.value.trim() || !quote.value) return
  submitting.value = true
  error.value = ''
  try {
    await $fetch('/api/send-quote', {
      method: 'POST',
      body: {
        name:    leadName.value.trim(),
        email:   leadEmail.value.trim(),
        phone:   leadPhone.value.trim(),
        tier:    quote.value.tier,
        price:   quote.value.price,
        summary: quote.value.summary,
        answers: answers.value,
      },
    })
    phase.value = 'submitted'
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Could not submit. Please try again.'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <section id="quote" class="py-[100px] sm:py-16" style="content-visibility:auto;contain-intrinsic-block-size:auto 640px">
    <div class="max-w-[1080px] mx-auto px-12 md:px-6 sm:px-4">

      <!-- Section header -->
      <header class="mb-16 text-center" data-reveal>
        <p class="eyebrow justify-center">Instant Estimate</p>
        <h2 class="font-display text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-2px] text-[var(--theme-text)] leading-[1.05]">
          Get your custom quote in 60 seconds
        </h2>
        <p class="mt-4 text-[15px] max-w-[440px] mx-auto leading-[1.88]" style="color: var(--theme-text-body)">
          Answer 5 quick questions and our AI will recommend the right package for your business.
        </p>
      </header>

      <div class="max-w-[580px] mx-auto">

        <!-- ── Questions ─────────────────────────────────────────────────── -->
        <div v-if="phase === 'questions'" class="glass-deep rounded-sm p-8 sm:p-6" data-reveal>

          <!-- Progress dots -->
          <div class="flex items-center gap-2 mb-8">
            <div
              v-for="(_, i) in QUESTIONS"
              :key="i"
              class="h-1 flex-1 rounded-full transition-all duration-300"
              :class="i <= currentStep ? 'bg-[var(--theme-accent)]' : 'bg-white/[0.08]'"
            />
          </div>

          <p class="font-mono text-[11px] tracking-[2px] uppercase mb-3" style="color: color-mix(in srgb, var(--theme-accent) 60%, transparent)">
            Step {{ currentStep + 1 }} of {{ QUESTIONS.length }}
          </p>

          <h3 class="font-display text-[clamp(18px,2.2vw,24px)] font-bold text-[var(--theme-text)] tracking-[-0.5px] mb-6">
            {{ currentQuestion.label }}
          </h3>

          <p v-if="currentQuestion.type === 'multiselect'" class="text-[12px] mb-4" style="color: var(--theme-text-body)">
            Select all that apply
          </p>

          <!-- Option buttons -->
          <div class="flex flex-col gap-2.5">
            <button
              v-for="option in currentQuestion.options"
              :key="option"
              type="button"
              class="w-full text-left px-4 py-3.5 rounded-sm border text-[14px] font-medium transition-all duration-200"
              :class="isSelected(option)
                ? 'border-[var(--theme-accent)] text-[var(--theme-text)]'
                : 'border-white/[0.08] bg-white/[0.02] text-[var(--theme-text-body)] hover:border-white/[0.18] hover:bg-white/[0.04]'"
              :style="isSelected(option) ? 'background: color-mix(in srgb, var(--theme-accent) 9%, transparent)' : ''"
              @click="selectOption(option)"
            >
              <span class="flex items-center gap-3">
                <!-- Circle for radio, square for multiselect -->
                <span
                  class="flex-shrink-0 flex items-center justify-center transition-all duration-200"
                  :class="[
                    currentQuestion.type === 'multiselect' ? 'w-4 h-4 rounded-[3px]' : 'w-4 h-4 rounded-full',
                    isSelected(option)
                      ? 'bg-[var(--theme-accent)] border-[var(--theme-accent)]'
                      : 'border border-white/[0.25]',
                  ]"
                >
                  <span v-if="isSelected(option)" class="w-1.5 h-1.5 rounded-full bg-black" />
                </span>
                {{ option }}
              </span>
            </button>
          </div>

          <p v-if="error" class="mt-4 text-[13px] text-red-400">{{ error }}</p>

          <!-- Nav -->
          <div class="flex items-center justify-between mt-8">
            <button
              v-if="currentStep > 0"
              type="button"
              class="btn-ghost text-[13px]"
              @click="prev"
            >
              ← Back
            </button>
            <div v-else />
            <button
              type="button"
              class="btn-primary"
              :disabled="!isAnswered"
              @click="next"
            >
              {{ currentStep < QUESTIONS.length - 1 ? 'Next →' : 'Get My Quote →' }}
            </button>
          </div>
        </div>

        <!-- ── Loading ───────────────────────────────────────────────────── -->
        <div v-else-if="phase === 'loading'" class="glass-deep rounded-sm p-12 text-center" data-reveal>
          <div class="w-10 h-10 border-2 border-[var(--theme-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p class="font-display text-[20px] font-bold text-[var(--theme-text)] mb-2 tracking-[-0.3px]">
            Analyzing your needs…
          </p>
          <p class="text-[14px]" style="color: var(--theme-text-body)">
            Building your personalized recommendation
          </p>
        </div>

        <!-- ── Result + Lead form ────────────────────────────────────────── -->
        <div v-else-if="phase === 'result' && quote" class="flex flex-col gap-5" data-reveal>

          <!-- Quote result card -->
          <div
            class="glass-deep rounded-sm p-7 sm:p-5"
            style="border-color: color-mix(in srgb, var(--theme-accent) 22%, transparent)"
          >
            <div class="flex items-start justify-between gap-4 mb-5">
              <div>
                <p class="font-mono text-[10px] tracking-[2px] uppercase mb-1" style="color: color-mix(in srgb, var(--theme-accent) 60%, transparent)">
                  Recommended Package
                </p>
                <h3 class="font-display text-[clamp(22px,3vw,32px)] font-extrabold tracking-[-1px] text-[var(--theme-text)]">
                  {{ quote.tier }}
                </h3>
              </div>
              <div class="text-right flex-shrink-0">
                <p class="font-display text-[clamp(20px,2.8vw,28px)] font-extrabold text-[var(--theme-accent)] tracking-[-0.5px]">
                  {{ quote.price }}
                </p>
                <p class="text-[11px]" style="color: var(--theme-text-body)">one-time build</p>
              </div>
            </div>

            <p class="text-[14px] leading-[1.85]" style="color: var(--theme-text-body)">
              {{ quote.summary }}
            </p>

            <!-- Hosting upsell — shown only when AI recommends it -->
            <div
              v-if="quote.addHosting"
              class="mt-4 px-4 py-3 rounded-sm flex items-start gap-3"
              style="background: color-mix(in srgb, var(--theme-accent) 7%, transparent); border: 1px solid color-mix(in srgb, var(--theme-accent) 18%, transparent)"
            >
              <UIcon name="i-heroicons-sparkles" class="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--theme-accent)]" />
              <p class="text-[13px]" style="color: var(--theme-text-body)">
                <span class="text-[var(--theme-text)] font-medium">Add managed hosting for $89/mo</span> — JJ keeps your site fast, secure, and updated. No tech headaches.
              </p>
            </div>

            <p class="mt-5 text-[13px] font-medium text-[var(--theme-text)] leading-[1.7]">
              {{ quote.nextStep }}
            </p>
          </div>

          <!-- Lead capture form -->
          <div class="glass-deep rounded-sm p-7 sm:p-5">
            <h4 class="font-display text-[17px] font-bold text-[var(--theme-text)] tracking-[-0.3px] mb-1">
              Lock in this quote
            </h4>
            <p class="text-[13px] mb-5" style="color: var(--theme-text-body)">
              JJ will reach out within 1 business day to walk you through next steps.
            </p>

            <div class="flex flex-col gap-3">
              <input
                v-model="leadName"
                type="text"
                placeholder="Your name *"
                autocomplete="name"
                class="w-full px-4 py-3 rounded-sm text-[14px] transition-colors focus:outline-none"
                style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: var(--theme-text);"
                @focus="($event.target as HTMLElement).style.borderColor = 'color-mix(in srgb, var(--theme-accent) 50%, transparent)'"
                @blur="($event.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'"
              />
              <input
                v-model="leadEmail"
                type="email"
                placeholder="Email address *"
                autocomplete="email"
                class="w-full px-4 py-3 rounded-sm text-[14px] transition-colors focus:outline-none"
                style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: var(--theme-text);"
                @focus="($event.target as HTMLElement).style.borderColor = 'color-mix(in srgb, var(--theme-accent) 50%, transparent)'"
                @blur="($event.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'"
              />
              <input
                v-model="leadPhone"
                type="tel"
                placeholder="Phone (optional)"
                autocomplete="tel"
                class="w-full px-4 py-3 rounded-sm text-[14px] transition-colors focus:outline-none"
                style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: var(--theme-text);"
                @focus="($event.target as HTMLElement).style.borderColor = 'color-mix(in srgb, var(--theme-accent) 50%, transparent)'"
                @blur="($event.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'"
              />
            </div>

            <p v-if="error" class="mt-3 text-[13px] text-red-400">{{ error }}</p>

            <button
              type="button"
              class="btn-primary w-full mt-5 flex items-center justify-center"
              :disabled="!leadName.trim() || !leadEmail.trim() || submitting"
              @click="submitLead"
            >
              <span v-if="submitting">Sending…</span>
              <span v-else>Send My Quote</span>
            </button>
          </div>
        </div>

        <!-- ── Thank you ─────────────────────────────────────────────────── -->
        <div v-else-if="phase === 'submitted'" class="glass-deep rounded-sm p-12 text-center" data-reveal>
          <div
            class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6"
            style="background: color-mix(in srgb, var(--theme-accent) 12%, transparent); border: 1px solid color-mix(in srgb, var(--theme-accent) 30%, transparent)"
          >
            <UIcon name="i-heroicons-check" class="w-7 h-7 text-[var(--theme-accent)]" />
          </div>
          <h3 class="font-display text-[clamp(20px,2.5vw,28px)] font-bold text-[var(--theme-text)] tracking-[-0.5px] mb-3">
            Got it, {{ leadName }}!
          </h3>
          <p class="text-[15px] leading-[1.88] max-w-[360px] mx-auto" style="color: var(--theme-text-body)">
            JJ will reach out within 1 business day to discuss your
            <span class="text-[var(--theme-text)] font-medium">{{ quote?.tier }}</span> package.
          </p>
        </div>

      </div>
    </div>
  </section>
</template>
