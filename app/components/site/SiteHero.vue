<script setup lang="ts">
import { ref } from 'vue'
import { siteConfig } from '~/config/site.config'

const { track } = useAnalytics()
const { monthlyRate, heroImage, heroStats } = siteConfig

const heroRef  = ref<HTMLElement | null>(null)
const blob1Ref = ref<HTMLElement | null>(null)
const blob2Ref = ref<HTMLElement | null>(null)

onMounted(() => {
  const hero = heroRef.value
  if (!hero) return

  // Blobs are hidden via CSS on mobile — skip the RAF loop entirely to avoid
  // burning CPU writing inline styles to display:none elements.
  if (window.matchMedia('(max-width: 768px)').matches) return

  let raf: number | null = null
  let sy = window.scrollY
  let mx = 0, my = 0, inside = false

  function apply() {
    raf = null
    const cmx = inside ? mx : 0
    const cmy = inside ? my : 0
    blob1Ref.value!.style.translate = `${(cmx - 540) *  0.012}px ${(-sy * 0.08) + (cmy - 360) *  0.009}px`
    blob2Ref.value!.style.translate = `${(cmx - 540) * -0.007}px ${(-sy * 0.05) + (cmy - 360) *  0.005}px`
  }

  function schedule() { if (raf === null) raf = requestAnimationFrame(apply) }

  const onScroll    = () => { sy = window.scrollY; schedule() }
  const onMove      = (e: PointerEvent) => { mx = e.clientX; my = e.clientY; inside = true; schedule() }
  const onLeave     = () => { inside = false; schedule() }

  window.addEventListener('scroll', onScroll, { passive: true })
  hero.addEventListener('pointermove', onMove as EventListener, { passive: true })
  hero.addEventListener('pointerleave', onLeave, { passive: true })

  apply()

  onUnmounted(() => {
    if (raf !== null) cancelAnimationFrame(raf)
    window.removeEventListener('scroll', onScroll)
    hero.removeEventListener('pointermove', onMove as EventListener)
    hero.removeEventListener('pointerleave', onLeave)
  })
})
</script>

<template>
  <section
    ref="heroRef"
    class="relative min-h-[calc(100svh-var(--nav-h))] flex flex-col justify-center px-4 md:px-6 lg:px-12 pt-16 md:pt-20 pb-20 md:pb-24 overflow-hidden">

    <!-- Ambient blobs. Cut from four to two: blob-4 was `transparent` in the
         only live theme yet still had its inline transform rewritten by the
         RAF loop on every frame, and four overlapping 100px+ blurs is a lot of
         compositing for an effect nobody can name. -->
    <div ref="blob1Ref" class="hero-blob hero-blob-1" aria-hidden="true" />
    <div ref="blob2Ref" class="hero-blob hero-blob-2" aria-hidden="true" />

    <div class="relative z-[2] max-w-[1200px] mx-auto w-full flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10 lg:gap-16">

      <!-- ── Left column: copy ───────────────────────────────────────────── -->
      <div class="lg:flex-1 lg:min-w-0 lg:max-w-[580px]">

        <!-- Eyebrow chip — uses crack-inner shape -->
        <div
          class="inline-flex items-center gap-2.5 px-4 py-2 mb-10 rounded-[var(--radius-sm)] border border-[var(--theme-accent)]/[0.14] bg-[var(--theme-accent)]/[0.04] backdrop-blur-md [animation:fade-up_0.8s_ease_both]">
          <span class="w-1.5 h-1.5 bg-[var(--theme-accent)]" style="box-shadow: 0 0 8px var(--theme-accent)" aria-hidden="true" />
          <span class="font-mono text-[9px] tracking-[3px] uppercase text-(--theme-text-muted)">Based in Manteno · Serving Kankakee County</span>
        </div>

        <!-- One typeface, two weights, one size, one tracking. The old H1 used
             three faces (Sora 800, Sora 300, Playfair italic) at three sizes
             that did not match each other, with an animated gradient shimmer
             on the LCP element. -->
        <h1
          class="mb-8 font-display text-[clamp(40px,6.4vw,76px)] font-extrabold tracking-[-0.035em] leading-[1.02] text-(--theme-fg) [animation:fade-up_0.8s_0.1s_ease_both]">
          Agency-grade websites for
          <span class="text-(--theme-accent)">local business.</span>
        </h1>

        <p class="text-[17px] md:text-[18px] text-(--theme-text-body) max-w-[520px] mb-10 leading-[1.7] [animation:fade-up_0.8s_0.36s_ease_both]">
          Custom-built, not templated. You own every line of code. Managed hosting from {{ monthlyRate }}/month.
        </p>

        <div class="flex items-center gap-4 flex-wrap [animation:fade-up_0.8s_0.46s_ease_both]">
          <a
            href="#contact"
            class="btn-primary"
            @click="track('cta_click', { label: 'Free Audit', location: 'hero' })">
            Get a Free Audit
          </a>
          <a
            href="#pricing"
            class="btn-ghost"
            @click="track('cta_click', { label: 'See Pricing', location: 'hero' })">
            See Pricing
          </a>
        </div>

        <!-- Service-area line. The divider is decorative and only makes sense
             beside a single line of text, so it is desktop-only — on a phone
             this list wraps to two lines and the rule left it hanging. -->
        <div class="flex items-center gap-6 mt-12 md:mt-16 [animation:fade-up_0.8s_0.62s_ease_both]">
          <div class="crack-line w-20 flex-shrink-0 hidden lg:block" />
          <span class="font-mono text-[11px] tracking-[0.12em] leading-[1.9] uppercase text-(--theme-text-faint)">
            Manteno · Bourbonnais · Bradley · Kankakee · Peotone
          </span>
        </div>
      </div>

      <!-- ── Right column: hero visual ───────────────────────────────────── -->
      <!-- Hidden on mobile — saves ~280px of scroll depth before services.
           Renders a real photo when heroImage is configured, and a deliberate
           typographic composition until then, so the slot never looks empty.
           This replaced a rotating yin-yang that dispensed fortune cookies —
           a hard thing to defend in a B2B sales conversation. -->
      <div
        class="hidden lg:flex-shrink-0 lg:block lg:w-[420px] [animation:fade-up_0.8s_0.5s_ease_both]">
        <div class="crack-wrap">
          <div class="crack-inner crack-inner-all crack-inner-lg glass-card overflow-hidden">
            <NuxtImg
              v-if="heroImage"
              :src="heroImage"
              alt="Recent ILYTAT work"
              width="420" height="470"
              sizes="420px"
              class="w-full h-[470px] object-cover" />

            <div
              v-else
              class="h-[470px] flex flex-col justify-center gap-8 p-10"
              aria-hidden="true">
              <span class="font-mono text-[11px] tracking-[0.14em] uppercase text-(--theme-accent)">
                Kankakee County
              </span>
              <div class="flex flex-col gap-5">
                <div
                  v-for="stat in heroStats"
                  :key="stat.label"
                  class="flex items-baseline justify-between gap-4 border-b border-[var(--glass-card-border)] pb-4 last:border-0">
                  <span class="font-display text-[34px] font-extrabold tracking-[-0.03em] text-(--theme-fg)">
                    {{ stat.value }}
                  </span>
                  <span class="text-[13px] text-(--theme-text-muted) text-right">{{ stat.label }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Scroll indicator. Absolutely positioned, so it sits on top of whatever
         the hero's own content happens to occupy — on a phone the service-area
         line wraps to two lines and collided with it. It is purely decorative
         (scrolling is not a discoverability problem on touch), so it is
         desktop-only, where there is room for it. -->
    <div class="hidden lg:flex absolute bottom-10 left-1/2 -translate-x-1/2 z-[2] flex-col items-center gap-3" aria-hidden="true">
      <span class="font-mono text-[10px] tracking-[0.2em] uppercase text-(--theme-text-faint)">Scroll</span>
      <div class="crack-line-v h-10 flex-shrink-0 animate-bob" />
    </div>
  </section>
</template>
