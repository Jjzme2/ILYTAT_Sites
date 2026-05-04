<template>
  <!-- UApp provides the global toast/notification context required by useToast() -->
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
const { init } = useTheme()

onMounted(() => {
  init()           // restore persisted Ember/Frost theme
  useLumenTracker() // register single global pointer tracker for Lumen surfaces
})
</script>
