<script setup lang="ts">
useHead({ title: 'Page Not Found — ILYTAT Sites' })
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center px-4">
      <div class="font-display text-9xl font-bold gradient-text mb-4">404</div>
      <h1 class="font-display text-3xl font-bold text-white mb-3">Page not found</h1>
      <p class="text-slate-400 mb-8">The page you're looking for doesn't exist or has been moved.</p>
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold px-8 py-4 rounded-2xl transition-all"
      >
        Back to Home
        <UIcon name="i-heroicons-arrow-right" class="w-5 h-5" />
      </NuxtLink>
    </div>
  </div>
</template>
