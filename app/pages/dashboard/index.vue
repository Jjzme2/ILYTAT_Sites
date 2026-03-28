<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
useHead({ title: 'Dashboard — ILYTAT Sites' })

const { user, appUser } = useAuth()
const { getUserOrders } = useOrders()

const orders = ref<Order[]>([])
const loading = ref(true)

onMounted(async () => {
  if (user.value) {
    orders.value = await getUserOrders(user.value.uid)
  }
  loading.value = false
})

import type { Order } from '~/types'

const statusConfig: Record<Order['status'], { label: string; color: string; icon: string }> = {
  pending_payment: { label: 'Pending Payment', color: 'text-yellow-400', icon: 'i-heroicons-clock' },
  paid: { label: 'Paid', color: 'text-blue-400', icon: 'i-heroicons-banknotes' },
  in_progress: { label: 'In Progress', color: 'text-orange-400', icon: 'i-heroicons-cog-6-tooth' },
  review: { label: 'Under Review', color: 'text-purple-400', icon: 'i-heroicons-eye' },
  completed: { label: 'Completed', color: 'text-green-400', icon: 'i-heroicons-check-circle' },
  cancelled: { label: 'Cancelled', color: 'text-slate-400', icon: 'i-heroicons-x-circle' },
}
</script>

<template>
  <div>
    <!-- Welcome -->
    <div class="mb-8">
      <h1 class="font-display text-3xl font-bold text-white">
        Welcome back{{ appUser?.displayName ? `, ${appUser.displayName.split(' ')[0]}` : '' }}!
      </h1>
      <p class="text-slate-400 mt-1">Here's an overview of your orders.</p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <div class="glass border border-white/5 rounded-2xl p-6">
        <div class="text-slate-400 text-sm mb-1">Total Orders</div>
        <div class="font-display text-3xl font-bold text-white">{{ orders.length }}</div>
      </div>
      <div class="glass border border-white/5 rounded-2xl p-6">
        <div class="text-slate-400 text-sm mb-1">In Progress</div>
        <div class="font-display text-3xl font-bold text-orange-400">
          {{ orders.filter((o) => o.status === 'in_progress').length }}
        </div>
      </div>
      <div class="glass border border-white/5 rounded-2xl p-6">
        <div class="text-slate-400 text-sm mb-1">Completed</div>
        <div class="font-display text-3xl font-bold text-green-400">
          {{ orders.filter((o) => o.status === 'completed').length }}
        </div>
      </div>
    </div>

    <!-- Orders -->
    <div class="glass border border-white/5 rounded-2xl overflow-hidden">
      <div class="p-6 border-b border-white/5 flex items-center justify-between">
        <h2 class="font-semibold text-white">Your Orders</h2>
        <NuxtLink
          to="/services"
          class="text-sm text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1"
        >
          New Order
          <UIcon name="i-heroicons-plus" class="w-4 h-4" />
        </NuxtLink>
      </div>

      <div v-if="loading" class="p-12 flex justify-center">
        <div class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>

      <div v-else-if="orders.length === 0" class="p-12 text-center">
        <UIcon name="i-heroicons-shopping-bag" class="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p class="text-slate-400 mb-5">No orders yet. Let's change that!</p>
        <NuxtLink
          to="/services"
          class="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-6 py-3 rounded-xl transition-all"
        >
          Browse Services
          <UIcon name="i-heroicons-arrow-right" class="w-4 h-4" />
        </NuxtLink>
      </div>

      <div v-else class="divide-y divide-white/5">
        <div
          v-for="order in orders"
          :key="order.id"
          class="p-6 flex items-center justify-between gap-4"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3 mb-1">
              <span class="font-semibold text-white">{{ order.serviceName }}</span>
              <span class="text-slate-500 text-sm">·</span>
              <span class="text-slate-400 text-sm">{{ order.packageName }}</span>
            </div>
            <div class="flex items-center gap-4 text-sm">
              <span
                :class="['flex items-center gap-1.5 font-medium', statusConfig[order.status]?.color]"
              >
                <UIcon :name="statusConfig[order.status]?.icon" class="w-3.5 h-3.5" />
                {{ statusConfig[order.status]?.label }}
              </span>
              <span class="text-slate-500">
                {{ order.createdAt?.toLocaleDateString() }}
              </span>
            </div>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="font-semibold text-white">${{ order.amount }}</div>
            <div
              v-if="order.deliverables?.length"
              class="text-xs text-green-400 mt-1"
            >
              {{ order.deliverables.length }} file(s) ready
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
