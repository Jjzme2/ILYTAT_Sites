<script setup lang="ts">
/**
 * LumenSurface — polymorphic surface with layered light effects.
 *
 * Layers (bottom to top):
 *   Burst    — large radial explosion of color, always-on, animates opacity+transform only
 *   Prism    — dual radial spheres on cursor proximity (screen blend)
 *   Slot     — actual content (z-1)
 *   Crack    — 1px perimeter glow tracked to cursor (::after, z-2)
 *
 * Override via class: .glow-gold, .glow-violet, .glow-cobalt, etc.
 * Or let the parent set --ex-c1/--ex-c2 directly.
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  as?: string
}>(), {
  as: 'div',
})

const attrs = useAttrs()
</script>

<template>
  <component
    :is="props.as"
    class="lumen-surface relative isolate overflow-hidden"
    v-bind="attrs">

    <!-- Layer 0: Burst — contained explosion of light, always visible -->
    <div class="lumen-burst absolute pointer-events-none" aria-hidden="true" />

    <!-- Layer 2: Prism — dual radial spheres, screen blend -->
    <div class="lumen-prism absolute inset-0 pointer-events-none rounded-[inherit]" aria-hidden="true" />

    <!-- Slot content above all effect layers -->
    <div class="relative z-[1] flex flex-col flex-1">
      <slot />
    </div>
  </component>
</template>

<style scoped>
/* ── Layer 0: Burst ──────────────────────────────────────────────────────── */
/*
 * Radial explosion centered in the card — a vivid light source pressed against
 * dark glass from inside. White hot core, colored mid-range, fades to nothing.
 *
 * Only animates opacity and transform — both are compositor-only properties,
 * zero main-thread repaints, zero layout impact.
 *
 * --ex-c1/--ex-c2 override the palette colors for the explosion specifically.
 * This lets you set .glow-gold on the element without touching the mosaic/prism.
 */
.lumen-burst {
  /* Intentionally overflows the card — clipped by parent overflow:hidden */
  inset: -25%;
  z-index: 0;
  background:
    /* White-hot core: very small, very bright */
    radial-gradient(circle 14% at 42% 44%, rgba(255, 255, 255, 0.55) 0%, transparent 100%),
    /* Primary color burst */
    radial-gradient(circle 58% at 38% 42%, var(--ex-c1, var(--theme-accent)) 0%, transparent 70%),
    /* Secondary color burst — offset for depth */
    radial-gradient(circle 48% at 65% 60%, var(--ex-c2, var(--theme-border-glow)) 0%, transparent 65%);
  mix-blend-mode: screen;
  will-change: opacity, transform;
  animation: lumen-burst 4s ease-in-out infinite;
  pointer-events: none;
}

/* ── Layer 2: Prism ──────────────────────────────────────────────────────── */
.lumen-prism {
  background:
    radial-gradient(circle 60px at var(--px, 50%) var(--py, 50%), var(--theme-accent), transparent 80%),
    radial-gradient(circle 40px at calc(var(--px, 50%) + 15px) calc(var(--py, 50%) + 10px), var(--theme-border-glow), transparent 70%);
  mix-blend-mode: screen;
  filter: saturate(1.2);
  opacity: calc(0.06 + var(--on, 0) * 0.94);
}

/* ── Layer 3: Crack — 1px perimeter glow, masked to border area only ─────── */
.lumen-surface::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: inherit;
  padding: 1px;
  background: radial-gradient(
    circle 80px at var(--px, 50%) var(--py, 50%),
    white 0%,
    var(--theme-border-glow) 25%,
    transparent 65%
  );
  /* Screaming light on hover */
  opacity: calc(0.15 + var(--on, 0) * 0.85);
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: destination-out;
  mask-composite: exclude;
  pointer-events: none;
}
</style>
