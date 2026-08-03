<script setup lang="ts">
import {
  useFirebaseAuth,
  useFirebaseApp,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  type User,
  type ActionCodeSettings,
} from '~/utils/firebase'
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  orderBy,
  query,
} from 'firebase/firestore'

definePageMeta({ layout: false })

useHead({
  title: 'Admin — ILYTAT',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

// ── Auth ──────────────────────────────────────────────────────────────────────
const user = ref<User | null>(null)
const loginEmail = ref('')
const loginPassword = ref('')
const loginError = ref('')
const loginLoading = ref(false)
const showPassword = ref(false)

// TOTP 2FA state
const totpEnabled   = ref(false)  // whether 2FA is configured on the server
const totpStep      = ref(false)  // true = waiting for TOTP code after Firebase auth
const totpCode      = ref('')
const totpVerified  = ref(false)  // cleared on logout

// Magic sign-in link
const magicLinkMode    = ref(false)
const magicLinkEmail   = ref('')
const magicLinkSent    = ref(false)
const magicLinkLoading = ref(false)
const magicLinkError   = ref('')

// TOTP setup state (security tab)
const totpSetupQr      = ref('')
const totpSetupSecret  = ref('')
const totpSetupCode    = ref('')
const totpSetupLoading = ref(false)
const totpSetupError   = ref('')
const totpSetupSuccess = ref('')

// Global error banner — any failed write/read surfaces here
const adminError = ref('')
function showError(msg: string) {
  adminError.value = msg
  setTimeout(() => { adminError.value = '' }, 8000)
}

// ── Toast ────────────────────────────────────────────────────────────────────
const toast = useToast()

// ── Phone (never rendered publicly — accessible here via command palette) ────
const _ph = [55, 48, 56, 54, 50, 55, 49, 56, 53, 52]
const _phoneNumber = String.fromCharCode(..._ph)
const phoneFormatted = `(${_phoneNumber.slice(0, 3)}) ${_phoneNumber.slice(3, 6)}-${_phoneNumber.slice(6)}`

async function copyPhone() {
  await navigator.clipboard.writeText(_phoneNumber)
  toast.add({ title: 'Phone number copied', description: phoneFormatted, icon: 'i-heroicons-clipboard-document-check', duration: 3000 })
}

// ── Firestore health check ──────────────────────────────────────────────────
const healthResult = ref<null | Record<string, unknown>>(null)
const healthLoading = ref(false)
async function runHealthCheck() {
  healthLoading.value = true
  healthResult.value = null
  try {
    healthResult.value = await $fetch('/api/admin/health', { headers: await getAdminHeaders() })
  }
  catch (e: unknown) {
    healthResult.value = { ok: false, tokenError: apiErrorMessage(e) }
  }
  finally {
    healthLoading.value = false
  }
}

onMounted(() => {
  const auth = useFirebaseAuth()
  onAuthStateChanged(auth, (u) => {
    user.value = u
    if (u) {
      checkTotpStatus().then(() => {
        if (!totpEnabled.value || totpVerified.value) loadAll()
      })
    }
  })
  window.addEventListener('keydown', onGlobalKeydown)
  handleMagicLinkCallback()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
})

async function login() {
  loginError.value = ''
  loginLoading.value = true
  try {
    await signInWithEmailAndPassword(useFirebaseAuth(), loginEmail.value, loginPassword.value)
    // onAuthStateChanged fires and sets user.value; then we check TOTP status.
  }
  catch (e: unknown) {
    loginError.value = 'Invalid email or password.'
    console.error(e)
  }
  finally {
    loginLoading.value = false
  }
}

async function checkTotpStatus() {
  try {
    const h   = await getAdminHeaders()
    const res = await $fetch<{ enabled: boolean }>('/api/admin/totp-status', { headers: h })
    totpEnabled.value = res.enabled
    if (res.enabled) {
      // Check if we already have a valid session from a previous login this tab session
      const existing = sessionStorage.getItem('totp-session')
      if (existing) {
        totpVerified.value = true
      }
      else {
        totpStep.value = true
      }
    }
  }
  catch {
    // If the status check fails, proceed without 2FA
    totpEnabled.value = false
  }
}

async function submitTotp() {
  totpSetupError.value = ''
  try {
    const h   = await getAdminHeaders()
    const res = await $fetch<{ sessionToken: string }>('/api/admin/totp-verify', {
      method: 'POST',
      headers: h,
      body: { code: totpCode.value },
    })
    sessionStorage.setItem('totp-session', res.sessionToken)
    totpVerified.value = true
    totpStep.value = false
    loadAll()
  }
  catch {
    loginError.value = 'Invalid code — check your authenticator app and try again.'
  }
}

async function logout() {
  sessionStorage.removeItem('totp-session')
  totpVerified.value = false
  totpStep.value     = false
  totpEnabled.value  = false
  totpCode.value     = ''
  await signOut(useFirebaseAuth())
  user.value = null
}

// ── Magic sign-in link ────────────────────────────────────────────────────────
const MAGIC_LINK_EMAIL_KEY = 'admin-magic-email'

async function sendMagicLink() {
  magicLinkLoading.value = true
  magicLinkError.value   = ''
  try {
    const config = useRuntimeConfig()
    const actionCodeSettings: ActionCodeSettings = {
      url:             `${config.public.siteUrl}/admin`,
      handleCodeInApp: true,
    }
    await sendSignInLinkToEmail(useFirebaseAuth(), magicLinkEmail.value, actionCodeSettings)
    localStorage.setItem(MAGIC_LINK_EMAIL_KEY, magicLinkEmail.value)
    magicLinkSent.value = true
  }
  catch (e: unknown) {
    magicLinkError.value = apiErrorMessage(e, 'Failed to send sign-in link')
  }
  finally {
    magicLinkLoading.value = false
  }
}

// Called on mount — completes the sign-in if the URL contains a magic link.
async function handleMagicLinkCallback() {
  const auth = useFirebaseAuth()
  if (!isSignInWithEmailLink(auth, window.location.href)) return
  let email = localStorage.getItem(MAGIC_LINK_EMAIL_KEY)
  if (!email) {
    email = window.prompt('Please enter your email to complete sign-in:') ?? ''
  }
  if (!email) return
  try {
    await signInWithEmailLink(auth, email, window.location.href)
    localStorage.removeItem(MAGIC_LINK_EMAIL_KEY)
    // Clean the link params from the URL
    window.history.replaceState({}, document.title, '/admin')
  }
  catch (e: unknown) {
    loginError.value = 'Magic link sign-in failed — it may have expired. Try again.'
    console.error(e)
  }
}

// ── Firestore helpers ─────────────────────────────────────────────────────────
function db() {
  return getFirestore(useFirebaseApp())
}

const getAdminHeaders = useAdminHeaders

// ── Tab state ─────────────────────────────────────────────────────────────────
const activeTab = ref<'dashboard' | 'portfolio' | 'promotions' | 'testimonials' | 'inquiries' | 'analytics' | 'health' | 'docs' | 'logs' | 'blog' | 'security'>('dashboard')

// ── Internal Docs ─────────────────────────────────────────────────────────────
interface DocEntry { key: string; name: string; lastModified?: string }

const internalDocs = ref<DocEntry[]>([])
const docsLoading = ref(false)
const selectedDocKey = ref<string | null>(null)
const docContent = ref<string | null>(null)
const docContentLoading = ref(false)

async function loadDocs() {
  docsLoading.value = true
  try {
    internalDocs.value = await $fetch<DocEntry[]>('/api/admin/docs', { headers: await getAdminHeaders() })
    if (internalDocs.value.length && !selectedDocKey.value) {
      await selectDoc(internalDocs.value[0].key)
    }
  }
  catch (e: unknown) {
    showError(`Failed to load docs: ${apiErrorMessage(e)}`)
  }
  finally {
    docsLoading.value = false
  }
}

async function selectDoc(key: string) {
  selectedDocKey.value = key
  docContent.value = null
  docContentLoading.value = true
  try {
    const res = await $fetch<{ html: string }>(`/api/admin/docs/content?key=${encodeURIComponent(key)}`, { headers: await getAdminHeaders() })
    docContent.value = res.html
  }
  catch (e: unknown) {
    showError(`Failed to load document: ${apiErrorMessage(e)}`)
  }
  finally {
    docContentLoading.value = false
  }
}

// ── Portfolio ─────────────────────────────────────────────────────────────────
interface Project {
  id: string
  title: string
  description: string
  industry: string
  url?: string
  imageUrl?: string
  order: number
  visible: boolean
}

const projects = ref<Project[]>([])
const newProject = reactive({ title: '', description: '', industry: '', url: '', imageUrl: '', order: 99, visible: true })
const savingProject = ref(false)
const addImagePreview = ref('')
const editImagePreview = ref('')

// Debounced image preview so we don't flicker on every keystroke
let _addPreviewTimer: ReturnType<typeof setTimeout> | undefined
let _editPreviewTimer: ReturnType<typeof setTimeout> | undefined
watch(() => newProject.imageUrl, (val) => {
  clearTimeout(_addPreviewTimer)
  _addPreviewTimer = setTimeout(() => { addImagePreview.value = val }, 600)
})

const editingProjectId = ref<string | null>(null)
const editProject = reactive({ title: '', description: '', industry: '', url: '', imageUrl: '', order: 99, visible: true })
const savingEditProject = ref(false)

function startEditProject(p: Project) {
  editingProjectId.value = p.id
  Object.assign(editProject, {
    title: p.title,
    description: p.description,
    industry: p.industry,
    url: p.url ?? '',
    imageUrl: p.imageUrl ?? '',
    order: p.order,
    visible: p.visible,
  })
  editImagePreview.value = p.imageUrl ?? ''
  // Watch for URL changes while the edit form is open
  clearTimeout(_editPreviewTimer)
  watch(() => editProject.imageUrl, (val) => {
    clearTimeout(_editPreviewTimer)
    _editPreviewTimer = setTimeout(() => { editImagePreview.value = val }, 600)
  }, { flush: 'sync' })
}

function cancelEditProject() {
  editingProjectId.value = null
}

async function saveEditProject(id: string) {
  savingEditProject.value = true
  try {
    await updateDoc(doc(db(), 'projects', id), {
      title: editProject.title,
      description: editProject.description,
      industry: editProject.industry,
      url: editProject.url || null,
      imageUrl: editProject.imageUrl || null,
      order: Number(editProject.order),
      visible: editProject.visible,
    })
    editingProjectId.value = null
    await loadProjects()
  }
  catch (e: unknown) {
    showError(`Failed to update project: ${apiErrorMessage(e)}`)
  }
  finally {
    savingEditProject.value = false
  }
}

async function loadProjects() {
  try {
    const snap = await getDocs(query(collection(db(), 'projects'), orderBy('order')))
    projects.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as Project))
  }
  catch (e: unknown) {
    showError(`Failed to load projects: ${apiErrorMessage(e)}`)
  }
}

async function addProject() {
  savingProject.value = true
  try {
    await addDoc(collection(db(), 'projects'), {
      title: newProject.title,
      description: newProject.description,
      industry: newProject.industry,
      url: newProject.url || null,
      imageUrl: newProject.imageUrl || null,
      order: Number(newProject.order),
      visible: newProject.visible,
    })
    Object.assign(newProject, { title: '', description: '', industry: '', url: '', imageUrl: '', order: 99, visible: true })
    await loadProjects()
  }
  catch (e: unknown) {
    showError(`Failed to save project: ${apiErrorMessage(e)}`)
  }
  finally {
    savingProject.value = false
  }
}

async function toggleProjectVisible(p: Project) {
  try {
    await updateDoc(doc(db(), 'projects', p.id), { visible: !p.visible })
    await loadProjects()
  }
  catch (e: unknown) {
    showError(`Failed to update project: ${apiErrorMessage(e)}`)
  }
}

async function moveProject(p: Project, dir: 'up' | 'down') {
  const idx = projects.value.findIndex(x => x.id === p.id)
  const swapIdx = dir === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= projects.value.length) return
  const swap = projects.value[swapIdx]
  try {
    await Promise.all([
      updateDoc(doc(db(), 'projects', p.id), { order: swap.order }),
      updateDoc(doc(db(), 'projects', swap.id), { order: p.order }),
    ])
    await loadProjects()
  }
  catch (e: unknown) {
    showError(`Failed to reorder: ${apiErrorMessage(e)}`)
  }
}

async function deleteProject(id: string) {
  if (!confirm('Delete this project?')) return
  try {
    await deleteDoc(doc(db(), 'projects', id))
    await loadProjects()
  }
  catch (e: unknown) {
    showError(`Failed to delete project: ${apiErrorMessage(e)}`)
  }
}

// ── Promotions ────────────────────────────────────────────────────────────────
interface Promotion {
  id: string
  message: string
  ctaText?: string
  ctaUrl?: string
  active: boolean
  expiresAt?: string
}

const promotions = ref<Promotion[]>([])
const newPromo = reactive({ message: '', ctaText: '', ctaUrl: '', expiresAt: '' })
const savingPromo = ref(false)

async function loadPromotions() {
  try {
    const snap = await getDocs(collection(db(), 'promotions'))
    promotions.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as Promotion))
  }
  catch (e: unknown) {
    showError(`Failed to load promotions: ${apiErrorMessage(e)}`)
  }
}

async function addPromotion() {
  savingPromo.value = true
  try {
    await addDoc(collection(db(), 'promotions'), {
      message: newPromo.message,
      ctaText: newPromo.ctaText || null,
      ctaUrl: newPromo.ctaUrl || null,
      active: true,
      expiresAt: newPromo.expiresAt ? new Date(newPromo.expiresAt).toISOString() : null,
    })
    Object.assign(newPromo, { message: '', ctaText: '', ctaUrl: '', expiresAt: '' })
    await loadPromotions()
  }
  catch (e: unknown) {
    showError(`Failed to save promotion: ${apiErrorMessage(e)}`)
  }
  finally {
    savingPromo.value = false
  }
}

const editingPromoId = ref<string | null>(null)
const editPromo = reactive({ message: '', ctaText: '', ctaUrl: '', expiresAt: '' })
const savingEditPromo = ref(false)

function startEditPromo(p: Promotion) {
  editingPromoId.value = p.id
  Object.assign(editPromo, {
    message: p.message,
    ctaText: p.ctaText ?? '',
    ctaUrl: p.ctaUrl ?? '',
    // datetime-local expects "YYYY-MM-DDTHH:mm"; slice ISO string to fit
    expiresAt: p.expiresAt ? p.expiresAt.slice(0, 16) : '',
  })
}

function cancelEditPromo() { editingPromoId.value = null }

async function saveEditPromo(id: string) {
  savingEditPromo.value = true
  try {
    await updateDoc(doc(db(), 'promotions', id), {
      message: editPromo.message,
      ctaText: editPromo.ctaText || null,
      ctaUrl: editPromo.ctaUrl || null,
      expiresAt: editPromo.expiresAt ? new Date(editPromo.expiresAt).toISOString() : null,
    })
    editingPromoId.value = null
    await loadPromotions()
  }
  catch (e: unknown) {
    showError(`Failed to update promotion: ${apiErrorMessage(e)}`)
  }
  finally {
    savingEditPromo.value = false
  }
}

async function togglePromoActive(p: Promotion) {
  try {
    await updateDoc(doc(db(), 'promotions', p.id), { active: !p.active })
    await loadPromotions()
  }
  catch (e: unknown) {
    showError(`Failed to update promotion: ${apiErrorMessage(e)}`)
  }
}

async function deletePromotion(id: string) {
  if (!confirm('Delete this promotion?')) return
  try {
    await deleteDoc(doc(db(), 'promotions', id))
    await loadPromotions()
  }
  catch (e: unknown) {
    showError(`Failed to delete promotion: ${apiErrorMessage(e)}`)
  }
}

// ── Testimonials ──────────────────────────────────────────────────────────────
interface Testimonial {
  id: string
  name: string
  businessName: string
  quote: string
  visible: boolean
  order: number
}

const testimonials = ref<Testimonial[]>([])
const newTestimonial = reactive({ name: '', businessName: '', quote: '', order: 99, visible: true })
const savingTestimonial = ref(false)

async function loadTestimonials() {
  try {
    const snap = await getDocs(query(collection(db(), 'testimonials'), orderBy('order')))
    testimonials.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as Testimonial))
  }
  catch (e: unknown) {
    showError(`Failed to load testimonials: ${apiErrorMessage(e)}`)
  }
}

async function addTestimonial() {
  savingTestimonial.value = true
  try {
    await addDoc(collection(db(), 'testimonials'), {
      name: newTestimonial.name,
      businessName: newTestimonial.businessName,
      quote: newTestimonial.quote,
      order: Number(newTestimonial.order),
      visible: newTestimonial.visible,
    })
    Object.assign(newTestimonial, { name: '', businessName: '', quote: '', order: 99, visible: true })
    await loadTestimonials()
  }
  catch (e: unknown) {
    showError(`Failed to save testimonial: ${apiErrorMessage(e)}`)
  }
  finally {
    savingTestimonial.value = false
  }
}

const editingTestimonialId = ref<string | null>(null)
const editTestimonial = reactive({ name: '', businessName: '', quote: '', order: 99, visible: true })
const savingEditTestimonial = ref(false)

function startEditTestimonial(t: Testimonial) {
  editingTestimonialId.value = t.id
  Object.assign(editTestimonial, {
    name: t.name,
    businessName: t.businessName,
    quote: t.quote,
    order: t.order,
    visible: t.visible,
  })
}

function cancelEditTestimonial() { editingTestimonialId.value = null }

async function saveEditTestimonial(id: string) {
  savingEditTestimonial.value = true
  try {
    await updateDoc(doc(db(), 'testimonials', id), {
      name: editTestimonial.name,
      businessName: editTestimonial.businessName,
      quote: editTestimonial.quote,
      order: Number(editTestimonial.order),
      visible: editTestimonial.visible,
    })
    editingTestimonialId.value = null
    await loadTestimonials()
  }
  catch (e: unknown) {
    showError(`Failed to update testimonial: ${apiErrorMessage(e)}`)
  }
  finally {
    savingEditTestimonial.value = false
  }
}

async function toggleTestimonialVisible(t: Testimonial) {
  await updateDoc(doc(db(), 'testimonials', t.id), { visible: !t.visible })
  await loadTestimonials()
}

async function moveTestimonial(t: Testimonial, dir: 'up' | 'down') {
  const idx = testimonials.value.findIndex(x => x.id === t.id)
  const swapIdx = dir === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= testimonials.value.length) return
  const swap = testimonials.value[swapIdx]
  try {
    await Promise.all([
      updateDoc(doc(db(), 'testimonials', t.id), { order: swap.order }),
      updateDoc(doc(db(), 'testimonials', swap.id), { order: t.order }),
    ])
    await loadTestimonials()
  }
  catch (e: unknown) {
    showError(`Failed to reorder: ${apiErrorMessage(e)}`)
  }
}

async function deleteTestimonial(id: string) {
  if (!confirm('Delete this testimonial?')) return
  await deleteDoc(doc(db(), 'testimonials', id))
  await loadTestimonials()
}

// ── Inquiries ─────────────────────────────────────────────────────────────────
interface Inquiry {
  id: string
  name: string
  businessName: string
  email: string
  phone?: string
  service: string
  message: string
  status: string
  createdAt: string
}

const inquiries = ref<Inquiry[]>([])

async function loadInquiries() {
  try {
    const snap = await getDocs(collection(db(), 'inquiries'))
    inquiries.value = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Inquiry))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
  catch (e: unknown) {
    showError(`Failed to load inquiries: ${apiErrorMessage(e)}`)
  }
}

async function deleteInquiry(id: string) {
  if (!confirm('Delete this inquiry? This cannot be undone.')) return
  try {
    await deleteDoc(doc(db(), 'inquiries', id))
    await loadInquiries()
  }
  catch (e: unknown) {
    showError(`Failed to delete inquiry: ${apiErrorMessage(e)}`)
  }
}

async function markInquiryRead(id: string) {
  try {
    await updateDoc(doc(db(), 'inquiries', id), { status: 'read' })
    await loadInquiries()
  }
  catch (e: unknown) {
    showError(`Failed to update inquiry: ${apiErrorMessage(e)}`)
  }
}

// ── Load all on auth ──────────────────────────────────────────────────────────
async function loadAll() {
  await Promise.all([loadProjects(), loadPromotions(), loadTestimonials(), loadInquiries()])
}

// ── Analytics ─────────────────────────────────────────────────────────────────
interface AnalyticsSummary {
  windowDays: number
  total: number
  truncated: boolean
  pageViews30: number
  pageViews7: number
  pageViews1: number
  sessions30: number
  sessions7: number
  submits30: number
  conversionRate: number
  errorCount7d: number
  day30Counts: Record<string, number>
  day7Counts: Record<string, number>
  day1Counts: Record<string, number>
  series: Array<{ date: string; views: number; sessions: number }>
  topPages: Array<{ key: string; count: number }>
  topReferrers: Array<{ key: string; count: number }>
  devices: Record<string, number>
  ctaBreakdown: Record<string, number>
  toolUse: Record<string, number>
  clientErrors: Array<{ id: string; message: string; path: string; repeats: number; createdAt: string }>
  recent: Array<{ id: string; event: string; properties: Record<string, unknown>; path: string; sessionId: string; createdAt: string }>
  error?: string
}

const analytics = ref<AnalyticsSummary | null>(null)
const analyticsLoading = ref(false)

/** Tallest bar in the daily series, floored at 1 so an empty chart still renders. */
const seriesPeak = computed(() =>
  Math.max(1, ...(analytics.value?.series ?? []).map(d => d.views)),
)

async function loadAnalytics() {
  analyticsLoading.value = true
  try {
    analytics.value = await $fetch<AnalyticsSummary>('/api/analytics/summary', { headers: await getAdminHeaders() })
  }
  catch (e: unknown) {
    showError(`Analytics load failed: ${apiErrorMessage(e)}`)
  }
  finally {
    analyticsLoading.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'analytics' && !analytics.value) loadAnalytics()
  if (tab === 'docs' && !internalDocs.value.length) loadDocs()
  if (tab === 'logs' && !appLogs.value.length) loadLogs()
  if (tab === 'security' && !spamAttempts.value.length) loadSpamAttempts()
})

// ── App Logs ──────────────────────────────────────────────────────────────────
interface AppLog {
  id:        string
  level:     string
  area:      string
  message:   string
  data:      string | null
  priority:  number
  createdAt: string
}

const appLogs       = ref<AppLog[]>([])
const logsLoading   = ref(false)
const logsFilter    = ref<'all' | 'critical' | 'error' | 'warn' | 'info'>('all')

const LEVEL_COLOR: Record<string, string> = {
  critical: 'var(--status-bad)',
  error:    '#ea580c',
  warn:     'var(--status-warn)',
  info:     '#6b7280',
}

const filteredLogs = computed(() =>
  logsFilter.value === 'all'
    ? appLogs.value
    : appLogs.value.filter(l => l.level === logsFilter.value),
)

async function loadLogs() {
  logsLoading.value = true
  try {
    const snap = await getDocs(
      query(collection(db(), 'logs'), orderBy('createdAt', 'desc')),
    )
    appLogs.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppLog))
  }
  catch (e: unknown) {
    showError(`Failed to load logs: ${apiErrorMessage(e)}`)
  }
  finally {
    logsLoading.value = false
  }
}

// ── Security / Spam Attempts ──────────────────────────────────────────────────
interface SpamAttempt {
  id:        string
  reason:    'honeypot' | 'turnstile' | 'gibberish'
  email:     string
  name:      string
  ip:        string
  userAgent: string
  createdAt: string
}

const spamAttempts        = ref<SpamAttempt[]>([])
const spamLoading         = ref(false)

const SPAM_REASON_LABEL: Record<SpamAttempt['reason'], string> = {
  honeypot:  'Honeypot filled',
  turnstile: 'Bot check failed',
  gibberish: 'Gibberish content',
}

const SPAM_REASON_COLOR: Record<SpamAttempt['reason'], string> = {
  honeypot:  '#7c3aed',
  turnstile: 'var(--status-bad)',
  gibberish: 'var(--status-warn)',
}

async function loadSpamAttempts() {
  spamLoading.value = true
  try {
    const res = await $fetch<{ attempts: SpamAttempt[] }>(
      '/api/admin/spam-attempts',
      { headers: await getAdminHeaders() },
    )
    spamAttempts.value = res.attempts
  }
  catch (e: unknown) {
    showError(`Failed to load spam attempts: ${apiErrorMessage(e)}`)
  }
  finally {
    spamLoading.value = false
  }
}

async function deleteSpamAttempt(id: string) {
  if (!confirm('Delete this blocked attempt record? This cannot be undone.')) return
  try {
    await deleteDoc(doc(db(), 'spamAttempts', id))
    spamAttempts.value = spamAttempts.value.filter(a => a.id !== id)
  }
  catch (e: unknown) {
    showError(`Failed to delete spam record: ${apiErrorMessage(e)}`)
  }
}

// ── TOTP Setup ────────────────────────────────────────────────────────────────
async function totpGenerateSecret() {
  totpSetupLoading.value = true
  totpSetupError.value   = ''
  totpSetupSuccess.value = ''
  try {
    const res = await $fetch<{ secret: string; qrDataUrl: string }>('/api/admin/totp-setup', {
      method: 'POST',
      headers: await getAdminHeaders(),
      body: { action: 'generate' },
    })
    totpSetupSecret.value = res.secret
    totpSetupQr.value     = res.qrDataUrl
    totpSetupCode.value   = ''
  }
  catch (e: unknown) {
    totpSetupError.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    totpSetupLoading.value = false
  }
}

async function totpSaveSecret() {
  totpSetupLoading.value = true
  totpSetupError.value   = ''
  try {
    await $fetch('/api/admin/totp-setup', {
      method: 'POST',
      headers: await getAdminHeaders(),
      body: { action: 'save', secret: totpSetupSecret.value, code: totpSetupCode.value },
    })
    totpEnabled.value      = true
    totpSetupSuccess.value = '2FA enabled! You will be asked for a code on your next login.'
    totpSetupQr.value      = ''
    totpSetupSecret.value  = ''
    totpSetupCode.value    = ''
  }
  catch (e: unknown) {
    totpSetupError.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    totpSetupLoading.value = false
  }
}

async function totpDisable() {
  if (!confirm('Disable 2FA? This will remove the TOTP secret.')) return
  totpSetupLoading.value = true
  totpSetupError.value   = ''
  try {
    await $fetch('/api/admin/totp-setup', {
      method: 'POST',
      headers: await getAdminHeaders(),
      body: { action: 'disable' },
    })
    totpEnabled.value      = false
    totpVerified.value     = false
    sessionStorage.removeItem('totp-session')
    totpSetupSuccess.value = '2FA has been disabled.'
  }
  catch (e: unknown) {
    totpSetupError.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    totpSetupLoading.value = false
  }
}

// ── Command Palette ────────────────────────────────────────────────────────────
interface PaletteCommand {
  id: string
  group: 'Navigate' | 'Actions'
  label: string
  action: () => void
}

const paletteOpen   = ref(false)
const paletteQuery  = ref('')
const paletteIdx    = ref(0)
const paletteInput  = ref<HTMLInputElement | null>(null)

const ALL_COMMANDS: PaletteCommand[] = [
  { id: 'nav-dashboard',    group: 'Navigate', label: 'Go to Dashboard',    action: () => { activeTab.value = 'dashboard' } },
  { id: 'nav-portfolio',    group: 'Navigate', label: 'Go to Portfolio',    action: () => { activeTab.value = 'portfolio' } },
  { id: 'nav-promotions',   group: 'Navigate', label: 'Go to Promotions',   action: () => { activeTab.value = 'promotions' } },
  { id: 'nav-testimonials', group: 'Navigate', label: 'Go to Testimonials', action: () => { activeTab.value = 'testimonials' } },
  { id: 'nav-inquiries',    group: 'Navigate', label: 'Go to Inquiries',    action: () => { activeTab.value = 'inquiries' } },
  { id: 'nav-analytics',    group: 'Navigate', label: 'Go to Analytics',    action: () => { activeTab.value = 'analytics' } },
  { id: 'nav-logs',         group: 'Navigate', label: 'Go to Logs',         action: () => { activeTab.value = 'logs' } },
  { id: 'nav-health',       group: 'Navigate', label: 'Go to Health Check', action: () => { activeTab.value = 'health' } },
  { id: 'nav-docs',         group: 'Navigate', label: 'Go to Docs',         action: () => { activeTab.value = 'docs' } },
  { id: 'nav-blog',         group: 'Navigate', label: 'Go to Blog',          action: () => { activeTab.value = 'blog' } },
  { id: 'nav-security',    group: 'Navigate', label: 'Go to Security',       action: () => { activeTab.value = 'security' } },
  { id: 'run-health',       group: 'Actions',  label: 'Run Health Check',   action: () => { activeTab.value = 'health'; nextTick(runHealthCheck) } },
  { id: 'refresh-analytics',group: 'Actions',  label: 'Refresh Analytics',  action: () => { activeTab.value = 'analytics'; nextTick(loadAnalytics) } },
  { id: 'refresh-logs',     group: 'Actions',  label: 'Refresh Logs',       action: () => { activeTab.value = 'logs'; nextTick(loadLogs) } },
  { id: 'refresh-security', group: 'Actions', label: 'Refresh Security Log', action: () => { activeTab.value = 'security'; nextTick(loadSpamAttempts) } },
  { id: 'copy-phone',       group: 'Contact',  label: 'Copy Phone Number',  action: () => copyPhone() },
  { id: 'call-phone',       group: 'Contact',  label: 'Call / Text',        action: () => { window.location.href = `tel:+1${_phoneNumber}` } },
  { id: 'signout',          group: 'Actions',  label: 'Sign Out',           action: () => logout() },
]

const paletteFiltered = computed(() => {
  const q = paletteQuery.value.trim().toLowerCase()
  if (!q) return ALL_COMMANDS
  return ALL_COMMANDS.filter(c =>
    c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q),
  )
})

const paletteGrouped = computed(() => {
  const groups: Partial<Record<PaletteCommand['group'], PaletteCommand[]>> = {}
  for (const cmd of paletteFiltered.value) {
    ;(groups[cmd.group] ??= []).push(cmd)
  }
  return groups
})

watch(paletteQuery, () => { paletteIdx.value = 0 })

function openPalette() {
  paletteOpen.value  = true
  paletteQuery.value = ''
  paletteIdx.value   = 0
  nextTick(() => paletteInput.value?.focus())
}

function closePalette() { paletteOpen.value = false }

function runPaletteCommand(cmd: PaletteCommand) {
  closePalette()
  cmd.action()
}

function onPaletteKey(e: KeyboardEvent) {
  const len = paletteFiltered.value.length
  if (e.key === 'ArrowDown')  { e.preventDefault(); paletteIdx.value = (paletteIdx.value + 1) % len }
  else if (e.key === 'ArrowUp')   { e.preventDefault(); paletteIdx.value = (paletteIdx.value - 1 + len) % len }
  else if (e.key === 'Enter')     { const cmd = paletteFiltered.value[paletteIdx.value]; if (cmd) runPaletteCommand(cmd) }
  else if (e.key === 'Escape')    { closePalette() }
}

function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    paletteOpen.value ? closePalette() : openPalette()
  }
}
</script>

<template>
  <UToaster />
  <div class="admin-page">
    <!-- Login screen -->
    <div v-if="!user" class="login-screen">
      <p class="admin-logo">ILYTAT<span>.com</span></p>
      <h1>Admin</h1>
      <form class="login-form" @submit.prevent="login">
        <div class="fgroup">
          <label>Email</label>
          <input v-model="loginEmail" type="email" placeholder="you@example.com" required>
        </div>
        <div class="fgroup">
          <label>Password</label>
          <div class="password-field">
            <input v-model="loginPassword" :type="showPassword ? 'text' : 'password'" placeholder="••••••••" required>
            <button type="button" class="pw-toggle" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">
              <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>
              </svg>
            </button>
          </div>
        </div>
        <p v-if="loginError" class="form-error">{{ loginError }}</p>
        <button type="submit" class="submit-btn" :disabled="loginLoading">
          {{ loginLoading ? 'Signing in…' : 'Sign In' }}
        </button>
      </form>

      <div class="login-divider"><span>or</span></div>

      <!-- Magic link -->
      <div v-if="!magicLinkMode && !magicLinkSent">
        <button class="magic-link-btn" @click="magicLinkMode = true">Email me a sign-in link</button>
      </div>
      <form v-else-if="magicLinkMode && !magicLinkSent" class="login-form" style="margin-top:0;" @submit.prevent="sendMagicLink">
        <div class="fgroup">
          <label>Your email</label>
          <input v-model="magicLinkEmail" type="email" placeholder="you@example.com" required>
        </div>
        <p v-if="magicLinkError" class="form-error">{{ magicLinkError }}</p>
        <div style="display:flex;gap:8px;align-items:center;">
          <button type="submit" class="submit-btn" :disabled="magicLinkLoading">
            {{ magicLinkLoading ? 'Sending…' : 'Send Link' }}
          </button>
          <button type="button" class="back-link" style="display:inline;margin-top:0;" @click="magicLinkMode = false">Cancel</button>
        </div>
      </form>
      <div v-else-if="magicLinkSent" style="background:color-mix(in srgb, var(--status-good) 7%, transparent);border:1px solid color-mix(in srgb, var(--status-good) 20%, transparent);border-radius:8px;padding:14px 16px;margin-top:4px;">
        <p style="font-size:13px;color:var(--status-good);margin:0;line-height:1.6;">
          Link sent to <strong>{{ magicLinkEmail }}</strong>. Check your inbox and click the link to sign in.
        </p>
      </div>

      <a href="/" class="back-link">← Back to site</a>
    </div>

    <!-- 2FA step — shown after Firebase auth when TOTP is enabled -->
    <div v-else-if="totpStep" class="login-screen">
      <p class="admin-logo">ILYTAT<span>.com</span></p>
      <h1>Two-Factor Auth</h1>
      <p style="font-size:13px;color:var(--theme-text-body);margin-bottom:24px;line-height:1.6;">Enter the 6-digit code from your authenticator app.</p>
      <form class="login-form" @submit.prevent="submitTotp">
        <div class="fgroup">
          <label>Authenticator Code</label>
          <input
            v-model="totpCode"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            placeholder="000000"
            maxlength="6"
            pattern="\d{6}"
            style="letter-spacing:6px;font-size:22px;text-align:center;font-family:'Space Mono',monospace;"
            required
          >
        </div>
        <p v-if="loginError" class="form-error">{{ loginError }}</p>
        <button type="submit" class="submit-btn">Verify</button>
      </form>
      <button class="back-link" style="background:none;border:none;cursor:pointer;" @click="logout">← Back to sign in</button>
    </div>

    <!-- Admin dashboard — only shown after both Firebase auth and TOTP are cleared -->
    <div v-else-if="user && (!totpEnabled || totpVerified)" class="dashboard">
      <header class="dash-header">
        <a href="/" class="admin-logo">ILYTAT<span>.com</span></a>
        <nav class="dash-tabs">
          <button
            v-for="tab in ['dashboard', 'portfolio', 'promotions', 'testimonials', 'inquiries', 'analytics', 'logs', 'health', 'docs', 'blog', 'security']" :key="tab"
            class="dash-tab" :class="{ active: activeTab === (tab as typeof activeTab) }"
            @click="activeTab = (tab as typeof activeTab)">
            {{ tab }}
          </button>
        </nav>
        <button class="palette-trigger" title="Command palette" @click="openPalette">
          <span>⌘K</span>
        </button>
        <button class="logout-btn" @click="logout">Sign out</button>
      </header>

      <!-- Global error banner -->
      <div v-if="adminError" style="background:color-mix(in srgb, var(--status-bad) 14%, transparent);color:var(--status-bad);border-bottom:1px solid color-mix(in srgb, var(--status-bad) 30%, transparent);padding:10px 20px;font-size:13px;font-family:monospace;white-space:pre-wrap;position:sticky;top:0;z-index:100;">
        ⚠ {{ adminError }}
      </div>

      <!-- ── DASHBOARD tab ── -->
      <section v-if="activeTab === 'dashboard'" class="dash-section" style="max-width:960px;">
        <h2>Overview</h2>
        <p class="dash-hint">Here's a quick look at what's happening. New inquiries are highlighted — reply directly from here.</p>

        <!-- Stats -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px;">
          <div class="record-card" style="text-align:center;padding:16px 12px;">
            <p style="font-size:32px;font-weight:700;margin:0;" :style="{ color: inquiries.filter(i => i.status === 'new').length > 0 ? 'var(--theme-accent)' : 'var(--status-good)' }">
              {{ inquiries.filter(i => i.status === 'new').length }}
            </p>
            <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--theme-text-body);margin:4px 0 0;">New inquiries</p>
          </div>
          <div class="record-card" style="text-align:center;padding:16px 12px;">
            <p style="font-size:32px;font-weight:700;margin:0;color:var(--theme-accent);">{{ inquiries.length }}</p>
            <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--theme-text-body);margin:4px 0 0;">Total inquiries</p>
          </div>
          <div class="record-card" style="text-align:center;padding:16px 12px;">
            <p style="font-size:32px;font-weight:700;margin:0;color:var(--theme-accent);">{{ projects.filter(p => p.visible).length }}</p>
            <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--theme-text-body);margin:4px 0 0;">Live projects</p>
          </div>
          <div class="record-card" style="text-align:center;padding:16px 12px;">
            <p style="font-size:32px;font-weight:700;margin:0;color:var(--theme-accent);">{{ testimonials.filter(t => t.visible).length }}</p>
            <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--theme-text-body);margin:4px 0 0;">Testimonials</p>
          </div>
        </div>

        <!-- New inquiries -->
        <div v-if="inquiries.filter(i => i.status === 'new').length" class="record-card" style="margin-bottom:20px;">
          <p style="font-size:11px;font-weight:700;color:var(--theme-accent);margin:0 0 14px;text-transform:uppercase;letter-spacing:1px;">🔔 Needs a reply</p>
          <div style="display:flex;flex-direction:column;gap:0;">
            <div
              v-for="inq in inquiries.filter(i => i.status === 'new').slice(0, 5)"
              :key="inq.id"
              style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--theme-surface-alt);"
            >
              <div style="min-width:0;">
                <p style="margin:0;font-size:13px;font-weight:600;color:var(--theme-fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ inq.name }} — {{ inq.businessName }}</p>
                <p style="margin:3px 0 0;font-size:11px;color:var(--theme-text-muted);">{{ inq.service || 'General inquiry' }} · {{ inq.email }}</p>
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0;margin-top:1px;">
                <a :href="`mailto:${inq.email}`" class="submit-btn" style="padding:4px 12px;font-size:11px;text-decoration:none;">Reply →</a>
                <button class="badge-btn badge-off" style="font-size:11px;" @click="markInquiryRead(inq.id)">Done</button>
              </div>
            </div>
          </div>
          <button class="badge-btn badge-off" style="margin-top:12px;font-size:12px;" @click="activeTab = 'inquiries'">View all inquiries →</button>
        </div>

        <!-- Recent inquiries (all, when no unread) -->
        <div v-else-if="inquiries.length" class="record-card" style="margin-bottom:20px;">
          <p style="font-size:11px;font-weight:700;color:var(--theme-text-body);margin:0 0 14px;text-transform:uppercase;letter-spacing:1px;">Recent inquiries</p>
          <div style="display:flex;flex-direction:column;gap:0;">
            <div
              v-for="inq in inquiries.slice(0, 3)"
              :key="inq.id"
              style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--theme-surface-alt);"
            >
              <div style="min-width:0;">
                <p style="margin:0;font-size:13px;font-weight:600;color:var(--theme-fg);">{{ inq.name }} — {{ inq.businessName }}</p>
                <p style="margin:3px 0 0;font-size:11px;color:var(--theme-text-muted);">{{ inq.service || 'General inquiry' }} · {{ new Date(inq.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}</p>
              </div>
              <a :href="`mailto:${inq.email}`" class="badge-btn badge-off" style="font-size:11px;flex-shrink:0;text-decoration:none;margin-top:1px;">Reply →</a>
            </div>
          </div>
          <button class="badge-btn badge-off" style="margin-top:12px;font-size:12px;" @click="activeTab = 'inquiries'">View all inquiries →</button>
        </div>

        <div v-else class="record-card" style="margin-bottom:20px;text-align:center;padding:32px 20px;">
          <p style="font-size:14px;color:var(--theme-text-muted);margin:0;">No inquiries yet. Share your contact form link to start getting leads.</p>
        </div>

        <!-- Quick actions -->
        <div class="record-card">
          <p style="font-size:10px;font-weight:700;color:var(--theme-text-muted);margin:0 0 14px;text-transform:uppercase;letter-spacing:1px;">Quick actions</p>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            <button class="submit-btn" style="padding:8px 16px;font-size:12px;" @click="activeTab = 'inquiries'">All Inquiries</button>
            <button class="badge-btn badge-off" style="font-size:12px;" @click="activeTab = 'portfolio'">Portfolio</button>
            <button class="badge-btn badge-off" style="font-size:12px;" @click="activeTab = 'testimonials'">Testimonials</button>
            <button class="badge-btn badge-off" style="font-size:12px;" @click="activeTab = 'promotions'">Promotions</button>
            <button class="badge-btn badge-off" style="font-size:12px;" @click="activeTab = 'blog'">Blog</button>
            <button class="badge-btn badge-off" style="font-size:12px;" @click="activeTab = 'analytics'">Analytics</button>
            <button class="badge-btn badge-off" style="font-size:12px;" @click="activeTab = 'logs'">Logs</button>
          </div>
        </div>
      </section>

      <!-- ── ANALYTICS tab ── -->
      <section v-if="activeTab === 'analytics'" class="dash-section">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <h2 class="dash-title" style="margin:0">Analytics</h2>
          <button class="submit-btn" style="padding:6px 14px;font-size:12px;" :disabled="analyticsLoading" @click="loadAnalytics">
            {{ analyticsLoading ? 'Loading…' : 'Refresh' }}
          </button>
        </div>

        <div v-if="analyticsLoading && !analytics" style="color:var(--theme-text-body);font-size:13px;">Loading analytics…</div>

        <div v-else-if="analytics">
          <!-- Error from API -->
          <div v-if="analytics.error" style="background:color-mix(in srgb, var(--status-bad) 14%, transparent);color:var(--status-bad);border:1px solid color-mix(in srgb, var(--status-bad) 30%, transparent);padding:10px 14px;border-radius:6px;font-size:13px;margin-bottom:20px;">
            ⚠ {{ analytics.error }}
          </div>

          <!-- Truncation notice — the numbers below are a floor, not a total -->
          <div v-if="analytics.truncated" style="background:color-mix(in srgb, var(--status-warn) 14%, transparent);color:var(--status-warn);border:1px solid color-mix(in srgb, var(--status-warn) 30%, transparent);padding:10px 14px;border-radius:6px;font-size:13px;margin-bottom:20px;">
            Hit the {{ analytics.total }}-event read limit — figures below cover only the most recent events in the window, so treat them as a minimum.
          </div>

          <!-- ── Summary cards ── -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:24px;">
            <div class="record-card" style="text-align:center;padding:16px 12px;">
              <p style="font-size:28px;font-weight:700;margin:0;color:var(--theme-accent);">{{ analytics.pageViews30 }}</p>
              <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--theme-text-body);margin:4px 0 0;">Page views<br><span style="font-size:10px;">({{ analytics.windowDays }} days · {{ analytics.pageViews1 }} today)</span></p>
            </div>
            <div class="record-card" style="text-align:center;padding:16px 12px;">
              <p style="font-size:28px;font-weight:700;margin:0;color:var(--theme-accent);">{{ analytics.sessions30 }}</p>
              <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--theme-text-body);margin:4px 0 0;">Visitors<br><span style="font-size:10px;">({{ analytics.sessions7 }} in last 7 days)</span></p>
            </div>
            <div class="record-card" style="text-align:center;padding:16px 12px;">
              <p style="font-size:28px;font-weight:700;margin:0;color:var(--status-good);">{{ analytics.submits30 }}</p>
              <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--theme-text-body);margin:4px 0 0;">Contact submits<br><span style="font-size:10px;">({{ analytics.windowDays }} days)</span></p>
            </div>
            <div class="record-card" style="text-align:center;padding:16px 12px;">
              <p style="font-size:28px;font-weight:700;margin:0;color:var(--status-good);">{{ analytics.conversionRate }}%</p>
              <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--theme-text-body);margin:4px 0 0;">Visitor → inquiry<br><span style="font-size:10px;">(share who made contact)</span></p>
            </div>
            <div class="record-card" style="text-align:center;padding:16px 12px;">
              <p style="font-size:28px;font-weight:700;margin:0;" :style="{ color: analytics.errorCount7d ? 'var(--status-bad)' : 'var(--theme-text-muted)' }">{{ analytics.errorCount7d }}</p>
              <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--theme-text-body);margin:4px 0 0;">Errors logged<br><span style="font-size:10px;">(last 7 days)</span></p>
            </div>
          </div>

          <!-- ── Daily traffic ── -->
          <div class="record-card" style="margin-bottom:20px;">
            <p class="dash-hint" style="font-weight:600;margin-bottom:14px;">Page views — last {{ analytics.windowDays }} days (peak {{ seriesPeak }})</p>
            <div style="display:flex;align-items:flex-end;gap:2px;height:110px;">
              <div
                v-for="d in analytics.series"
                :key="d.date"
                :title="`${d.date} — ${d.views} views, ${d.sessions} visitors`"
                style="flex:1;min-width:3px;border-radius:2px 2px 0 0;background:var(--theme-accent);transition:height .3s;"
                :style="{
                  height: Math.max(2, Math.round(d.views / seriesPeak * 100)) + '%',
                  opacity: d.views ? 0.85 : 0.18,
                }"
              />
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:10px;color:var(--theme-text-muted);font-family:monospace;">
              <span>{{ analytics.series[0]?.date }}</span>
              <span>{{ analytics.series[analytics.series.length - 1]?.date }}</span>
            </div>
          </div>

          <!-- ── Top pages / referrers / devices ── -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-bottom:20px;">
            <div class="record-card">
              <p class="dash-hint" style="font-weight:600;margin-bottom:12px;">Top pages</p>
              <div v-if="analytics.topPages.length" style="display:flex;flex-direction:column;gap:4px;">
                <div v-for="p in analytics.topPages" :key="p.key" style="display:flex;justify-content:space-between;gap:10px;padding:5px 9px;border-radius:4px;background:var(--glass-card-bg);font-size:12.5px;">
                  <span style="font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ p.key || '/' }}</span>
                  <span style="color:var(--theme-accent);font-weight:600;">{{ p.count }}</span>
                </div>
              </div>
              <p v-else style="color:var(--theme-text-muted);font-size:13px;margin:0;">No page views recorded yet.</p>
            </div>

            <div class="record-card">
              <p class="dash-hint" style="font-weight:600;margin-bottom:12px;">Where visitors came from</p>
              <div v-if="analytics.topReferrers.length" style="display:flex;flex-direction:column;gap:4px;">
                <div v-for="r in analytics.topReferrers" :key="r.key" style="display:flex;justify-content:space-between;gap:10px;padding:5px 9px;border-radius:4px;background:var(--glass-card-bg);font-size:12.5px;">
                  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ r.key }}</span>
                  <span style="color:var(--theme-accent);font-weight:600;">{{ r.count }}</span>
                </div>
              </div>
              <p v-else style="color:var(--theme-text-muted);font-size:13px;margin:0;">No referrer data yet.</p>
            </div>

            <div class="record-card">
              <p class="dash-hint" style="font-weight:600;margin-bottom:12px;">Devices</p>
              <div v-if="Object.keys(analytics.devices).length" style="display:flex;flex-direction:column;gap:4px;">
                <div v-for="[dev, cnt] in Object.entries(analytics.devices).sort((a,b) => (b[1] as number) - (a[1] as number))" :key="dev" style="display:flex;justify-content:space-between;gap:10px;padding:5px 9px;border-radius:4px;background:var(--glass-card-bg);font-size:12.5px;">
                  <span style="text-transform:capitalize;">{{ dev }}</span>
                  <span style="color:var(--theme-accent);font-weight:600;">{{ cnt }}</span>
                </div>
              </div>
              <p v-else style="color:var(--theme-text-muted);font-size:13px;margin:0;">No device data yet.</p>
            </div>
          </div>

          <!-- ── Free tool usage ── -->
          <div v-if="Object.keys(analytics.toolUse).length" class="record-card" style="margin-bottom:20px;">
            <p class="dash-hint" style="font-weight:600;margin-bottom:12px;">Free tool runs ({{ analytics.windowDays }} days)</p>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              <span v-for="[tool, cnt] in Object.entries(analytics.toolUse).sort((a,b) => (b[1] as number) - (a[1] as number))" :key="tool" style="padding:6px 12px;border-radius:5px;background:var(--glass-card-bg);font-size:12.5px;">
                <span style="font-family:monospace;">{{ tool }}</span>
                <strong style="color:var(--theme-accent);margin-left:8px;">{{ cnt }}</strong>
              </span>
            </div>
          </div>

          <!-- ── Browser errors ── -->
          <div v-if="analytics.clientErrors.length" class="record-card" style="margin-bottom:20px;border-color:color-mix(in srgb, var(--status-bad) 30%, transparent);">
            <p class="dash-hint" style="font-weight:600;margin-bottom:4px;color:var(--status-bad);">Browser errors (last 7 days)</p>
            <p class="dash-hint" style="margin-bottom:12px;">JavaScript failures reported by real visitors' browsers. These break the page for whoever hit them.</p>
            <div style="display:flex;flex-direction:column;gap:4px;">
              <div v-for="err in analytics.clientErrors" :key="err.id" style="padding:7px 10px;border-radius:4px;background:var(--glass-card-bg);font-size:12.5px;">
                <div style="display:flex;justify-content:space-between;gap:10px;">
                  <span style="font-family:monospace;color:var(--status-bad);word-break:break-word;">{{ err.message }}</span>
                  <span style="color:var(--theme-text-muted);white-space:nowrap;font-size:11px;">{{ new Date(err.createdAt).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) }}</span>
                </div>
                <span style="color:var(--theme-text-muted);font-size:11px;font-family:monospace;">{{ err.path || 'unknown page' }}<template v-if="err.repeats"> · +{{ err.repeats }} more</template></span>
              </div>
            </div>
          </div>

          <!-- ── CTA breakdown ── -->
          <div v-if="analytics.ctaBreakdown && Object.keys(analytics.ctaBreakdown).length" class="record-card" style="margin-bottom:20px;">
            <p class="dash-hint" style="font-weight:600;margin-bottom:12px;">CTA clicks by label ({{ analytics.windowDays }} days)</p>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <div
                v-for="[label, count] in Object.entries(analytics.ctaBreakdown).sort((a,b) => (b[1] as number) - (a[1] as number))"
                :key="label"
                style="display:flex;align-items:center;gap:10px;"
              >
                <span style="width:120px;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ label }}</span>
                <div style="flex:1;background:var(--glass-card-bg);border-radius:4px;height:20px;overflow:hidden;">
                  <div
                    style="height:100%;background:var(--theme-accent);border-radius:4px;transition:width 0.4s;"
                    :style="{ width: Math.round((count as number) / Math.max(...Object.values(analytics.ctaBreakdown) as number[]) * 100) + '%' }"
                  />
                </div>
                <span style="font-size:13px;color:var(--theme-text-body);width:24px;text-align:right;">{{ count }}</span>
              </div>
            </div>
          </div>

          <!-- ── Event counts (last 7 days) ── -->
          <div class="record-card" style="margin-bottom:20px;">
            <p class="dash-hint" style="font-weight:600;margin-bottom:12px;">All events — last 7 days</p>
            <div v-if="Object.keys(analytics.day7Counts).length" style="display:flex;flex-direction:column;gap:4px;">
              <div
                v-for="[evt, cnt] in Object.entries(analytics.day7Counts).sort((a,b) => (b[1] as number) - (a[1] as number))"
                :key="evt"
                style="display:flex;justify-content:space-between;padding:6px 10px;border-radius:4px;background:var(--glass-card-bg);font-size:13px;"
              >
                <span style="font-family:monospace;color:var(--theme-fg);">{{ evt }}</span>
                <span style="color:var(--theme-accent);font-weight:600;">{{ cnt }}</span>
              </div>
            </div>
            <p v-else style="color:var(--theme-text-muted);font-size:13px;">No events in the last 7 days.</p>
          </div>

          <!-- ── Recent events feed ── -->
          <div class="record-card">
            <p class="dash-hint" style="font-weight:600;margin-bottom:12px;">Recent events (last 60)</p>
            <div style="display:flex;flex-direction:column;gap:2px;max-height:480px;overflow-y:auto;">
              <div
                v-for="e in analytics.recent"
                :key="e.id"
                class="analytics-event-row"
              >
                <span style="color:var(--theme-text-muted);font-family:monospace;">{{ new Date(e.createdAt).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) }}</span>
                <span style="font-family:monospace;color:var(--theme-accent);font-weight:600;">{{ e.event }}</span>
                <span style="color:var(--theme-text-body);word-break:break-all;">{{ Object.keys(e.properties).length ? JSON.stringify(e.properties) : '' }}</span>
              </div>
            </div>
          </div>
        </div>

        <p v-else style="color:var(--theme-text-body);font-size:13px;">Click Refresh to load analytics data.</p>
      </section>

      <!-- ── LOGS tab ── -->
      <section v-if="activeTab === 'logs'" class="dash-section" style="max-width:1000px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;flex-wrap:wrap;">
          <h2 class="dash-title" style="margin:0;">App Logs</h2>
          <button class="submit-btn" style="padding:6px 14px;font-size:12px;" :disabled="logsLoading" @click="loadLogs">
            {{ logsLoading ? 'Loading…' : 'Refresh' }}
          </button>
          <!-- Level filter -->
          <div style="display:flex;gap:4px;margin-left:auto;">
            <button
              v-for="lvl in ['all','critical','error','warn','info']" :key="lvl"
              style="padding:5px 12px;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;text-transform:uppercase;letter-spacing:.5px;border:1px solid transparent;transition:all .15s;"
              :style="{
                background: logsFilter === lvl ? 'color-mix(in srgb, var(--theme-accent) 15%, transparent)' : 'var(--glass-card-bg)',
                borderColor: logsFilter === lvl ? 'color-mix(in srgb, var(--theme-accent) 40%, transparent)' : 'var(--theme-surface-alt)',
                color: logsFilter === lvl ? 'var(--theme-accent)' : 'var(--theme-text-muted)',
              }"
              @click="logsFilter = (lvl as typeof logsFilter)"
            >{{ lvl }}</button>
          </div>
        </div>
        <p class="dash-hint">Structured log entries written by all server-side handlers. Sorted newest first.</p>

        <div v-if="logsLoading && !appLogs.length" style="color:var(--theme-text-body);font-size:13px;">Loading logs…</div>

        <div v-else-if="!filteredLogs.length" class="empty-state">
          {{ appLogs.length ? 'No logs match the selected filter.' : 'No logs yet — they appear here once the app starts writing them.' }}
        </div>

        <div v-else style="display:flex;flex-direction:column;gap:2px;">
          <div
            v-for="entry in filteredLogs" :key="entry.id"
            class="log-entry"
          >
            <!-- Timestamp -->
            <span style="color:var(--theme-text-muted);font-family:monospace;font-size:11px;">
              {{ new Date(entry.createdAt).toLocaleString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' }) }}
            </span>
            <!-- Level badge -->
            <span
              style="display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;text-align:center;"
              :style="{ background: LEVEL_COLOR[entry.level] + '22', color: LEVEL_COLOR[entry.level], border: '1px solid ' + LEVEL_COLOR[entry.level] + '44' }"
            >{{ entry.level }}</span>
            <!-- Area -->
            <span style="font-family:monospace;color:var(--theme-text-body);font-size:11px;">[{{ entry.area }}]</span>
            <!-- Message + data -->
            <div>
              <span style="color:var(--theme-fg);">{{ entry.message }}</span>
              <span v-if="entry.data" style="display:block;margin-top:3px;font-family:monospace;font-size:10px;color:var(--theme-text-muted);word-break:break-all;">{{ entry.data }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ── HEALTH tab ── -->
      <section v-if="activeTab === 'health'" class="dash-section">
        <h2 class="dash-title">Firestore Health Check</h2>
        <p class="dash-hint">Tests service account auth, a round-trip write/read, and read access for every collection.</p>
        <button class="submit-btn" style="margin-bottom:20px" :disabled="healthLoading" @click="runHealthCheck">
          {{ healthLoading ? 'Running…' : 'Run Health Check' }}
        </button>
        <!-- AI provider status, read at a glance. Previously the only way to
             learn whether a key was configured was to trigger a generation
             and read the failure. -->
        <div
          v-if="healthResult?.ai"
          class="glass-card rounded-[var(--radius)] p-5 mb-4 flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <UIcon
              :name="(healthResult.ai as Record<string, unknown>).configured ? 'i-heroicons-check-circle' : 'i-heroicons-exclamation-triangle'"
              class="w-5 h-5"
              :class="(healthResult.ai as Record<string, unknown>).configured ? 'text-(--status-good)' : 'text-(--status-bad)'" />
            <span class="font-semibold text-[15px] text-(--theme-fg)">
              AI: {{ (healthResult.ai as Record<string, unknown>).configured ? (healthResult.ai as Record<string, unknown>).primary : 'not configured' }}
            </span>
          </div>
          <p v-if="(healthResult.ai as Record<string, unknown>).model" class="text-[13px] text-(--theme-text-muted)">
            Model: {{ (healthResult.ai as Record<string, unknown>).model }}<template v-if="(healthResult.ai as Record<string, unknown>).fallback"> · fallback: {{ (healthResult.ai as Record<string, unknown>).fallback }}</template> · daily cap: {{ (healthResult.ai as Record<string, unknown>).dailyCap }}
          </p>
          <p v-if="(healthResult.ai as Record<string, unknown>).hint" class="text-[13px] text-(--status-bad)">
            {{ (healthResult.ai as Record<string, unknown>).hint }}
          </p>
        </div>

        <!-- Whether the pricing page is actually following Stripe. Without this,
             "configured" and "working" look identical from the outside — the
             page shows a plausible number either way, which is how the site
             advertised $1,499 while Stripe billed $999. -->
        <div
          v-if="healthResult?.pricing"
          class="glass-card rounded-[var(--radius)] p-5 mb-4 flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <UIcon
              :name="(healthResult.pricing as Record<string, unknown>).ok ? 'i-heroicons-check-circle' : 'i-heroicons-exclamation-triangle'"
              class="w-5 h-5"
              :class="(healthResult.pricing as Record<string, unknown>).ok ? 'text-(--status-good)' : 'text-(--status-warn)'" />
            <span class="font-semibold text-[15px] text-(--theme-fg)">
              Pricing: {{ (healthResult.pricing as Record<string, number>).liveCount }} of {{ (healthResult.pricing as Record<string, number>).totalCount }} following Stripe
            </span>
          </div>
          <div class="flex flex-col gap-1">
            <div
              v-for="t in ((healthResult.pricing as Record<string, unknown>).tiers as Array<Record<string, unknown>>)"
              :key="String(t.label)"
              class="flex items-baseline justify-between gap-3 text-[13px]">
              <span class="text-(--theme-text-body)">{{ t.label }}</span>
              <span class="flex items-baseline gap-2">
                <strong class="text-(--theme-fg)">${{ t.amount }}</strong>
                <span
                  class="font-mono text-[10px] uppercase tracking-[0.08em]"
                  :class="t.source === 'stripe' ? 'text-(--status-good)' : 'text-(--theme-text-muted)'">{{ t.source }}</span>
              </span>
            </div>
          </div>
          <p
            v-for="t in ((healthResult.pricing as Record<string, unknown>).tiers as Array<Record<string, unknown>>).filter(x => x.reason)"
            :key="`r-${t.label}`"
            class="text-[12px] text-(--status-warn)">
            {{ t.label }}: {{ t.reason }}
          </p>
        </div>

        <div v-if="healthResult" style="font-family:monospace;font-size:12px;background:var(--theme-surface-deep);color:var(--theme-text-hi);padding:20px;border-radius:8px;white-space:pre-wrap;overflow-x:auto;">{{ JSON.stringify(healthResult, null, 2) }}</div>
      </section>

      <!-- ── PORTFOLIO tab ── -->
      <section v-if="activeTab === 'portfolio'" class="dash-section">
        <h2>Portfolio Projects</h2>
        <p class="dash-hint">Add real client sites here. Set <code>visible: false</code> to hide while building.</p>

        <div class="record-list">
          <div v-if="!projects.length" class="empty-state">No projects yet.</div>
          <div v-for="p in projects" :key="p.id" class="record-card">
            <!-- Edit mode -->
            <template v-if="editingProjectId === p.id">
              <div
                class="edit-form-inline"
                @keydown.meta.enter.prevent="saveEditProject(p.id)"
                @keydown.ctrl.enter.prevent="saveEditProject(p.id)"
              >
                <div class="form-row">
                  <div class="fgroup">
                    <label>Title</label>
                    <input v-model="editProject.title" type="text" required>
                  </div>
                  <div class="fgroup">
                    <label>Industry</label>
                    <input v-model="editProject.industry" type="text" required>
                  </div>
                </div>
                <div class="fgroup">
                  <label>Description</label>
                  <input v-model="editProject.description" type="text" required>
                </div>
                <div class="form-row">
                  <div class="fgroup">
                    <label>Live URL</label>
                    <input v-model="editProject.url" type="url" placeholder="https://...">
                  </div>
                  <div class="fgroup">
                    <label>Image URL</label>
                    <input v-model="editProject.imageUrl" type="url" placeholder="https://...">
                    <div v-if="editImagePreview" class="image-preview-row">
                      <img :src="editImagePreview" alt="Preview" @error="editImagePreview = ''">
                    </div>
                  </div>
                </div>
                <div class="form-row">
                  <div class="fgroup">
                    <label>Sort Order</label>
                    <input v-model.number="editProject.order" type="number" min="1">
                  </div>
                  <div class="fgroup fgroup--check">
                    <label class="check-label">
                      <input v-model="editProject.visible" type="checkbox">
                      Visible on site
                    </label>
                  </div>
                </div>
                <div class="record-actions" style="margin-top:8px;">
                  <button class="submit-btn" style="padding:6px 16px;font-size:12px;" :disabled="savingEditProject" @click="saveEditProject(p.id)">
                    {{ savingEditProject ? 'Saving…' : 'Save' }}
                  </button>
                  <button class="badge-btn badge-off" style="font-size:12px;" @click="cancelEditProject">Cancel</button>
                </div>
              </div>
            </template>
            <!-- View mode -->
            <template v-else>
              <div class="record-card-inner">
                <!-- Image thumbnail / placeholder -->
                <div class="project-thumb">
                  <img v-if="p.imageUrl" :src="p.imageUrl" :alt="p.title" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">
                  <div v-else class="project-thumb-placeholder">
                    <span style="font-size:20px;opacity:.3;">&#9670;</span>
                    <span style="font-size:10px;color:var(--theme-text-muted);margin-top:4px;">No image</span>
                  </div>
                </div>
                <div class="record-main">
                  <p class="record-title">{{ p.title }}</p>
                  <p class="record-meta">{{ p.industry }} · order {{ p.order }}</p>
                  <p class="record-body">{{ p.description }}</p>
                  <p v-if="p.url" class="record-url"><a :href="/^https?:\/\//i.test(p.url) ? p.url : 'https://' + p.url" target="_blank" rel="noopener noreferrer">{{ p.url }}</a></p>
                </div>
              </div>
              <div class="record-actions">
                <div class="reorder-btns">
                  <button class="reorder-btn" title="Move up" :disabled="projects.indexOf(p) === 0" @click="moveProject(p, 'up')">▲</button>
                  <button class="reorder-btn" title="Move down" :disabled="projects.indexOf(p) === projects.length - 1" @click="moveProject(p, 'down')">▼</button>
                </div>
                <button class="badge-btn badge-off" style="font-size:12px;" @click="startEditProject(p)">Edit</button>
                <button
                  class="badge-btn" :class="p.visible ? 'badge-active' : 'badge-off'"
                  @click="toggleProjectVisible(p)">
                  {{ p.visible ? 'Visible' : 'Hidden' }}
                </button>
                <button class="danger-btn" @click="deleteProject(p.id)">Delete</button>
              </div>
            </template>
          </div>
        </div>

        <form class="add-form" @submit.prevent="addProject">
          <h3>Add Project</h3>
          <div class="form-row">
            <div class="fgroup">
              <label>Title</label>
              <input v-model="newProject.title" type="text" placeholder="Smith's Auto Repair" required>
            </div>
            <div class="fgroup">
              <label>Industry</label>
              <input v-model="newProject.industry" type="text" placeholder="Auto Services" required>
            </div>
          </div>
          <div class="fgroup">
            <label>Description</label>
            <input v-model="newProject.description" type="text" placeholder="Short description for the portfolio card" required>
          </div>
          <div class="form-row">
            <div class="fgroup">
              <label>Live URL (optional)</label>
              <input v-model="newProject.url" type="url" placeholder="https://...">
            </div>
            <div class="fgroup">
              <label>Image URL (optional)</label>
              <input v-model="newProject.imageUrl" type="url" placeholder="https://...">
              <div v-if="addImagePreview" class="image-preview-row">
                <img :src="addImagePreview" alt="Preview" @error="addImagePreview = ''">
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="fgroup">
              <label>Sort Order</label>
              <input v-model.number="newProject.order" type="number" min="1">
            </div>
            <div class="fgroup fgroup--check">
              <label class="check-label">
                <input v-model="newProject.visible" type="checkbox">
                Visible on site
              </label>
            </div>
          </div>
          <button type="submit" class="submit-btn" :disabled="savingProject">
            {{ savingProject ? 'Saving…' : 'Add Project' }}
          </button>
        </form>
      </section>

      <!-- ── PROMOTIONS tab ── -->
      <section v-if="activeTab === 'promotions'" class="dash-section">
        <h2>Promotions</h2>
        <p class="dash-hint">Only the first active, non-expired promotion shows on the site banner.</p>

        <div class="record-list">
          <div v-if="!promotions.length" class="empty-state">No promotions yet.</div>
          <div v-for="p in promotions" :key="p.id" class="record-card">
            <!-- Edit mode -->
            <template v-if="editingPromoId === p.id">
              <div
                class="edit-form-inline"
                @keydown.meta.enter.prevent="saveEditPromo(p.id)"
                @keydown.ctrl.enter.prevent="saveEditPromo(p.id)"
              >
                <div class="fgroup">
                  <label>Banner message</label>
                  <input v-model="editPromo.message" type="text" required>
                </div>
                <div class="form-row">
                  <div class="fgroup">
                    <label>CTA button text</label>
                    <input v-model="editPromo.ctaText" type="text" placeholder="Claim offer">
                  </div>
                  <div class="fgroup">
                    <label>CTA link</label>
                    <input v-model="editPromo.ctaUrl" type="text" placeholder="#contact">
                  </div>
                </div>
                <div class="fgroup">
                  <label>Expiry (optional)</label>
                  <input v-model="editPromo.expiresAt" type="datetime-local">
                </div>
                <div class="record-actions" style="margin-top:8px;">
                  <button class="submit-btn" style="padding:6px 16px;font-size:12px;" :disabled="savingEditPromo" @click="saveEditPromo(p.id)">
                    {{ savingEditPromo ? 'Saving…' : 'Save' }}
                  </button>
                  <button class="badge-btn badge-off" style="font-size:12px;" @click="cancelEditPromo">Cancel</button>
                </div>
              </div>
            </template>
            <!-- View mode -->
            <template v-else>
              <div class="record-main">
                <p class="record-title">{{ p.message }}</p>
                <p class="record-meta">
                  {{ p.ctaText ? `CTA: "${p.ctaText}" → ${p.ctaUrl}` : 'No CTA button' }}
                  {{ p.expiresAt ? ` · expires ${new Date(p.expiresAt).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' })}` : '' }}
                </p>
              </div>
              <div class="record-actions">
                <button class="badge-btn badge-off" style="font-size:12px;" @click="startEditPromo(p)">Edit</button>
                <button class="badge-btn" :class="p.active ? 'badge-active' : 'badge-off'" @click="togglePromoActive(p)">
                  {{ p.active ? 'Active' : 'Inactive' }}
                </button>
                <button class="danger-btn" @click="deletePromotion(p.id)">Delete</button>
              </div>
            </template>
          </div>
        </div>

        <form class="add-form" @submit.prevent="addPromotion">
          <h3>New Promotion</h3>
          <div class="fgroup">
            <label>Banner message</label>
            <input v-model="newPromo.message" type="text" placeholder="20% off new LLC sites this month" required>
          </div>
          <div class="form-row">
            <div class="fgroup">
              <label>CTA button text (optional)</label>
              <input v-model="newPromo.ctaText" type="text" placeholder="Claim offer">
            </div>
            <div class="fgroup">
              <label>CTA link (optional)</label>
              <input v-model="newPromo.ctaUrl" type="text" placeholder="#contact">
            </div>
          </div>
          <div class="fgroup">
            <label>Expiry date (optional)</label>
            <input v-model="newPromo.expiresAt" type="datetime-local">
          </div>
          <button type="submit" class="submit-btn" :disabled="savingPromo">
            {{ savingPromo ? 'Saving…' : 'Add Promotion' }}
          </button>
        </form>
      </section>

      <!-- ── TESTIMONIALS tab ── -->
      <section v-if="activeTab === 'testimonials'" class="dash-section">
        <h2>Testimonials</h2>
        <p class="dash-hint">Get 1–2 quotes from real clients. Even one sentence from a local business owner is powerful.</p>

        <div class="record-list">
          <div v-if="!testimonials.length" class="empty-state">No testimonials yet.</div>
          <div v-for="t in testimonials" :key="t.id" class="record-card">
            <!-- Edit mode -->
            <template v-if="editingTestimonialId === t.id">
              <div
                class="edit-form-inline"
                @keydown.meta.enter.prevent="saveEditTestimonial(t.id)"
                @keydown.ctrl.enter.prevent="saveEditTestimonial(t.id)"
              >
                <div class="form-row">
                  <div class="fgroup">
                    <label>Client name</label>
                    <input v-model="editTestimonial.name" type="text" required>
                  </div>
                  <div class="fgroup">
                    <label>Business name</label>
                    <input v-model="editTestimonial.businessName" type="text" required>
                  </div>
                </div>
                <div class="fgroup">
                  <label>Quote</label>
                  <textarea v-model="editTestimonial.quote" rows="3" required />
                </div>
                <div class="form-row">
                  <div class="fgroup">
                    <label>Sort Order</label>
                    <input v-model.number="editTestimonial.order" type="number" min="1">
                  </div>
                  <div class="fgroup fgroup--check">
                    <label class="check-label">
                      <input v-model="editTestimonial.visible" type="checkbox">
                      Visible on site
                    </label>
                  </div>
                </div>
                <div class="record-actions" style="margin-top:8px;">
                  <button class="submit-btn" style="padding:6px 16px;font-size:12px;" :disabled="savingEditTestimonial" @click="saveEditTestimonial(t.id)">
                    {{ savingEditTestimonial ? 'Saving…' : 'Save' }}
                  </button>
                  <button class="badge-btn badge-off" style="font-size:12px;" @click="cancelEditTestimonial">Cancel</button>
                </div>
              </div>
            </template>
            <!-- View mode -->
            <template v-else>
              <div class="record-main">
                <p class="record-title">{{ t.name }} · {{ t.businessName }}</p>
                <p class="record-body">"{{ t.quote }}"</p>
              </div>
              <div class="record-actions">
                <div class="reorder-btns">
                  <button class="reorder-btn" title="Move up" :disabled="testimonials.indexOf(t) === 0" @click="moveTestimonial(t, 'up')">▲</button>
                  <button class="reorder-btn" title="Move down" :disabled="testimonials.indexOf(t) === testimonials.length - 1" @click="moveTestimonial(t, 'down')">▼</button>
                </div>
                <button class="badge-btn badge-off" style="font-size:12px;" @click="startEditTestimonial(t)">Edit</button>
                <button class="badge-btn" :class="t.visible ? 'badge-active' : 'badge-off'" @click="toggleTestimonialVisible(t)">
                  {{ t.visible ? 'Visible' : 'Hidden' }}
                </button>
                <button class="danger-btn" @click="deleteTestimonial(t.id)">Delete</button>
              </div>
            </template>
          </div>
        </div>

        <form class="add-form" @submit.prevent="addTestimonial">
          <h3>Add Testimonial</h3>
          <div class="form-row">
            <div class="fgroup">
              <label>Client name</label>
              <input v-model="newTestimonial.name" type="text" placeholder="Sarah M." required>
            </div>
            <div class="fgroup">
              <label>Business name</label>
              <input v-model="newTestimonial.businessName" type="text" placeholder="Sarah's Salon" required>
            </div>
          </div>
          <div class="fgroup">
            <label>Quote</label>
            <textarea
v-model="newTestimonial.quote" rows="3"
              placeholder="I had a professional site up in less than a week…" required />
          </div>
          <div class="form-row">
            <div class="fgroup">
              <label>Sort Order</label>
              <input v-model.number="newTestimonial.order" type="number" min="1">
            </div>
            <div class="fgroup fgroup--check">
              <label class="check-label">
                <input v-model="newTestimonial.visible" type="checkbox">
                Visible on site
              </label>
            </div>
          </div>
          <button type="submit" class="submit-btn" :disabled="savingTestimonial">
            {{ savingTestimonial ? 'Saving…' : 'Add Testimonial' }}
          </button>
        </form>
      </section>

      <!-- ── DOCS tab ── -->
      <section v-if="activeTab === 'docs'" class="dash-section" style="max-width: 1200px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
          <h2 class="dash-title" style="margin: 0;">Internal Documents</h2>
          <button class="submit-btn" style="padding: 6px 14px; font-size: 12px;" :disabled="docsLoading" @click="loadDocs">
            {{ docsLoading ? 'Loading…' : 'Refresh' }}
          </button>
        </div>
        <p class="dash-hint">Documents stored under <code>docs/</code> in the R2 internal bucket. Upload new files there to add them here.</p>

        <div v-if="docsLoading && !internalDocs.length" style="color: var(--theme-text-body); font-size: 13px;">Loading documents…</div>

        <div v-else-if="!internalDocs.length" class="empty-state">
          No documents found. Upload HTML files to <code>docs/</code> in the R2 bucket.
        </div>

        <div v-else class="docs-layout">
          <!-- Doc list -->
          <div class="docs-sidebar">
            <div
              v-for="docItem in internalDocs"
              :key="docItem.key"
              style="padding: 10px 14px; cursor: pointer; border-radius: 6px; font-size: 13px; border: 1px solid transparent; transition: all 0.15s;"
              :style="{
                background: selectedDocKey === docItem.key ? 'color-mix(in srgb, var(--theme-accent) 10%, transparent)' : 'var(--glass-card-bg)',
                borderColor: selectedDocKey === docItem.key ? 'color-mix(in srgb, var(--theme-accent) 30%, transparent)' : 'var(--theme-surface-alt)',
                color: selectedDocKey === docItem.key ? 'var(--theme-accent)' : 'var(--theme-text-body)',
              }"
              @click="selectDoc(docItem.key)"
            >
              {{ docItem.name }}
            </div>
          </div>

          <!-- Iframe viewer -->
          <div style="flex: 1; border: 1px solid var(--theme-surface-alt); border-radius: 10px; overflow: hidden; position: relative;">
            <div v-if="docContentLoading" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: var(--theme-surface-alt); color: var(--theme-text-body); font-size: 13px;">
              Loading document…
            </div>
            <iframe
              v-else-if="docContent"
              :srcdoc="docContent"
              sandbox="allow-same-origin allow-scripts"
              style="width: 100%; height: 100%; border: none;"
              title="Internal document viewer"
            />
            <div v-else style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--theme-text-muted); font-size: 13px;">
              Select a document to view
            </div>
          </div>
        </div>
      </section>

      <!-- ── INQUIRIES tab ── -->
      <section v-if="activeTab === 'inquiries'" class="dash-section">
        <h2>Inquiries</h2>
        <p class="dash-hint">All contact form submissions, newest first.</p>

        <!-- Onboarding form quick access -->
        <div class="onboarding-card">
          <div>
            <p style="font-weight:600;margin:0 0 4px;font-size:14px;">Client Onboarding Form</p>
            <p style="font-size:12px;color:var(--theme-text-body);margin:0;">Send this to new clients to collect their requirements, branding assets, and preferences.</p>
          </div>
          <a href="https://tally.so/r/A7D9Ay" target="_blank" rel="noopener noreferrer" class="submit-btn onboarding-btn">
            Open Form ↗
          </a>
        </div>

        <div class="record-list">
          <div v-if="!inquiries.length" class="empty-state">No inquiries yet.</div>
          <div
v-for="inq in inquiries" :key="inq.id" class="record-card"
            :class="{ 'record-card--new': inq.status === 'new' }">
            <div class="record-main">
              <p class="record-title">
                {{ inq.name }} — {{ inq.businessName }}
                <span v-if="inq.status === 'new'" class="new-badge">NEW</span>
              </p>
              <p class="record-meta">
                {{ inq.email }}
                {{ inq.phone ? ` · ${inq.phone}` : '' }}
                · {{ inq.service || 'No package selected' }}
                · {{ new Date(inq.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}
              </p>
              <p class="record-body">{{ inq.message }}</p>
            </div>
            <div class="record-actions">
              <a :href="`mailto:${inq.email}`" class="action-link">Reply →</a>
              <button v-if="inq.status === 'new'" class="badge-btn badge-off" @click="markInquiryRead(inq.id)">Mark read</button>
              <button class="danger-btn" @click="deleteInquiry(inq.id)">Delete</button>
            </div>
          </div>
        </div>
      </section>

      <!-- ── BLOG tab ── -->
      <section v-if="activeTab === 'blog'" class="dash-section" style="max-width:1100px;">
        <BlogAdmin />
      </section>

      <!-- ── SECURITY tab ── -->
      <section v-if="activeTab === 'security'" class="dash-section" style="max-width:1000px;">
        <!-- TOTP 2FA setup -->
        <h2>Two-Factor Authentication</h2>
        <p class="dash-hint">Require a time-based one-time code (Google Authenticator, Authy, etc.) on every admin login.</p>

        <div class="record-card" style="margin-bottom:32px;flex-direction:column;gap:16px;">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <span style="font-size:13px;color:var(--theme-text-body);">Status:</span>
            <span
              style="display:inline-block;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;"
              :style="totpEnabled ? 'background:#16a34a22;color:var(--status-good);border:1px solid var(--status-good)44;' : 'background:var(--status-bad)1a;color:var(--status-bad);border:1px solid var(--status-bad)33;'"
            >{{ totpEnabled ? 'Enabled' : 'Disabled' }}</span>
            <button v-if="!totpEnabled" class="submit-btn" style="padding:6px 14px;font-size:12px;" :disabled="totpSetupLoading" @click="totpGenerateSecret">
              {{ totpSetupLoading ? 'Generating…' : 'Set Up 2FA' }}
            </button>
            <button v-else class="danger-btn" :disabled="totpSetupLoading" @click="totpDisable">
              {{ totpSetupLoading ? 'Disabling…' : 'Disable 2FA' }}
            </button>
          </div>

          <!-- QR code setup flow -->
          <template v-if="totpSetupQr">
            <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;">
              <div>
                <p style="font-size:12px;color:var(--theme-text-body);margin-bottom:8px;">Scan with your authenticator app:</p>
                <img :src="totpSetupQr" alt="TOTP QR code" style="width:160px;height:160px;border-radius:8px;border:1px solid var(--theme-surface-alt);">
              </div>
              <div style="flex:1;min-width:200px;">
                <p style="font-size:12px;color:var(--theme-text-body);margin-bottom:4px;">Or enter the secret manually:</p>
                <code style="font-family:'Space Mono',monospace;font-size:12px;color:var(--theme-accent);word-break:break-all;display:block;margin-bottom:16px;">{{ totpSetupSecret }}</code>
                <div class="fgroup" style="max-width:200px;">
                  <label>Verify — enter the 6-digit code</label>
                  <input
                    v-model="totpSetupCode"
                    type="text"
                    inputmode="numeric"
                    placeholder="000000"
                    maxlength="6"
                    style="letter-spacing:4px;text-align:center;font-family:'Space Mono',monospace;"
                  >
                </div>
                <button class="submit-btn" style="margin-top:12px;" :disabled="totpSetupLoading || totpSetupCode.length !== 6" @click="totpSaveSecret">
                  {{ totpSetupLoading ? 'Saving…' : 'Enable 2FA' }}
                </button>
              </div>
            </div>
          </template>

          <p v-if="totpSetupError" class="form-error">{{ totpSetupError }}</p>
          <p v-if="totpSetupSuccess" style="font-size:13px;color:var(--status-good);">{{ totpSetupSuccess }}</p>
        </div>

        <!-- Security log -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;flex-wrap:wrap;">
          <h2 class="dash-title" style="margin:0;">Security Log</h2>
          <button class="submit-btn" style="padding:6px 14px;font-size:12px;" :disabled="spamLoading" @click="loadSpamAttempts">
            {{ spamLoading ? 'Loading…' : 'Refresh' }}
          </button>
        </div>
        <p class="dash-hint">
          Contact form submissions that were automatically blocked — honeypot triggers, failed bot checks, and gibberish content.
          These were never saved to Inquiries or sent by email.
        </p>

        <div v-if="spamLoading && !spamAttempts.length" style="color:var(--theme-text-body);font-size:13px;">Loading…</div>

        <div v-else-if="!spamAttempts.length" class="empty-state">
          No blocked attempts on record — that's a good sign.
        </div>

        <div v-else style="display:flex;flex-direction:column;gap:6px;">
          <div
            v-for="attempt in spamAttempts"
            :key="attempt.id"
            style="background:var(--glass-card-bg);border:1px solid var(--theme-surface-alt);border-radius:6px;padding:14px 16px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:start;"
          >
            <div>
              <!-- Reason badge + timestamp -->
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
                <span
                  style="display:inline-block;padding:2px 10px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;"
                  :style="{
                    background: SPAM_REASON_COLOR[attempt.reason] + '22',
                    color:      SPAM_REASON_COLOR[attempt.reason],
                    border:     '1px solid ' + SPAM_REASON_COLOR[attempt.reason] + '44',
                  }"
                >{{ SPAM_REASON_LABEL[attempt.reason] }}</span>
                <span style="font-family:monospace;font-size:11px;color:var(--theme-text-muted);">
                  {{ new Date(attempt.createdAt).toLocaleString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' }) }}
                </span>
              </div>

              <!-- Submitted identity -->
              <p style="margin:0 0 4px;font-size:13px;color:var(--theme-fg);">
                <strong>{{ attempt.name || '—' }}</strong>
                <span style="color:var(--theme-text-muted);margin-left:8px;">{{ attempt.email }}</span>
              </p>

              <!-- Network metadata -->
              <p style="margin:0;font-family:monospace;font-size:11px;color:var(--theme-text-muted);word-break:break-all;">
                IP: {{ attempt.ip }}
                <span v-if="attempt.userAgent" style="margin-left:12px;">UA: {{ attempt.userAgent }}</span>
              </p>
            </div>

            <button class="danger-btn" style="flex-shrink:0;" @click="deleteSpamAttempt(attempt.id)">Delete</button>
          </div>
        </div>
      </section>

      <!-- ── Command palette ── -->
      <Teleport to="body">
        <Transition name="palette">
          <div v-if="paletteOpen" class="palette-backdrop" @click.self="closePalette">
            <div class="palette-modal" role="dialog" aria-modal="true" aria-label="Command palette">
              <div class="palette-search">
                <span class="palette-search-icon">⌘</span>
                <input
                  ref="paletteInput"
                  v-model="paletteQuery"
                  type="text"
                  class="palette-input"
                  placeholder="Type a command…"
                  autocomplete="off"
                  spellcheck="false"
                  @keydown="onPaletteKey"
                >
                <kbd class="palette-esc-hint" @click="closePalette">esc</kbd>
              </div>

              <div v-if="paletteFiltered.length" class="palette-list">
                <template v-for="(cmds, group) in paletteGrouped" :key="group">
                  <p class="palette-group-label">{{ group }}</p>
                  <button
                    v-for="cmd in cmds"
                    :key="cmd.id"
                    class="palette-item"
                    :class="{ 'palette-item--active': paletteFiltered.indexOf(cmd) === paletteIdx }"
                    @mouseenter="paletteIdx = paletteFiltered.indexOf(cmd)"
                    @click="runPaletteCommand(cmd)"
                  >
                    {{ cmd.label }}
                  </button>
                </template>
              </div>

              <div v-else class="palette-empty">No commands match "{{ paletteQuery }}"</div>

              <div class="palette-footer">
                <span><kbd>↑↓</kbd> navigate</span>
                <span><kbd>↵</kbd> select</span>
                <span><kbd>esc</kbd> dismiss</span>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  background: var(--theme-bg);
  color: var(--theme-fg);
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
}

/* ── Login ── */
.login-screen {
  max-width: 380px;
  margin: 0 auto;
  padding: 80px 24px;
}

.admin-logo {
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 1px;
  color: var(--theme-fg);
  text-decoration: none;
}

.admin-logo span { color: var(--theme-accent); }

h1 {
  font-family: 'Sora', sans-serif;
  font-size: 28px;
  font-weight: 700;
  margin: 12px 0 32px;
}

.login-form { display: flex; flex-direction: column; gap: 16px; }

.password-field {
  position: relative;
  display: flex;
  align-items: center;
}

.password-field input {
  width: 100%;
  padding-right: 40px;
}

.pw-toggle {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--theme-text-muted);
  padding: 4px;
  line-height: 0;
  transition: color 0.15s;
}

.pw-toggle:hover { color: var(--theme-fg); }

.login-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0 16px;
  color: #3a3840;
  font-size: 12px;
}
.login-divider::before,
.login-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--theme-surface-alt);
}

.magic-link-btn {
  width: 100%;
  background: transparent;
  border: 1px solid var(--theme-surface-alt);
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 13px;
  color: var(--theme-text-body);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.magic-link-btn:hover {
  border-color: color-mix(in srgb, var(--theme-accent) 30%, transparent);
  color: var(--theme-fg);
}

.back-link {
  display: block;
  margin-top: 24px;
  font-size: 13px;
  color: var(--theme-text-muted);
  text-decoration: none;
}
.back-link:hover { color: var(--theme-fg); }

/* ── Dashboard ── */
.dashboard { display: flex; flex-direction: column; min-height: 100vh; }

.dash-header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px 32px;
  border-bottom: 1px solid var(--theme-surface-alt);
  background: var(--theme-bg);
  position: sticky;
  top: 0;
  z-index: 10;
}

.dash-tabs {
  display: flex;
  gap: 4px;
  flex: 1;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  /* Tabs overflow on narrow screens. Padding keeps the first and last from
     sitting flush against the clip edge, scroll-padding keeps a snapped tab
     clear of it, and the mask fades both edges so it reads as scrollable
     rather than cut off. */
  padding-inline: 2px;
  scroll-padding-inline: 12px;
  scroll-snap-type: x proximity;
  mask-image: linear-gradient(to right, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%);
}
.dash-tab { scroll-snap-align: center; }
.dash-tabs::-webkit-scrollbar { display: none; }

.dash-tab {
  padding: 7px 16px;
  border-radius: 6px;
  background: none;
  border: 1px solid transparent;
  color: var(--theme-text-muted);
  cursor: pointer;
  font-size: 13px;
  text-transform: capitalize;
  transition: all 0.15s;
  flex-shrink: 0;
  white-space: nowrap;
}

.dash-tab.active {
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  border-color: color-mix(in srgb, var(--theme-accent) 30%, transparent);
  color: var(--theme-accent);
}

.dash-tab:hover:not(.active) { color: var(--theme-fg); border-color: var(--theme-surface-alt); }

.logout-btn {
  background: none;
  border: 1px solid var(--theme-surface-alt);
  border-radius: 6px;
  padding: 7px 14px;
  color: var(--theme-text-muted);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
}
.logout-btn:hover { border-color: var(--theme-accent); color: var(--theme-accent); }

.palette-trigger {
  background: var(--glass-card-bg);
  border: 1px solid var(--theme-surface-alt);
  border-radius: 6px;
  padding: 6px 10px;
  color: var(--theme-text-ghost);
  cursor: pointer;
  font-size: 11px;
  font-family: 'Space Mono', monospace;
  letter-spacing: 0.5px;
  transition: all 0.15s;
  flex-shrink: 0;
}
.palette-trigger:hover { border-color: color-mix(in srgb, var(--theme-accent) 40%, transparent); color: var(--theme-accent); }

/* ── Command palette ── */
.palette-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 900;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 14vh;
}

.palette-modal {
  width: calc(100% - 32px);
  max-width: 520px;
  background: #18181d;
  border: 1px solid #2e2e38;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px var(--glass-card-bg);
}

.palette-search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid #232328;
}

.palette-search-icon {
  color: var(--theme-text-ghost);
  font-size: 15px;
  flex-shrink: 0;
  line-height: 1;
}

.palette-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--theme-fg);
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  min-width: 0;
}
.palette-input::placeholder { color: var(--glass-card-border); }

.palette-esc-hint {
  background: var(--glass-card-bg);
  border: 1px solid var(--theme-surface-alt);
  color: var(--glass-card-border);
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 10px;
  cursor: pointer;
  font-family: 'Space Mono', monospace;
  flex-shrink: 0;
  transition: color 0.15s;
}
.palette-esc-hint:hover { color: var(--theme-text-muted); }

.palette-list {
  max-height: 320px;
  overflow-y: auto;
  padding: 6px;
  scrollbar-width: thin;
  scrollbar-color: var(--theme-surface-alt) transparent;
}

.palette-group-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--glass-card-border);
  padding: 8px 10px 4px;
  margin: 0;
  font-family: 'Space Mono', monospace;
}

.palette-item {
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  color: var(--theme-text-body);
  padding: 9px 12px;
  border-radius: 7px;
  cursor: pointer;
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  transition: background 0.08s, color 0.08s;
  display: block;
}
.palette-item--active {
  background: color-mix(in srgb, var(--theme-accent) 8%, transparent);
  color: var(--theme-fg);
}

.palette-empty {
  padding: 28px 16px;
  text-align: center;
  color: var(--glass-card-border);
  font-size: 13px;
}

.palette-footer {
  display: flex;
  gap: 16px;
  padding: 10px 16px;
  border-top: 1px solid var(--theme-surface-alt);
  font-size: 11px;
  color: var(--glass-card-border);
}
.palette-footer kbd {
  background: var(--glass-card-bg);
  border: 1px solid var(--theme-surface-alt);
  border-radius: 3px;
  padding: 1px 5px;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  margin-right: 4px;
}

/* Palette open/close transition */
.palette-enter-active,
.palette-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.palette-enter-from,
.palette-leave-to {
  opacity: 0;
  transform: scale(0.97) translateY(-6px);
}

@media (max-width: 640px) {
  .login-screen { padding: 48px 20px; }
  .dash-header { padding: 10px 16px; gap: 6px 12px; flex-wrap: wrap; }
  .dash-tabs { order: 10; width: 100%; flex: none; }
  .logout-btn { margin-left: auto; padding: 6px 10px; font-size: 12px; }
  .dash-tab { padding: 5px 10px; font-size: 12px; }
  .dash-section { padding: 24px 16px 48px; }
  /* Stack record cards vertically on mobile */
  .record-card { flex-direction: column; }
  .record-actions { flex-direction: row; flex-wrap: wrap; align-items: center; }
}

/* ── Section ── */
.dash-section {
  max-width: 840px;
  margin: 0 auto;
  padding: 40px 24px 80px;
  width: 100%;
}

h2 {
  font-family: 'Sora', sans-serif;
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 6px;
}

h3 {
  font-family: 'Sora', sans-serif;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.dash-hint {
  font-size: 13px;
  color: var(--theme-text-muted);
  margin-bottom: 28px;
  line-height: 1.6;
}

/* ── Records ── */
.record-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 40px; }

.record-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  background: var(--theme-surface);
  border: 1px solid var(--theme-surface-alt);
  border-radius: 10px;
}

.record-card--new { border-color: color-mix(in srgb, var(--theme-accent) 35%, transparent); }

.record-card-inner {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  flex: 1;
  min-width: 0;
}

.project-thumb {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--theme-surface-alt);
  background: var(--theme-surface);
}

.project-thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.edit-form-inline {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.image-preview-row {
  margin-top: 8px;
}

.image-preview-row img {
  max-height: 120px;
  max-width: 100%;
  border-radius: 6px;
  border: 1px solid var(--theme-surface-alt);
  object-fit: cover;
  display: block;
}

.reorder-btns {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reorder-btn {
  background: none;
  border: 1px solid var(--theme-surface-alt);
  color: var(--theme-text-muted);
  border-radius: 4px;
  width: 26px;
  height: 22px;
  cursor: pointer;
  font-size: 9px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  padding: 0;
}

.reorder-btn:hover:not(:disabled) { border-color: var(--theme-accent); color: var(--theme-accent); }
.reorder-btn:disabled { opacity: 0.2; cursor: default; }

.record-title {
  font-weight: 600;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.record-meta {
  font-size: 12px;
  color: var(--theme-text-muted);
  margin-bottom: 8px;
}

.record-body {
  font-size: 13px;
  color: var(--theme-text-hi);
  line-height: 1.6;
}

.record-url { font-size: 12px; margin-top: 6px; }
.record-url a { color: var(--theme-accent); text-decoration: none; }

.record-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.new-badge {
  font-size: 10px;
  font-weight: 700;
  background: var(--theme-accent);
  color: var(--theme-bg);
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

.empty-state {
  text-align: center;
  padding: 32px;
  color: var(--theme-text-muted);
  font-size: 13px;
  border: 1px dashed var(--theme-surface-alt);
  border-radius: 10px;
}

/* ── Buttons ── */
.badge-btn {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
}

.badge-active { background: color-mix(in srgb, var(--status-good) 12%, transparent); border-color: color-mix(in srgb, var(--status-good) 30%, transparent); color: var(--status-good); }
.badge-off { background: var(--glass-card-bg); border-color: var(--theme-surface-alt); color: var(--theme-text-muted); }

.danger-btn {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  background: none;
  color: var(--theme-text-muted);
  transition: all 0.15s;
}
.danger-btn:hover { border-color: color-mix(in srgb, var(--status-bad) 40%, transparent); color: var(--status-bad); }

.action-link {
  font-size: 12px;
  color: var(--theme-accent);
  text-decoration: none;
  white-space: nowrap;
}

/* ── Add form ── */
.add-form {
  padding: 24px;
  background: var(--theme-surface-alt);
  border: 1px solid var(--theme-surface-alt);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Form shared ── */
.fgroup { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.fgroup--check { justify-content: flex-end; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

label {
  font-size: 12px;
  color: var(--theme-text-body);
  letter-spacing: 0.2px;
}

.check-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--theme-text-hi);
}

input[type="text"],
input[type="email"],
input[type="password"],
input[type="url"],
input[type="number"],
textarea {
  background: var(--theme-surface);
  border: 1px solid var(--theme-surface-alt);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--theme-fg);
  font-size: 14px;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--theme-accent) 40%, transparent);
}

input[type="checkbox"] { accent-color: var(--theme-accent); width: 14px; height: 14px; }

textarea { resize: vertical; }

.submit-btn {
  background: linear-gradient(110deg, var(--theme-accent), #f09420);
  color: var(--theme-bg);
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  align-self: flex-start;
  transition: filter 0.15s;
}
.submit-btn:hover:not(:disabled) { filter: brightness(0.92); }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.form-error {
  font-size: 13px;
  color: var(--status-bad);
}

/* ── Log entries ── */
.log-entry {
  display: grid;
  grid-template-columns: 130px 90px 90px 1fr;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--theme-surface);
  border: 1px solid var(--theme-surface-alt);
  font-size: 12px;
  align-items: start;
}

/* ── Analytics event rows ── */
.analytics-event-row {
  display: grid;
  grid-template-columns: 140px 180px 1fr;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 4px;
  background: var(--glass-card-bg);
  font-size: 12px;
  align-items: start;
}

/* ── Checkout funnel ── */
.funnel-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  overflow: hidden;
  border-radius: 6px;
}

/* ── Docs split layout ── */
.docs-layout {
  display: flex;
  gap: 20px;
  height: calc(100vh - 240px);
  min-height: 500px;
}

.docs-sidebar {
  width: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* ── Onboarding card ── */
.onboarding-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  background: color-mix(in srgb, var(--theme-accent) 7%, transparent);
  border: 1px solid color-mix(in srgb, var(--theme-accent) 25%, transparent);
  border-radius: 10px;
  margin-bottom: 20px;
}

.onboarding-btn {
  text-decoration: none;
  padding: 10px 20px;
  font-size: 13px;
  white-space: nowrap;
  flex-shrink: 0;
}

code {
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  background: color-mix(in srgb, var(--theme-accent) 10%, transparent);
  padding: 1px 6px;
  border-radius: 4px;
  color: var(--theme-accent);
}

@media (max-width: 640px) {
  .dash-tabs { gap: 2px; }
  .form-row { grid-template-columns: 1fr; }
  .log-entry { grid-template-columns: 1fr 1fr; }
  .analytics-event-row { grid-template-columns: 1fr; gap: 2px; }
  .funnel-container { grid-template-columns: 1fr 1fr; }
  .docs-layout { flex-direction: column; height: auto; min-height: 0; }
  .docs-sidebar { width: 100% !important; flex-direction: row !important; overflow-x: auto; }
  .onboarding-card { flex-direction: column; align-items: flex-start; }
}
</style>
