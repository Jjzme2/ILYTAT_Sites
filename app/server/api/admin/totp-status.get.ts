import { requireAdmin, getTotpSecret } from '~/server/utils/verifyAdmin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event, { skipTotp: true })
  const secret = await getTotpSecret()
  return { enabled: !!secret }
})
