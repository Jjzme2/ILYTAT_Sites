<script setup lang="ts">
const { user, logout } = useAuth()
const route = useRoute()
const mobileOpen = ref(false)

const navLinks = [
  { label: 'Services', to: '/services' },
  { label: 'QR Generator', to: '/tools/qr-code' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

const isScrolled = ref(false)

onMounted(() => {
  const handleScroll = () => {
    isScrolled.value = window.scrollY > 20
  }
  window.addEventListener('scroll', handleScroll, { passive: true })
  onUnmounted(() => window.removeEventListener('scroll', handleScroll))
})
</script>

<template>
  <header
    :class="[
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      isScrolled
        ? 'bg-slate-950/90 backdrop-blur-xl border-b border-white/5 shadow-xl shadow-black/20'
        : 'bg-transparent',
    ]"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16 lg:h-20">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2.5 group">
          <div
            class="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-shadow"
          >
            <span class="text-white font-bold text-sm font-display">IL</span>
          </div>
          <div class="flex flex-col leading-none">
            <span class="font-display font-bold text-white text-base tracking-tight">ILYTAT</span>
            <span class="text-orange-400 text-[10px] font-medium uppercase tracking-widest">Sites</span>
          </div>
        </NuxtLink>

        <!-- Desktop nav -->
        <nav class="hidden lg:flex items-center gap-1">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              route.path === link.to
                ? 'text-orange-400 bg-orange-500/10'
                : 'text-slate-300 hover:text-white hover:bg-white/5',
            ]"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>

        <!-- CTA / User -->
        <div class="hidden lg:flex items-center gap-3">
          <template v-if="user">
            <NuxtLink
              to="/dashboard"
              class="text-sm text-slate-300 hover:text-white transition-colors px-3 py-2"
            >
              Dashboard
            </NuxtLink>
            <button
              class="text-sm text-slate-400 hover:text-white transition-colors"
              @click="logout"
            >
              Sign out
            </button>
          </template>
          <template v-else>
            <NuxtLink
              to="/auth/login"
              class="text-sm text-slate-300 hover:text-white transition-colors px-3 py-2"
            >
              Sign in
            </NuxtLink>
            <NuxtLink
              to="/services"
              class="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5"
            >
              Get Started
              <UIcon name="i-heroicons-arrow-right" class="w-4 h-4" />
            </NuxtLink>
          </template>
        </div>

        <!-- Mobile menu button -->
        <button
          class="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          @click="mobileOpen = !mobileOpen"
        >
          <UIcon :name="mobileOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'" class="w-6 h-6" />
        </button>
      </div>
    </div>

    <!-- Mobile menu -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="mobileOpen"
        class="lg:hidden border-t border-white/5 bg-slate-950/95 backdrop-blur-xl"
      >
        <div class="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            @click="mobileOpen = false"
          >
            {{ link.label }}
          </NuxtLink>
          <div class="pt-3 border-t border-white/5 flex flex-col gap-2">
            <NuxtLink
              v-if="user"
              to="/dashboard"
              class="px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5"
              @click="mobileOpen = false"
            >
              Dashboard
            </NuxtLink>
            <NuxtLink
              v-else
              to="/auth/login"
              class="px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5"
              @click="mobileOpen = false"
            >
              Sign in
            </NuxtLink>
            <NuxtLink
              to="/services"
              class="mx-4 text-center bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors"
              @click="mobileOpen = false"
            >
              Get Started
            </NuxtLink>
          </div>
        </div>
      </div>
    </Transition>
  </header>
</template>
