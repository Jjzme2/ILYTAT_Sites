<script setup lang="ts">
// ============================================================================
// SiteFortuneOrb.vue
//
// Interactive yin-yang logo displayed in the hero's right column.
// State machine: idle → spinning → revealed.
//
// On mount: checks localStorage for today's cached fortune. If present,
// jumps straight to "revealed". This prevents an extra network call on
// page refresh and keeps the experience consistent across the day.
//
// On click (idle): spins the orb 720° with a glow burst (1.4s), concurrently
// fetches /api/fortune (or reads cache), then transitions to "revealed".
//
// Fortune is deterministic per IP per calendar day — same visitor sees the
// same fortune all day, different fortune tomorrow. No AI, no database.
// ============================================================================

import { ref, onMounted } from 'vue'

// ── Types ──────────────────────────────────────────────────────────────────
type OrbState = 'idle' | 'spinning' | 'revealed'

interface CachedFortune {
  date: string
  fortune: string
}

// ── Constants ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'ilytat-fortune'
const SPIN_DURATION_MS = 1_400

// ── State ──────────────────────────────────────────────────────────────────
const orbState   = ref<OrbState>('idle')
const fortuneText = ref('')

// ── Helpers ────────────────────────────────────────────────────────────────
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function readCache(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const cached: CachedFortune = JSON.parse(raw)
    return cached.date === today() ? cached.fortune : null
  }
  catch {
    return null
  }
}

function writeCache(fortune: string): void {
  try {
    const payload: CachedFortune = { date: today(), fortune }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }
  catch { /* storage full or private browsing — silently skip */ }
}

async function fetchFortune(): Promise<string> {
  const data = await $fetch<{ fortune: string; date: string }>('/api/fortune')
  return data.fortune
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => {
  const cached = readCache()
  if (cached) {
    fortuneText.value = cached
    orbState.value = 'revealed'
  }
})

// ── Interactions ───────────────────────────────────────────────────────────
async function castFortune(): Promise<void> {
  if (orbState.value !== 'idle') return

  orbState.value = 'spinning'

  // Run animation and fetch in parallel; wait for both
  const [, result] = await Promise.allSettled([
    new Promise<void>(resolve => setTimeout(resolve, SPIN_DURATION_MS)),
    fetchFortune(),
  ])

  const fortune = result.status === 'fulfilled'
    ? result.value
    : 'Every challenge is a seed of opportunity.'

  writeCache(fortune)
  fortuneText.value = fortune
  orbState.value = 'revealed'
}

function reset(): void {
  orbState.value = 'idle'
  fortuneText.value = ''
  localStorage.removeItem(STORAGE_KEY)
}
</script>

<template>
  <div class="orb-root" :aria-label="orbState === 'idle' ? 'Touch for fortune' : 'Your daily fortune'">

    <!-- ── SVG Yin-Yang ──────────────────────────────────────────────────── -->
    <button
      class="orb-btn"
      :class="{ 'is-spinning': orbState === 'spinning', 'is-revealed': orbState === 'revealed' }"
      :aria-label="orbState === 'idle' ? 'Cast your fortune' : undefined"
      :disabled="orbState === 'spinning'"
      @click="castFortune">

      <svg
        viewBox="0 0 200 200"
        class="orb-svg"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true">

        <!-- Outer ambient glow ring -->
        <circle class="orb-glow-ring" cx="100" cy="100" r="96" />

        <!-- Yang half (top) — accent-tinted surface -->
        <path
          class="yang-fill"
          d="M100,4
             A96,96,0,0,1,100,196
             A48,48,0,0,1,100,100
             A48,48,0,0,0,100,4Z" />

        <!-- Yin half (bottom) — deep background -->
        <path
          class="yin-fill"
          d="M100,196
             A96,96,0,0,1,100,4
             A48,48,0,0,0,100,100
             A48,48,0,0,1,100,196Z" />

        <!-- Small yang dot (inside yin half) -->
        <circle class="yang-dot" cx="100" cy="148" r="12" />

        <!-- Small yin dot (inside yang half) -->
        <circle class="yin-dot" cx="100" cy="52" r="12" />

        <!-- Outer border ring -->
        <circle class="orb-border" cx="100" cy="100" r="96" />
      </svg>

      <!-- ── Idle label ─────────────────────────────────────────────────── -->
      <Transition name="fade-label">
        <span v-if="orbState === 'idle'" class="orb-label" aria-hidden="true">
          Touch for fortune
        </span>
      </Transition>

      <!-- ── Center pulse dot (idle) ───────────────────────────────────── -->
      <span
        v-if="orbState === 'idle'"
        class="orb-pulse"
        aria-hidden="true" />
    </button>

    <!-- ── Fortune reveal overlay ────────────────────────────────────────── -->
    <Transition name="fortune-reveal">
      <div
        v-if="orbState === 'revealed'"
        class="fortune-overlay glass-deep"
        role="status"
        :aria-live="orbState === 'revealed' ? 'polite' : 'off'">

        <p class="fortune-eyebrow">Your fortune for today</p>
        <p class="fortune-text">"{{ fortuneText }}"</p>

        <button class="fortune-reset" @click.stop="reset" aria-label="Reset fortune">
          <span class="font-mono text-[9px] tracking-[2.5px] uppercase" style="color: var(--theme-text-ghost)">
            Tomorrow brings a new one ↺
          </span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ── Layout ─────────────────────────────────────────────────────────────── */
.orb-root {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 320px;
  height: 320px;
}

.orb-btn {
  position: relative;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: transparent;
  border: none;
  cursor: pointer;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: filter 0.4s ease;
}

.orb-btn:focus-visible {
  box-shadow: 0 0 0 3px var(--focus-ring, rgba(245,197,24,0.55));
}

.orb-btn:hover:not(:disabled):not(.is-spinning):not(.is-revealed) {
  filter: drop-shadow(0 0 32px color-mix(in srgb, var(--theme-accent) 30%, transparent));
}

.orb-btn:disabled {
  cursor: default;
}

.orb-svg {
  width: 100%;
  height: 100%;
  animation: orb-ambient 24s linear infinite;
  transition: filter 0.3s ease;
}

.is-spinning .orb-svg {
  animation: orb-cast 1.4s cubic-bezier(0.22, 1, 0.36, 1) both;
  filter: drop-shadow(0 0 48px color-mix(in srgb, var(--theme-accent) 60%, transparent));
}

.is-revealed .orb-svg {
  animation: orb-ambient 24s linear infinite;
  opacity: 0.32;
  filter: blur(1.5px);
}

/* ── SVG fills ───────────────────────────────────────────────────────────── */
.yang-fill {
  fill: color-mix(in srgb, var(--theme-accent) 22%, var(--theme-surface, #141210));
}

.yin-fill {
  fill: var(--theme-bg, #0d0b09);
}

.yang-dot {
  fill: color-mix(in srgb, var(--theme-accent) 55%, transparent);
}

.yin-dot {
  fill: var(--theme-bg, #0d0b09);
}

.orb-border {
  fill: none;
  stroke: color-mix(in srgb, var(--theme-accent) 18%, transparent);
  stroke-width: 1;
}

.orb-glow-ring {
  fill: none;
  stroke: color-mix(in srgb, var(--theme-accent) 6%, transparent);
  stroke-width: 6;
}

/* ── Idle label ─────────────────────────────────────────────────────────── */
.orb-label {
  position: absolute;
  bottom: -36px;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--font-mono, ui-monospace);
  font-size: 9px;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: var(--theme-text-ghost, #2e2a26);
  white-space: nowrap;
  pointer-events: none;
}

/* ── Pulse dot ──────────────────────────────────────────────────────────── */
.orb-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--theme-accent) 70%, transparent);
  animation: pulse-dot 2.4s ease-in-out infinite;
  pointer-events: none;
}

/* ── Fortune overlay ────────────────────────────────────────────────────── */
.fortune-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 36px 28px 28px;
  gap: 12px;
  cursor: default;
  overflow: hidden;
}

.fortune-eyebrow {
  font-family: var(--font-mono, ui-monospace);
  font-size: 8px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--theme-text-ghost, #2e2a26);
  margin: 0;
}

.fortune-text {
  font-family: var(--font-headline, Georgia, serif);
  font-style: italic;
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--theme-text, #f0ece6);
  margin: 0;
}

.fortune-reset {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 0;
  margin-top: 4px;
  opacity: 0.45;
  transition: opacity 0.2s ease;
}

.fortune-reset:hover {
  opacity: 0.85;
}

/* ── Keyframes ───────────────────────────────────────────────────────────── */
@keyframes orb-ambient {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes orb-cast {
  0%   { transform: rotate(0deg);    filter: drop-shadow(0 0 8px  color-mix(in srgb, var(--theme-accent) 20%, transparent)); }
  40%  { transform: rotate(540deg);  filter: drop-shadow(0 0 64px color-mix(in srgb, var(--theme-accent) 80%, transparent)); }
  100% { transform: rotate(720deg);  filter: drop-shadow(0 0 16px color-mix(in srgb, var(--theme-accent) 25%, transparent)); }
}

@keyframes pulse-dot {
  0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1);    }
  50%       { opacity: 1;   transform: translate(-50%, -50%) scale(1.6);  }
}

/* ── Transitions ─────────────────────────────────────────────────────────── */
.fade-label-enter-active,
.fade-label-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-label-enter-from,
.fade-label-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(6px);
}

.fortune-reveal-enter-active {
  transition: opacity 0.55s ease, transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fortune-reveal-leave-active {
  transition: opacity 0.3s ease;
}
.fortune-reveal-enter-from {
  opacity: 0;
  transform: scale(0.84);
}
.fortune-reveal-leave-to {
  opacity: 0;
}

/* ── Mobile sizing ───────────────────────────────────────────────────────── */
@media (max-width: 1023px) {
  .orb-root        { width: 220px; height: 220px; }
  .orb-btn         { width: 168px; height: 168px; }
  .fortune-overlay { padding: 22px 18px 16px; gap: 8px; }
  .fortune-text    { font-size: 11px; line-height: 1.65; }
  .orb-label       { font-size: 8px; letter-spacing: 2px; bottom: -28px; }
}
</style>
