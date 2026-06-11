<script setup lang="ts">
import { ref } from 'vue'
import { siteConfig } from '~/config/site.config'

const { track } = useAnalytics()
const { monthlyRate } = siteConfig

const heroRef  = ref<HTMLElement | null>(null)
const blob1Ref = ref<HTMLElement | null>(null)
const blob2Ref = ref<HTMLElement | null>(null)
const blob3Ref = ref<HTMLElement | null>(null)
const blob4Ref = ref<HTMLElement | null>(null)

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
    blob3Ref.value!.style.translate = `${(cmx - 540) *  0.016}px ${(-sy * 0.13) + (cmy - 360) * -0.01}px`
    blob4Ref.value!.style.translate = `${(cmx - 540) * -0.009}px ${(-sy * 0.06) + (cmy - 360) *  0.007}px`
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
    class="relative min-h-screen flex flex-col justify-center px-12 pt-[120px] pb-24 overflow-hidden md:px-6 md:pt-[100px] sm:px-4 sm:pt-[88px]">

    <!-- Ambient blobs -->
    <div ref="blob1Ref" class="hero-blob hero-blob-1" aria-hidden="true" />
    <div ref="blob2Ref" class="hero-blob hero-blob-2" aria-hidden="true" />
    <div ref="blob3Ref" class="hero-blob hero-blob-3" aria-hidden="true" />
    <div ref="blob4Ref" class="hero-blob hero-blob-4" aria-hidden="true" />

    <!-- SVG fracture-map watermark -->
    <svg
      class="absolute inset-0 w-full h-full pointer-events-none select-none"
      viewBox="0 0 1080 720"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true">
      <g stroke="var(--theme-accent)" fill="none" stroke-width="0.6" opacity="0.1">
        <!-- Main fracture system radiating from top-right -->
        <path d="M 1060 40 L 870 210 L 710 320 L 540 470 L 340 620" />
        <path d="M 870 210 L 940 360 L 880 480" />
        <path d="M 710 320 L 640 410 L 680 530" />
        <!-- Counter-fracture from left -->
        <path d="M 0 180 L 180 280 L 300 370 L 240 500" />
        <path d="M 180 280 L 100 420" />
      </g>
      <!-- Fracture node dots — where cracks intersect or terminate -->
      <g fill="var(--theme-accent)" opacity="0.28">
        <circle cx="870" cy="210" r="2.5" />
        <circle cx="710" cy="320" r="1.8" />
        <circle cx="540" cy="470" r="2"   />
        <circle cx="180" cy="280" r="1.8" />
      </g>
    </svg>

    <div class="relative z-[2] max-w-[1080px] mx-auto w-full flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10 lg:gap-16">

      <!-- ── Left column: copy ───────────────────────────────────────────── -->
      <div class="lg:flex-1 lg:min-w-0 lg:max-w-[580px]">

        <!-- Eyebrow chip — uses crack-inner shape -->
        <div
          class="inline-flex items-center gap-2.5 px-4 py-2 mb-10 border border-[var(--theme-accent)]/[0.14] bg-[var(--theme-accent)]/[0.04] backdrop-blur-md [animation:fade-up_0.8s_ease_both]"
          style="clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))">
          <span class="w-1.5 h-1.5 bg-[var(--theme-accent)]" style="box-shadow: 0 0 8px var(--theme-accent)" aria-hidden="true" />
          <span class="font-mono text-[9px] tracking-[3px] uppercase text-[var(--theme-text-muted)]">Based in Manteno · Serving Kankakee County</span>
        </div>

        <h1 class="mb-8">
          <span class="block font-display text-[clamp(52px,7.6vw,96px)] font-extrabold tracking-[-3.5px] leading-[0.95] text-[var(--theme-text)] [animation:fade-up_0.8s_0.1s_ease_both]">
            Agency-grade
          </span>
          <span class="block font-display text-[clamp(46px,6.8vw,84px)] font-light tracking-[-2.5px] leading-[1.05] text-[var(--theme-text-muted)] [animation:fade-up_0.8s_0.18s_ease_both]">
            websites for
          </span>
          <em
            class="block font-headline italic text-[clamp(50px,7.2vw,90px)] leading-[1.08] hero-gold-text [animation:fade-up_0.8s_0.26s_ease_both]"
            style="letter-spacing: -2.5px">
            local business.
          </em>
        </h1>

        <p class="text-[15px] text-[var(--theme-text-body)] max-w-[420px] mb-10 leading-[1.9] [animation:fade-up_0.8s_0.36s_ease_both]">
          Custom-built, not templated. You own every line of code. Managed hosting from {{ monthlyRate }}/month.
        </p>

        <div class="flex items-center gap-4 flex-wrap [animation:fade-up_0.8s_0.46s_ease_both]">
          <a
            href="#contact"
            class="btn-primary"
            style="clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))"
            @click="track('cta_click', { label: 'Free Audit', location: 'hero' })">
            Get a Free Audit
          </a>
          <a
            href="#pricing"
            class="btn-ghost"
            style="clip-path: polygon(0 0, calc(100% - 9px) 0, 100% 9px, 100% 100%, 9px 100%, 0 calc(100% - 9px))"
            @click="track('cta_click', { label: 'See Pricing', location: 'hero' })">
            See Pricing
          </a>
        </div>

        <!-- Crack-line accent divider -->
        <div class="flex items-center gap-6 mt-16 [animation:fade-up_0.8s_0.62s_ease_both]">
          <div class="crack-line w-20 flex-shrink-0" />
          <span class="font-mono text-[9px] tracking-[2.5px] uppercase text-[var(--theme-text-faint)]">
            Manteno · Bourbonnais · Bradley · Kankakee · Peotone
          </span>
        </div>
      </div>

      <!-- ── Right column: Fortune Orb in crack panel ───────────────────── -->
      <!-- Hidden on mobile — saves 280px of vertical scroll depth before services -->
      <div
        class="hidden lg:flex-shrink-0 lg:block [animation:fade-up_0.8s_0.72s_ease_both]"
        aria-label="ILYTAT symbol">
        <!-- Mobile divider -->
        <div class="lg:hidden crack-line mb-8" aria-hidden="true" />

        <!-- Crack panel wrapper for the orb -->
        <div class="crack-wrap">
          <div class="crack-inner crack-inner-all crack-inner-lg glass-card flex flex-col items-center justify-center p-8 lg:p-10 gap-6">
            <SiteFortuneOrb />
          </div>
        </div>
      </div>
    </div>

    <!-- Scroll indicator -->
    <div class="absolute bottom-10 left-1/2 -translate-x-1/2 z-[2] flex flex-col items-center gap-3" aria-hidden="true">
      <span class="font-mono text-[8px] tracking-[3.5px] uppercase text-[var(--theme-text-faint)]">Scroll</span>
      <div class="crack-line-v h-10 flex-shrink-0 animate-bob" />
    </div>
  </section>
</template>
