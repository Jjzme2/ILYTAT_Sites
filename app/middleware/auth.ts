import { until } from '@vueuse/core'

export default defineNuxtRouteMiddleware(async () => {
  const { user, loading } = useAuth()

  // Wait for auth to initialize
  if (import.meta.client) {
    await until(loading).toBe(false)
  }

  if (!user.value) {
    const route = useRoute()
    return navigateTo(`/auth/login?redirect=${encodeURIComponent(route.fullPath)}`)
  }
})
