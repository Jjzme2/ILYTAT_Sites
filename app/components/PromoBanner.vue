<script setup lang="ts">
const props = defineProps<{
  promotion: {
    id: string
    message: string
    ctaText?: string
    ctaUrl?: string
  }
}>()

// Dismissal lives in a cookie, not localStorage, so the server already knows the
// banner is dismissed and never renders it. The previous localStorage +
// onMounted approach always painted the banner first, then removed it — a
// guaranteed layout shift on every load for anyone who had dismissed it.
const dismissed = useCookie<string | null>(`dismissed_promo_${props.promotion.id}`, {
  maxAge: 60 * 60 * 24 * 90,
  sameSite: 'lax',
})

const visible = computed(() => !dismissed.value)

function dismiss() {
  dismissed.value = '1'
}
</script>

<template>
  <Transition name="banner">
    <div v-if="visible" class="promo-wrap">
      <div class="promo-banner">
        <span class="promo-message">{{ promotion.message }}</span>
        <a
          v-if="promotion.ctaText && promotion.ctaUrl"
          :href="promotion.ctaUrl"
          class="promo-cta"
        >
          {{ promotion.ctaText }} &rarr;
        </a>
        <button class="promo-close" aria-label="Dismiss announcement" @click="dismiss">
          <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* The wrapper animates grid-template-rows instead of max-height, so the collapse
   works at any content height. The old `max-height: 60px` cap was shorter than
   the banner's real mobile height, which clipped it mid-transition. */
.promo-wrap {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.3s ease, opacity 0.3s ease;
}
.promo-banner {
  min-height: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 10px 44px 10px 16px;
  background: #f5c518;
  color: #18181c;
  font-size: 13.5px;
  font-weight: 500;
  position: relative;
  text-align: center;
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
  right: 12px;
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

/* Phones: stack the CTA under the message rather than letting flex-wrap drop it
   into an orphaned third row beside a half-visible message. */
@media (max-width: 640px) {
  .promo-banner {
    flex-direction: column;
    gap: 6px;
    padding: 9px 40px 9px 14px;
    font-size: 12.5px;
  }
  .promo-cta { font-size: 11.5px; padding: 3px 10px; }
}

.banner-enter-from,
.banner-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
}
</style>
