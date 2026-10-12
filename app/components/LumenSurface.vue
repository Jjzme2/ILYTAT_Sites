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
  /** An HTML tag name, or the name of a component such as 'NuxtLink'. */
  as?: string
}>(), {
  as: 'div',
})

/**
 * Components that `as` may name, resolved here so `:is` never sees a bare name.
 *
 * Handing `:is` the string 'NuxtLink' does not work. Nuxt's component
 * auto-import is a compile-time rewrite: it acts on a literal `<NuxtLink>` tag
 * in a template, or on a literal `resolveComponent('NuxtLink')` call in script.
 * A name that only exists as a runtime value reaches neither, so nothing is
 * imported, the lookup finds nothing, and Vue treats the unresolved name as a
 * native element — emitting `<NuxtLink to="...">` into the HTML.
 *
 * That tag looks fine and is not a link: no href, no focus, no navigation, and
 * nothing for a crawler to follow. Every service card on the homepage was that
 * tag, which left the five service pages with no working route in from the
 * homepage at all, and the dead "Learn more" on each card was the visible edge
 * of it.
 *
 * Hence the lookup table: the key is what a caller writes, and the value is a
 * literal `resolveComponent` call that the build can actually see. Resolving
 * centrally means no caller can reintroduce the bug, and an unrecognised name
 * says so in dev rather than rendering a convincing non-link.
 */
const RESOLVABLE: Record<string, unknown> = {
  NuxtLink: resolveComponent('NuxtLink'),
}

const resolvedTag = computed(() => {
  // Tag names are lowercase; component names are not. Anything lowercase is a
  // plain element and passes straight through.
  if (!/^[A-Z]/.test(props.as)) return props.as

  const component = RESOLVABLE[props.as]
  if (component) return component

  if (import.meta.dev) {
    console.error(
      `[LumenSurface] as="${props.as}" is not in RESOLVABLE, so it will render as `
      + `an inert <${props.as}> element rather than a component. Add it to the table.`,
    )
  }
  return props.as
})

const attrs = useAttrs()
</script>

<template>
  <component
    :is="resolvedTag"
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
    radial-gradient(circle 14% at 42% 44%, var(--lumen-core) 0%, transparent 100%),
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
