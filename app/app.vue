<template>
  <!-- UApp provides the global toast/notification context required by useToast() -->
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
const { init }       = useTheme()
const { initLumen }  = useLumenPrefs()

onMounted(() => {
  init()            // restore persisted Ember/Frost/Void theme
  initLumen()       // restore lumen light on/off preference
  useLumenTracker() // register single global pointer tracker for Lumen surfaces
})
</script>
