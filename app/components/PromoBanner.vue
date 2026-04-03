<script setup lang="ts">
const props = defineProps<{
  promotion: {
    id: string
    message: string
    ctaText?: string
    ctaUrl?: string
  }
}>()

const STORAGE_KEY = `dismissed_promo_${props.promotion.id}`

const visible = ref(true)

onMounted(() => {
  if (localStorage.getItem(STORAGE_KEY)) {
    visible.value = false
  }
})

function dismiss() {
  localStorage.setItem(STORAGE_KEY, '1')
  visible.value = false
}
</script>

<template>
  <Transition name="banner">
    <div v-if="visible" class="promo-banner" role="alert">
      <span class="promo-message">{{ promotion.message }}</span>
      <a
        v-if="promotion.ctaText && promotion.ctaUrl"
        :href="promotion.ctaUrl"
        class="promo-cta"
      >
        {{ promotion.ctaText }}
      </a>
      <button class="promo-close" aria-label="Dismiss" @click="dismiss">
        <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.promo-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 10px 48px 10px 16px;
  background: #f5c518;
  color: #18181c;
  font-size: 13.5px;
  font-weight: 500;
  position: relative;
  text-align: center;
  flex-wrap: wrap;
}

.promo-message {
  line-height: 1.4;
}

.promo-cta {
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.3px;
  color: #18181c;
  background: rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  padding: 4px 12px;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.15s;
}
.promo-cta:hover { background: rgba(0, 0, 0, 0.2); }

.promo-close {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #18181c;
  opacity: 0.6;
  padding: 4px;
  display: flex;
  align-items: center;
  transition: opacity 0.15s;
}
.promo-close:hover { opacity: 1; }

@media (max-width: 640px) {
  .promo-banner { padding: 10px 40px 10px 12px; gap: 10px; font-size: 12.5px; }
}

.banner-enter-active,
.banner-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.banner-enter-from,
.banner-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.banner-enter-to,
.banner-leave-from {
  max-height: 60px;
  opacity: 1;
}
</style>
