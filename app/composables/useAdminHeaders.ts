import { useFirebaseAuth } from '~/utils/firebase'

export async function useAdminHeaders(): Promise<Record<string, string>> {
  const auth  = useFirebaseAuth()
  const token = await auth.currentUser?.getIdToken()
  if (!token) return {}
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  const session = sessionStorage.getItem('totp-session')
  if (session) headers['X-TOTP-Session'] = session
  return headers
}
