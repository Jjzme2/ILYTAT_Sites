<template>
  <!-- UApp provides the global toast/notification context required by useToast() -->
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
const { theme, init } = useTheme()
const { initLumen }   = useLumenPrefs()

// Stamp data-theme during SSR so the first paint is already the right palette.
// Without this the page renders light, then swaps on mount — a visible flash for
// anyone who chose dark.
useHead({ htmlAttrs: { 'data-theme': () => theme.value } })

onMounted(() => {
  init()       // reconcile stored choice with the OS colour-scheme preference
  initLumen()  // restore lumen light on/off preference
  // Lumen is pointer-driven — skip on touch-only devices (no hover = no pointermove)
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    useLumenTracker()
  }
})
</script>
