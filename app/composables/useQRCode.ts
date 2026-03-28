import { useDebounceFn } from '@vueuse/core'
import type { QRCodeConfig } from '~/types'

export const useQRCode = () => {
  const config = ref<QRCodeConfig>({
    url: 'https://yourbusiness.com',
    size: 300,
    foregroundColor: '#0f172a',
    backgroundColor: '#ffffff',
    style: 'square',
    errorCorrection: 'M',
  })

  const qrDataUrl = ref<string>('')
  const generating = ref(false)

  const generateQRCode = async () => {
    generating.value = true
    try {
      // Use the server-side API for QR generation
      const res = await $fetch<{ dataUrl: string }>('/api/qrcode/generate', {
        method: 'POST',
        body: config.value,
      })
      qrDataUrl.value = res.dataUrl
    } catch (e) {
      console.error('QR generation failed:', e)
    } finally {
      generating.value = false
    }
  }

  const downloadQR = (format: 'png' | 'svg' = 'png') => {
    if (!qrDataUrl.value) return
    const link = document.createElement('a')
    link.download = `qrcode-ilytat.${format}`
    link.href = qrDataUrl.value
    link.click()
  }

  // Auto-generate when config changes
  const debouncedGenerate = useDebounceFn(generateQRCode, 400)

  watch(config, debouncedGenerate, { deep: true })

  return {
    config,
    qrDataUrl,
    generating,
    generateQRCode,
    downloadQR,
  }
}
