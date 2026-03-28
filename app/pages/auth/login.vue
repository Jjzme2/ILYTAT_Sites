<script setup lang="ts">
definePageMeta({ layout: 'default' })
useHead({ title: 'Sign In — ILYTAT Sites' })

const { signIn, signInWithGoogle, user } = useAuth()
const toast = useToast()
const route = useRoute()

// Redirect if already logged in
watchEffect(() => {
  if (user.value) navigateTo('/dashboard')
})

const form = reactive({ email: '', password: '' })
const loading = ref(false)
const googleLoading = ref(false)
const isRegister = ref(false)

const handleSubmit = async () => {
  loading.value = true
  try {
    await signIn(form.email, form.password)
    navigateTo((route.query.redirect as string) || '/dashboard')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Invalid email or password'
    toast.add({ title: msg.includes('user-not-found') ? 'No account found with that email' : 'Invalid email or password', color: 'error' })
  } finally {
    loading.value = false
  }
}

const handleGoogle = async () => {
  googleLoading.value = true
  try {
    await signInWithGoogle()
    navigateTo('/dashboard')
  } catch {
    toast.add({ title: 'Google sign-in failed', color: 'error' })
  } finally {
    googleLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-10">
        <NuxtLink to="/" class="inline-flex items-center gap-2.5 mb-6">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <span class="text-white font-bold font-display">IL</span>
          </div>
          <span class="font-display font-bold text-white text-lg">ILYTAT Sites</span>
        </NuxtLink>
        <h1 class="font-display text-3xl font-bold text-white">
          {{ isRegister ? 'Create an account' : 'Welcome back' }}
        </h1>
        <p class="text-slate-400 mt-2">
          {{ isRegister ? 'Track your orders and manage deliverables' : 'Sign in to your dashboard' }}
        </p>
      </div>

      <div class="glass border border-white/5 rounded-2xl p-8">
        <!-- Google -->
        <button
          :disabled="googleLoading"
          class="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-800 font-semibold py-3.5 rounded-xl transition-all mb-6 disabled:opacity-60"
          @click="handleGoogle"
        >
          <div v-if="googleLoading" class="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          <template v-else>
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </template>
        </button>

        <div class="flex items-center gap-3 mb-6">
          <div class="flex-1 h-px bg-white/10" />
          <span class="text-slate-500 text-sm">or with email</span>
          <div class="flex-1 h-px bg-white/10" />
        </div>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label class="text-sm text-slate-300 font-medium mb-2 block">Email</label>
            <input
              v-model="form.email"
              type="email"
              required
              autocomplete="email"
              placeholder="you@example.com"
              class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-all"
            />
          </div>
          <div>
            <label class="text-sm text-slate-300 font-medium mb-2 block">Password</label>
            <input
              v-model="form.password"
              type="password"
              required
              autocomplete="current-password"
              placeholder="••••••••"
              class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-all"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-orange-500/30 mt-2"
          >
            <div v-if="loading" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <template v-else>{{ isRegister ? 'Create Account' : 'Sign In' }}</template>
          </button>
        </form>

        <p class="text-center text-sm text-slate-400 mt-6">
          {{ isRegister ? 'Already have an account?' : "Don't have an account?" }}
          <NuxtLink
            :to="isRegister ? '/auth/login' : '/auth/register'"
            class="text-orange-400 hover:text-orange-300 font-medium ml-1"
          >
            {{ isRegister ? 'Sign in' : 'Create one' }}
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>
