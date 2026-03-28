<script setup lang="ts">
const { logout, isAdmin } = useAuth()
const route = useRoute()

const nav = [
  { label: 'Overview', to: '/dashboard', icon: 'i-heroicons-squares-2x2' },
  { label: 'My Orders', to: '/dashboard/orders', icon: 'i-heroicons-shopping-bag' },
  { label: 'Files', to: '/dashboard/files', icon: 'i-heroicons-folder' },
  { label: 'Settings', to: '/dashboard/settings', icon: 'i-heroicons-cog-6-tooth' },
]

const adminNav = [
  { label: 'All Orders', to: '/admin/orders', icon: 'i-heroicons-clipboard-document-list' },
  { label: 'Inquiries', to: '/admin/inquiries', icon: 'i-heroicons-inbox' },
]
</script>

<template>
  <aside class="w-64 flex-shrink-0 border-r border-white/5 bg-slate-950 flex flex-col h-screen sticky top-0">
    <!-- Logo -->
    <div class="p-6 border-b border-white/5">
      <NuxtLink to="/" class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
          <span class="text-white font-bold text-xs font-display">IL</span>
        </div>
        <span class="font-display font-bold text-white text-sm">ILYTAT Sites</span>
      </NuxtLink>
    </div>

    <!-- Nav -->
    <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
      <NuxtLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        :class="[
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
          route.path === item.to
            ? 'bg-orange-500/10 text-orange-400'
            : 'text-slate-400 hover:text-white hover:bg-white/5',
        ]"
      >
        <UIcon :name="item.icon" class="w-4 h-4" />
        {{ item.label }}
      </NuxtLink>

      <template v-if="isAdmin">
        <div class="pt-4 pb-2 px-3">
          <span class="text-xs text-slate-600 uppercase tracking-widest font-semibold">Admin</span>
        </div>
        <NuxtLink
          v-for="item in adminNav"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
            route.path.startsWith(item.to)
              ? 'bg-purple-500/10 text-purple-400'
              : 'text-slate-400 hover:text-white hover:bg-white/5',
          ]"
        >
          <UIcon :name="item.icon" class="w-4 h-4" />
          {{ item.label }}
        </NuxtLink>
      </template>
    </nav>

    <!-- Bottom -->
    <div class="p-4 border-t border-white/5">
      <NuxtLink
        to="/services"
        class="flex items-center justify-center gap-2 w-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-semibold text-sm py-2.5 rounded-xl transition-colors mb-3"
      >
        <UIcon name="i-heroicons-plus" class="w-4 h-4" />
        New Order
      </NuxtLink>
      <button
        class="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all"
        @click="logout"
      >
        <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-4 h-4" />
        Sign Out
      </button>
    </div>
  </aside>
</template>
