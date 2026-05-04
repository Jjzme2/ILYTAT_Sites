/**
 * useExplosionColor — returns a random .glow-* class name on the client.
 *
 * Randomization happens in onMounted to avoid SSR/hydration mismatch.
 * The class maps to CSS variables --ex-c1/--ex-c2 consumed by .lumen-burst.
 *
 * Usage:
 *   const glowClass = useExplosionColor()
 *   <LumenSurface :class="glowClass" />
 *
 * To pin a color instead, pass the class directly: class="glow-violet"
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

export function useExplosionColor(): Ref<GlowClass> {
  const cls = ref<GlowClass>(GLOW_CLASSES[0])

  onMounted(() => {
    cls.value = GLOW_CLASSES[Math.floor(Math.random() * GLOW_CLASSES.length)]
  })

  return cls
}

/**
 * useExplosionColors — returns N unique random glow classes.
 * Useful for grids where you want adjacent cards to differ.
 */
export function useExplosionColors(count: number): Ref<GlowClass[]> {
  const classes = ref<GlowClass[]>(Array.from({ length: count }, (_, i) => GLOW_CLASSES[i % GLOW_CLASSES.length]))

  onMounted(() => {
    const shuffled = [...GLOW_CLASSES].sort(() => Math.random() - 0.5)
    classes.value = Array.from({ length: count }, (_, i) => shuffled[i % shuffled.length])
  })

  return classes
}
