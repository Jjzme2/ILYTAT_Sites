<script setup lang="ts">
const emit = defineEmits<{ close: [] }>()

const query = ref('')
const activeIdx = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

// ── Commands ──────────────────────────────────────────────────────────────────
const GROUPS = [
  {
    group: 'Explore',
    items: [
      { id: 'services',     label: 'Our Services',       hint: 'What we build',        icon: 'i-heroicons-sparkles',                action: 'scroll' },
      { id: 'how-it-works', label: 'How It Works',       hint: 'The process',           icon: 'i-heroicons-arrow-path',              action: 'scroll' },
      { id: 'pricing',      label: 'View Pricing',        hint: 'Plans & packages',      icon: 'i-heroicons-currency-dollar',         action: 'scroll' },
      { id: 'portfolio',    label: 'See Our Work',        hint: 'Recent projects',       icon: 'i-heroicons-photo',                   action: 'scroll' },
      { id: 'about',        label: 'About ILYTAT',        hint: 'Our story',             icon: 'i-heroicons-user',                    action: 'scroll' },
      { id: 'faq',          label: 'FAQ',                 hint: 'Common questions',      icon: 'i-heroicons-question-mark-circle',    action: 'scroll' },
      { id: 'blog',         label: 'Read the Blog',       hint: 'Tips for local business', icon: 'i-heroicons-newspaper',            action: 'page' },
    ],
  },
  {
    group: 'Get Started',
    items: [
      { id: 'contact', label: 'Get a Free Quote', hint: 'No commitment', icon: 'i-heroicons-chat-bubble-left-ellipsis', action: 'scroll' },
      { id: 'contact', label: 'Send a Message',   hint: 'Reach out',     icon: 'i-heroicons-envelope',                  action: 'scroll' },
    ],
  },
]

// ── Filtering ────────────────────────────────────────────────────────────────
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return GROUPS
  return GROUPS
    .map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q)) }))
    .filter(g => g.items.length)
})

const flatFiltered = computed(() => filtered.value.flatMap(g => g.items))

watch(query, () => { activeIdx.value = 0 })

// ── Actions ───────────────────────────────────────────────────────────────────
const router = useRouter()

function run(item: (typeof GROUPS)[0]['items'][0]) {
  close()
  if (item.action === 'page') {
    nextTick(() => router.push('/blog'))
    return
  }
  nextTick(() => {
    const el = document.getElementById(item.id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function close() { emit('close') }

// ── Keyboard navigation ───────────────────────────────────────────────────────
function onKey(e: KeyboardEvent) {
  const len = flatFiltered.value.length
  if (!len) return
  if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx.value = (activeIdx.value + 1) % len }
  if (e.key === 'ArrowUp')   { e.preventDefault(); activeIdx.value = (activeIdx.value - 1 + len) % len }
  if (e.key === 'Enter')     { run(flatFiltered.value[activeIdx.value]!) }
  if (e.key === 'Escape')    { close() }
}

onMounted(() => {
  nextTick(() => inputRef.value?.focus())
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))

// ── Mobile swipe-down to dismiss ──────────────────────────────────────────────
const sheetRef = ref<HTMLElement | null>(null)
const dragY = ref(0)
let touchStartY = 0
let isDragging = false

function onTouchStart(e: TouchEvent) {
  // Only drag if at the top of the scroll area (i.e. the handle / search row)
  touchStartY = e.touches[0]!.clientY
  dragY.value = 0
  isDragging = true
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging) return
  const delta = e.touches[0]!.clientY - touchStartY
  if (delta > 0) {
    dragY.value = delta
    // Let the sheet move but don't scroll the page
    e.preventDefault()
  }
}

function onTouchEnd() {
  isDragging = false
  if (dragY.value > 90) {
    close()
  } else {
    // Snap back
    dragY.value = 0
  }
}

const sheetStyle = computed(() => ({
  transform: `translateY(${dragY.value}px)`,
  transition: dragY.value === 0 ? 'transform .35s cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
}))

// Global idx helper used by the template
function globalIdx(groupIdx: number, itemIdx: number) {
  let count = 0
  for (let g = 0; g < groupIdx; g++) count += (filtered.value[g]?.items.length ?? 0)
  return count + itemIdx
}
</script>

<template>
  <!-- Backdrop -->
  <Transition name="backdrop">
    <div class="sp-backdrop" @click="close" />
  </Transition>

  <!-- Sheet / Modal -->
  <Transition name="sheet">
    <div
      ref="sheetRef"
      class="sp-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="Site navigation"
      :style="sheetStyle"
    >
      <!-- Drag handle (mobile only) -->
      <div
        class="sp-handle-zone"
        @touchstart.passive="onTouchStart"
        @touchmove="onTouchMove"
        @touchend.passive="onTouchEnd"
      >
        <span class="sp-handle" />
      </div>

      <!-- Search -->
      <div class="sp-search-row">
        <UIcon name="i-heroicons-magnifying-glass" class="sp-search-icon" />
        <input
          ref="inputRef"
          v-model="query"
          class="sp-input"
          placeholder="Search or jump to a section…"
          autocomplete="off"
          spellcheck="false"
        />
        <kbd class="sp-esc" @click="close">esc</kbd>
      </div>

      <!-- Results -->
      <div class="sp-results">
        <template v-if="flatFiltered.length">
          <div v-for="(group, gi) in filtered" :key="group.group" class="sp-group">
            <p class="sp-group-label">{{ group.group }}</p>
            <button
              v-for="(item, ii) in group.items"
              :key="item.id + ii"
              :class="['sp-item', globalIdx(gi, ii) === activeIdx && 'sp-item--active']"
              @mouseenter="activeIdx = globalIdx(gi, ii)"
              @click="run(item)"
            >
              <span class="sp-item-left">
                <UIcon :name="item.icon" class="sp-item-icon" />
                <span class="sp-item-label">{{ item.label }}</span>
              </span>
              <span class="sp-item-hint">{{ item.hint }}</span>
            </button>
          </div>
        </template>
        <p v-else class="sp-empty">No results for "{{ query }}"</p>
      </div>

      <!-- Footer -->
      <div class="sp-footer">
        <span class="sp-footer-tip"><kbd>↑↓</kbd> navigate</span>
        <span class="sp-footer-tip"><kbd>↵</kbd> select</span>
        <span class="sp-footer-tip sp-footer-tip--desktop"><kbd>⌘K</kbd> toggle</span>
        <span class="sp-footer-tip sp-footer-tip--mobile">swipe down to close</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ── Backdrop ─────────────────────────────────────────────────────────────── */
.sp-backdrop {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0, 0, 0, .6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.backdrop-enter-active, .backdrop-leave-active { transition: opacity .2s; }
.backdrop-enter-from, .backdrop-leave-to { opacity: 0; }

/* ── Sheet / Modal ────────────────────────────────────────────────────────── */
.sp-sheet {
  position: fixed; z-index: 201;
  background: #16161e;
  border: 1px solid #2a2a38;
  display: flex; flex-direction: column;
  overflow: hidden;
}

/* Desktop: centered modal */
@media (min-width: 641px) {
  .sp-sheet {
    top: 18vh; left: 50%; translate: -50% 0;
    width: min(580px, 92vw);
    border-radius: 14px;
    box-shadow: 0 32px 80px rgba(0,0,0,.6);
    max-height: 68vh;
  }
  .sp-handle-zone { display: none; }
  .sp-footer-tip--mobile { display: none; }
}

/* Mobile: bottom sheet */
@media (max-width: 640px) {
  .sp-sheet {
    bottom: 0; left: 0; right: 0;
    border-radius: 18px 18px 0 0;
    border-bottom: none;
    max-height: 82svh;
    box-shadow: 0 -12px 48px rgba(0,0,0,.5);
  }
  .sp-footer-tip--desktop { display: none; }
}

/* Sheet animation — desktop scale */
@media (min-width: 641px) {
  .sheet-enter-active, .sheet-leave-active { transition: opacity .18s, transform .18s; }
  .sheet-enter-from, .sheet-leave-to { opacity: 0; transform: translateX(-50%) scale(.96); }
}

/* Sheet animation — mobile slide up */
@media (max-width: 640px) {
  .sheet-enter-active { transition: transform .32s cubic-bezier(0.32, 0.72, 0, 1); }
  .sheet-leave-active  { transition: transform .22s ease-in; }
  .sheet-enter-from, .sheet-leave-to { transform: translateY(100%); }
}

/* ── Drag handle ──────────────────────────────────────────────────────────── */
.sp-handle-zone {
  display: flex; justify-content: center; align-items: center;
  padding: 12px 0 6px; cursor: grab; touch-action: none; flex-shrink: 0;
}
.sp-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: #3a3a48;
}

/* ── Search row ───────────────────────────────────────────────────────────── */
.sp-search-row {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid #2a2a32;
  flex-shrink: 0;
}
.sp-search-icon { width: 18px; height: 18px; color: #666; flex-shrink: 0; }
.sp-input {
  flex: 1; background: none; border: none; outline: none;
  font-size: 16px; color: #f0ece6;
  caret-color: #6366f1;
}
.sp-input::placeholder { color: #555; }
.sp-esc {
  font-size: 11px; padding: 3px 7px; border-radius: 5px;
  background: #1e1e28; border: 1px solid #3a3a48; color: #666;
  cursor: pointer; user-select: none; flex-shrink: 0;
}
.sp-esc:hover { color: #c0bdb8; }

/* ── Results ──────────────────────────────────────────────────────────────── */
.sp-results { flex: 1; overflow-y: auto; padding: 8px 8px; overscroll-behavior: contain; }

.sp-group { margin-bottom: 4px; }
.sp-group-label {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .08em; color: #555; padding: 8px 10px 4px;
}

.sp-item {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: 10px 12px; border-radius: 8px;
  background: none; border: none; cursor: pointer;
  text-align: left; transition: background .1s;
  gap: 8px;
}
.sp-item:hover, .sp-item--active { background: #1e1e2e; }

.sp-item-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
.sp-item-icon { width: 17px; height: 17px; color: #888; flex-shrink: 0; }
.sp-item--active .sp-item-icon { color: #6366f1; }

.sp-item-label { font-size: 14px; color: #d8d4ce; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sp-item--active .sp-item-label { color: #f0ece6; }

.sp-item-hint { font-size: 12px; color: #555; white-space: nowrap; flex-shrink: 0; }

.sp-empty { text-align: center; color: #555; font-size: 14px; padding: 32px 16px; }

/* ── Footer ───────────────────────────────────────────────────────────────── */
.sp-footer {
  display: flex; gap: 16px; padding: 10px 16px;
  border-top: 1px solid #1e1e28;
  flex-shrink: 0;
}
.sp-footer-tip { font-size: 11px; color: #555; display: flex; align-items: center; gap: 4px; }
.sp-footer-tip kbd {
  font-size: 10px; padding: 1px 5px; border-radius: 4px;
  background: #1e1e28; border: 1px solid #3a3a48; color: #777;
}
</style>
