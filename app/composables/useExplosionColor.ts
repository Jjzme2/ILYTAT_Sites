/**
 * useExplosionColor — returns a .glow-* class name.
 *
 * The class maps to CSS variables --ex-c1/--ex-c2 consumed by .lumen-burst.
 *
 * These used to be shuffled at random in onMounted, so the five service cards
 * drew five of ten hues — including crimson, lime and rose — on a gold-branded
 * site, reshuffled on every page load. The site literally looked different
 * every refresh, which made it impossible to art-direct or screenshot. The
 * palette is now pinned to the two on-brand golds.
 *
 * Usage:
 *   const glowClass = useExplosionColor()
 *   <LumenSurface :class="glowClass" />
 *
 * To pin a specific colour, pass the class directly: class="glow-violet"
 */

const GLOW_CLASSES = [
  'glow-gold',
  'glow-violet',
  'glow-cobalt',
  'glow-rose',
  'glow-emerald',
  'glow-aurora',
  'glow-solar',
  'glow-ice',
  'glow-crimson',
  'glow-lime',
] as const

export type GlowClass = typeof GLOW_CLASSES[number]

/** The only hues that belong on a gold-branded page. */
const BRAND_GLOWS: readonly GlowClass[] = ['glow-gold', 'glow-solar']

export function useExplosionColor(): Ref<GlowClass> {
  return ref<GlowClass>(BRAND_GLOWS[0])
}

/**
 * useExplosionColors — returns N unique random glow classes.
 * Useful for grids where you want adjacent cards to differ.
 */
export function useExplosionColors(count: number): Ref<GlowClass[]> {
  return ref<GlowClass[]>(
    Array.from({ length: count }, (_, i) => BRAND_GLOWS[i % BRAND_GLOWS.length]),
  )
}
