<script setup lang="ts">
useHead({ title: 'Free QR Code Generator — ILYTAT Sites' })

const { config, qrDataUrl, generating, generateQRCode, downloadQR } = useQRCode()

const colorPresets = [
  { fg: '#0f172a', bg: '#ffffff', label: 'Classic' },
  { fg: '#f97316', bg: '#0f172a', label: 'Brand' },
  { fg: '#6366f1', bg: '#ffffff', label: 'Purple' },
  { fg: '#10b981', bg: '#ffffff', label: 'Green' },
  { fg: '#ef4444', bg: '#ffffff', label: 'Red' },
  { fg: '#ffffff', bg: '#1e3a5f', label: 'Navy' },
]

const qrTypes = [
  { id: 'url', label: 'Website URL', placeholder: 'https://yourbusiness.com', icon: 'i-heroicons-globe-alt' },
  { id: 'phone', label: 'Phone Number', placeholder: 'tel:+15551234567', icon: 'i-heroicons-phone' },
  { id: 'email', label: 'Email', placeholder: 'mailto:hello@yourbusiness.com', icon: 'i-heroicons-envelope' },
  { id: 'wifi', label: 'WiFi', placeholder: 'WIFI:T:WPA;S:NetworkName;P:password;;', icon: 'i-heroicons-wifi' },
]

const selectedType = ref('url')

onMounted(() => {
  generateQRCode()
})
</script>

<template>
  <div class="pt-28 pb-24">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="text-center mb-12">
        <div class="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 mb-6">
          <span class="text-orange-300 text-sm font-medium">Free Tool</span>
        </div>
        <h1 class="font-display text-5xl sm:text-6xl font-bold text-white mb-4">
          QR Code Generator
        </h1>
        <p class="text-slate-400 text-xl max-w-xl mx-auto">
          Create a custom QR code for your business in seconds. Free, no account needed.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <!-- Config Panel -->
        <div class="space-y-6">
          <!-- QR Type -->
          <div class="glass border border-white/5 rounded-2xl p-6">
            <h3 class="font-semibold text-white mb-4">What should this QR code link to?</h3>
            <div class="grid grid-cols-2 gap-2 mb-4">
              <button
                v-for="type in qrTypes"
                :key="type.id"
                :class="[
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  selectedType === type.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10',
                ]"
                @click="selectedType = type.id"
              >
                <UIcon :name="type.icon" class="w-4 h-4" />
                {{ type.label }}
              </button>
            </div>
            <input
              v-model="config.url"
              type="text"
              :placeholder="qrTypes.find((t) => t.id === selectedType)?.placeholder"
              class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all text-sm"
            />
          </div>

          <!-- Colors -->
          <div class="glass border border-white/5 rounded-2xl p-6">
            <h3 class="font-semibold text-white mb-4">Colors</h3>

            <!-- Presets -->
            <div class="flex flex-wrap gap-2 mb-4">
              <button
                v-for="preset in colorPresets"
                :key="preset.label"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 hover:border-white/20 transition-colors"
                :style="{ background: preset.bg, color: preset.fg }"
                @click="() => { config.foregroundColor = preset.fg; config.backgroundColor = preset.bg }"
              >
                {{ preset.label }}
              </button>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs text-slate-400 mb-2 block">Foreground</label>
                <div class="flex items-center gap-3">
                  <input
                    v-model="config.foregroundColor"
                    type="color"
                    class="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent"
                  />
                  <input
                    v-model="config.foregroundColor"
                    type="text"
                    class="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-2 block">Background</label>
                <div class="flex items-center gap-3">
                  <input
                    v-model="config.backgroundColor"
                    type="color"
                    class="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent"
                  />
                  <input
                    v-model="config.backgroundColor"
                    type="text"
                    class="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Size & Quality -->
          <div class="glass border border-white/5 rounded-2xl p-6">
            <h3 class="font-semibold text-white mb-4">Size & Quality</h3>
            <div class="space-y-4">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-sm text-slate-400">Size</label>
                  <span class="text-orange-400 text-sm font-mono">{{ config.size }}px</span>
                </div>
                <input
                  v-model.number="config.size"
                  type="range"
                  min="150"
                  max="800"
                  step="50"
                  class="w-full accent-orange-500"
                />
              </div>
              <div>
                <label class="text-sm text-slate-400 mb-2 block">Error Correction</label>
                <div class="grid grid-cols-4 gap-2">
                  <button
                    v-for="level in ['L', 'M', 'Q', 'H']"
                    :key="level"
                    :class="[
                      'py-2 rounded-lg text-sm font-medium transition-all',
                      config.errorCorrection === level
                        ? 'bg-orange-500 text-white'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10',
                    ]"
                    @click="config.errorCorrection = level as 'L' | 'M' | 'Q' | 'H'"
                  >
                    {{ level }}
                  </button>
                </div>
                <p class="text-xs text-slate-500 mt-2">Higher = more damage-resistant (good for logo overlay)</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Preview Panel -->
        <div class="lg:sticky lg:top-28">
          <div class="glass border border-white/5 rounded-2xl p-8">
            <h3 class="font-semibold text-white mb-6 text-center">Preview</h3>

            <!-- QR Preview -->
            <div class="flex items-center justify-center mb-6">
              <div
                class="relative rounded-2xl overflow-hidden shadow-2xl"
                :style="{ background: config.backgroundColor, padding: '24px' }"
              >
                <div v-if="generating" class="w-[200px] h-[200px] flex items-center justify-center">
                  <div class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <img
                  v-else-if="qrDataUrl"
                  :src="qrDataUrl"
                  alt="QR Code"
                  class="block"
                  style="width: 200px; height: 200px; image-rendering: pixelated;"
                />
                <div v-else class="w-[200px] h-[200px] flex items-center justify-center text-slate-500 text-sm">
                  Enter a URL above
                </div>
              </div>
            </div>

            <!-- Download buttons -->
            <div class="space-y-3">
              <button
                :disabled="!qrDataUrl || generating"
                class="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all"
                @click="downloadQR('png')"
              >
                <UIcon name="i-heroicons-arrow-down-tray" class="w-5 h-5" />
                Download PNG
              </button>
              <button
                class="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-medium py-3 rounded-xl transition-all border border-white/10 text-sm"
                @click="generateQRCode"
              >
                <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
                Regenerate
              </button>
            </div>

            <!-- Upsell -->
            <div class="mt-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <p class="text-sm text-orange-200 mb-3 font-medium">
                Want your logo inside the QR code?
              </p>
              <p class="text-xs text-slate-400 mb-3">
                Our branded QR package includes logo embedding, custom shapes, and print-ready files for just $49.
              </p>
              <NuxtLink
                to="/order/qrcode/qrcode-branded"
                class="text-xs text-orange-400 hover:text-orange-300 font-semibold transition-colors"
              >
                Upgrade to Branded QR →
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
