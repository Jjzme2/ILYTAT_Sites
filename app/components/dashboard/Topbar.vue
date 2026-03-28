<script setup lang="ts">
const { user, appUser } = useAuth()
</script>

<template>
  <header class="h-16 border-b border-white/5 flex items-center justify-between px-6 flex-shrink-0">
    <div class="text-sm text-slate-400">
      <NuxtLink to="/" class="hover:text-white transition-colors">← Back to site</NuxtLink>
    </div>
    <div class="flex items-center gap-3">
      <div class="text-right">
        <div class="text-sm font-medium text-white">{{ appUser?.displayName || user?.email }}</div>
        <div class="text-xs text-slate-500">{{ appUser?.businessName || 'My Account' }}</div>
      </div>
      <div
        class="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm"
      >
        {{ (appUser?.displayName || user?.email || '?')[0].toUpperCase() }}
      </div>
    </div>
  </header>
</template>
