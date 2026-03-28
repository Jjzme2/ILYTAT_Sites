import { z } from 'zod'
import QRCode from 'qrcode'

const schema = z.object({
  url: z.string().min(1),
  size: z.number().min(100).max(1000).default(300),
  foregroundColor: z.string().default('#000000'),
  backgroundColor: z.string().default('#ffffff'),
  errorCorrection: z.enum(['L', 'M', 'Q', 'H']).default('M'),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = schema.parse(body)

  const dataUrl = await QRCode.toDataURL(data.url, {
    width: data.size,
    margin: 2,
    color: {
      dark: data.foregroundColor,
      light: data.backgroundColor,
    },
    errorCorrectionLevel: data.errorCorrection,
  })

  return { dataUrl }
})
