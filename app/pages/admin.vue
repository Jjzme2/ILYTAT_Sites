<script setup lang="ts">
import {
  useFirebaseAuth,
  useFirebaseApp,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
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

// Global error banner — any failed write/read surfaces here
const adminError = ref('')
function showError(msg: string) {
  adminError.value = msg
  setTimeout(() => { adminError.value = '' }, 8000)
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
    healthResult.value = { ok: false, tokenError: e instanceof Error ? e.message : String(e) }
  }
  finally {
    healthLoading.value = false
  }
}

onMounted(() => {
  const auth = useFirebaseAuth()
  onAuthStateChanged(auth, (u) => {
    user.value = u
    if (u) loadAll()
  })
  window.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
})

async function login() {
  loginError.value = ''
  loginLoading.value = true
  try {
    await signInWithEmailAndPassword(useFirebaseAuth(), loginEmail.value, loginPassword.value)
  }
  catch (e: unknown) {
    loginError.value = 'Invalid email or password.'
    console.error(e)
  }
  finally {
    loginLoading.value = false
  }
}

async function logout() {
  await signOut(useFirebaseAuth())
  user.value = null
}

// ── Firestore helpers ─────────────────────────────────────────────────────────
function db() {
  return getFirestore(useFirebaseApp())
}

// ── Admin fetch helper ────────────────────────────────────────────────────────
// Attaches the current user's Firebase ID token to requests so protected
// admin API routes can verify the caller is authenticated.
async function getAdminHeaders(): Promise<Record<string, string>> {
  const auth = useFirebaseAuth()
  const token = await auth.currentUser?.getIdToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ── Tab state ─────────────────────────────────────────────────────────────────
const activeTab = ref<'portfolio' | 'promotions' | 'testimonials' | 'inquiries' | 'analytics' | 'health' | 'docs' | 'logs'>('portfolio')

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
    showError(`Failed to load docs: ${e instanceof Error ? e.message : String(e)}`)
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
    showError(`Failed to load document: ${e instanceof Error ? e.message : String(e)}`)
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
    showError(`Failed to update project: ${e instanceof Error ? e.message : String(e)}`)
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
    showError(`Failed to load projects: ${e instanceof Error ? e.message : String(e)}`)
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
    showError(`Failed to save project: ${e instanceof Error ? e.message : String(e)}`)
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
    showError(`Failed to update project: ${e instanceof Error ? e.message : String(e)}`)
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
    showError(`Failed to reorder: ${e instanceof Error ? e.message : String(e)}`)
  }
}

async function deleteProject(id: string) {
  if (!confirm('Delete this project?')) return
  try {
    await deleteDoc(doc(db(), 'projects', id))
    await loadProjects()
  }
  catch (e: unknown) {
    showError(`Failed to delete project: ${e instanceof Error ? e.message : String(e)}`)
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
    showError(`Failed to load promotions: ${e instanceof Error ? e.message : String(e)}`)
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
    showError(`Failed to save promotion: ${e instanceof Error ? e.message : String(e)}`)
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
    showError(`Failed to update promotion: ${e instanceof Error ? e.message : String(e)}`)
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
    showError(`Failed to update promotion: ${e instanceof Error ? e.message : String(e)}`)
  }
}

async function deletePromotion(id: string) {
  if (!confirm('Delete this promotion?')) return
  try {
    await deleteDoc(doc(db(), 'promotions', id))
    await loadPromotions()
  }
  catch (e: unknown) {
    showError(`Failed to delete promotion: ${e instanceof Error ? e.message : String(e)}`)
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
    showError(`Failed to load testimonials: ${e instanceof Error ? e.message : String(e)}`)
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
    showError(`Failed to save testimonial: ${e instanceof Error ? e.message : String(e)}`)
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
    showError(`Failed to update testimonial: ${e instanceof Error ? e.message : String(e)}`)
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
    showError(`Failed to reorder: ${e instanceof Error ? e.message : String(e)}`)
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
    showError(`Failed to load inquiries: ${e instanceof Error ? e.message : String(e)}`)
  }
}

async function deleteInquiry(id: string) {
  if (!confirm('Delete this inquiry? This cannot be undone.')) return
  try {
    await deleteDoc(doc(db(), 'inquiries', id))
    await loadInquiries()
  }
  catch (e: unknown) {
    showError(`Failed to delete inquiry: ${e instanceof Error ? e.message : String(e)}`)
  }
}

async function markInquiryRead(id: string) {
  try {
    await updateDoc(doc(db(), 'inquiries', id), { status: 'read' })
    await loadInquiries()
  }
  catch (e: unknown) {
    showError(`Failed to update inquiry: ${e instanceof Error ? e.message : String(e)}`)
  }
}

// ── Load all on auth ──────────────────────────────────────────────────────────
async function loadAll() {
  await Promise.all([loadProjects(), loadPromotions(), loadTestimonials(), loadInquiries()])
}

// ── Analytics ─────────────────────────────────────────────────────────────────
interface AnalyticsSummary {
  total: number
  allCounts: Record<string, number>
  day30Counts: Record<string, number>
  day7Counts: Record<string, number>
  funnel: { pricing_viewed: number; checkout_initiated: number; checkout_abandoned: number; checkout_success: number }
  conversionRate: number | null
  packageBreakdown: Record<string, number>
  recent: Array<{ id: string; event: string; properties: Record<string, unknown>; sessionId: string; createdAt: string }>
  error?: string
}

const analytics = ref<AnalyticsSummary | null>(null)
const analyticsLoading = ref(false)

async function loadAnalytics() {
  analyticsLoading.value = true
  try {
    analytics.value = await $fetch<AnalyticsSummary>('/api/analytics/summary', { headers: await getAdminHeaders() })
  }
  catch (e: unknown) {
    showError(`Analytics load failed: ${e instanceof Error ? e.message : String(e)}`)
  }
  finally {
    analyticsLoading.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'analytics' && !analytics.value) loadAnalytics()
  if (tab === 'docs' && !internalDocs.value.length) loadDocs()
  if (tab === 'logs' && !appLogs.value.length) loadLogs()
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
  critical: '#dc2626',
  error:    '#ea580c',
  warn:     '#d97706',
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
    showError(`Failed to load logs: ${e instanceof Error ? e.message : String(e)}`)
  }
  finally {
    logsLoading.value = false
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
  { id: 'nav-portfolio',    group: 'Navigate', label: 'Go to Portfolio',    action: () => { activeTab.value = 'portfolio' } },
  { id: 'nav-promotions',   group: 'Navigate', label: 'Go to Promotions',   action: () => { activeTab.value = 'promotions' } },
  { id: 'nav-testimonials', group: 'Navigate', label: 'Go to Testimonials', action: () => { activeTab.value = 'testimonials' } },
  { id: 'nav-inquiries',    group: 'Navigate', label: 'Go to Inquiries',    action: () => { activeTab.value = 'inquiries' } },
  { id: 'nav-analytics',    group: 'Navigate', label: 'Go to Analytics',    action: () => { activeTab.value = 'analytics' } },
  { id: 'nav-logs',         group: 'Navigate', label: 'Go to Logs',         action: () => { activeTab.value = 'logs' } },
  { id: 'nav-health',       group: 'Navigate', label: 'Go to Health Check', action: () => { activeTab.value = 'health' } },
  { id: 'nav-docs',         group: 'Navigate', label: 'Go to Docs',         action: () => { activeTab.value = 'docs' } },
  { id: 'run-health',       group: 'Actions',  label: 'Run Health Check',   action: () => { activeTab.value = 'health'; nextTick(runHealthCheck) } },
  { id: 'refresh-analytics',group: 'Actions',  label: 'Refresh Analytics',  action: () => { activeTab.value = 'analytics'; nextTick(loadAnalytics) } },
  { id: 'refresh-logs',     group: 'Actions',  label: 'Refresh Logs',       action: () => { activeTab.value = 'logs'; nextTick(loadLogs) } },
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
          <input v-model="loginPassword" type="password" placeholder="••••••••" required>
        </div>
        <p v-if="loginError" class="form-error">{{ loginError }}</p>
        <button type="submit" class="submit-btn" :disabled="loginLoading">
          {{ loginLoading ? 'Signing in…' : 'Sign In' }}
        </button>
      </form>
      <a href="/" class="back-link">← Back to site</a>
    </div>

    <!-- Admin dashboard -->
    <div v-else class="dashboard">
      <header class="dash-header">
        <a href="/" class="admin-logo">ILYTAT<span>.com</span></a>
        <nav class="dash-tabs">
          <button
            v-for="tab in ['portfolio', 'promotions', 'testimonials', 'inquiries', 'analytics', 'logs', 'health', 'docs']" :key="tab"
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
      <div v-if="adminError" style="background:#f87171;color:#fff;padding:10px 20px;font-size:13px;font-family:monospace;white-space:pre-wrap;position:sticky;top:0;z-index:100;">
        ⚠ {{ adminError }}
      </div>

      <!-- ── ANALYTICS tab ── -->
      <section v-if="activeTab === 'analytics'" class="dash-section">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <h2 class="dash-title" style="margin:0">Analytics</h2>
          <button class="submit-btn" style="padding:6px 14px;font-size:12px;" :disabled="analyticsLoading" @click="loadAnalytics">
            {{ analyticsLoading ? 'Loading…' : 'Refresh' }}
          </button>
        </div>

        <div v-if="analyticsLoading && !analytics" style="color:#8e8ba0;font-size:13px;">Loading analytics…</div>

        <div v-else-if="analytics">
          <!-- Error from API -->
          <div v-if="analytics.error" style="background:#f87171;color:#fff;padding:10px 14px;border-radius:6px;font-size:13px;margin-bottom:20px;">
            ⚠ {{ analytics.error }}
          </div>

          <!-- ── Summary cards ── -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:28px;">
            <div class="record-card" style="text-align:center;padding:16px 12px;">
              <p style="font-size:28px;font-weight:700;margin:0;color:#f5c518;">{{ analytics.funnel.checkout_success }}</p>
              <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8e8ba0;margin:4px 0 0;">Paid checkouts<br><span style="font-size:10px;">(last 30 days)</span></p>
            </div>
            <div class="record-card" style="text-align:center;padding:16px 12px;">
              <p style="font-size:28px;font-weight:700;margin:0;color:#f5c518;">{{ analytics.funnel.checkout_initiated }}</p>
              <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8e8ba0;margin:4px 0 0;">Checkout clicks<br><span style="font-size:10px;">(last 30 days)</span></p>
            </div>
            <div class="record-card" style="text-align:center;padding:16px 12px;">
              <p style="font-size:28px;font-weight:700;margin:0;" :style="{ color: analytics.conversionRate !== null && analytics.conversionRate >= 50 ? '#4ade80' : '#f97316' }">
                {{ analytics.conversionRate !== null ? analytics.conversionRate + '%' : '—' }}
              </p>
              <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8e8ba0;margin:4px 0 0;">Conversion rate<br><span style="font-size:10px;">(initiated → paid)</span></p>
            </div>
            <div class="record-card" style="text-align:center;padding:16px 12px;">
              <p style="font-size:28px;font-weight:700;margin:0;color:#f5c518;">{{ analytics.day30Counts['contact_submit'] || 0 }}</p>
              <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8e8ba0;margin:4px 0 0;">Contact submits<br><span style="font-size:10px;">(last 30 days)</span></p>
            </div>
            <div class="record-card" style="text-align:center;padding:16px 12px;">
              <p style="font-size:28px;font-weight:700;margin:0;color:#f5c518;">{{ analytics.funnel.pricing_viewed }}</p>
              <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8e8ba0;margin:4px 0 0;">Pricing views<br><span style="font-size:10px;">(last 30 days)</span></p>
            </div>
            <div class="record-card" style="text-align:center;padding:16px 12px;">
              <p style="font-size:28px;font-weight:700;margin:0;color:#f5c518;">{{ analytics.total }}</p>
              <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8e8ba0;margin:4px 0 0;">Total events<br><span style="font-size:10px;">(all time)</span></p>
            </div>
          </div>

          <!-- ── Checkout funnel ── -->
          <div class="record-card" style="margin-bottom:20px;">
            <p class="dash-hint" style="font-weight:600;margin-bottom:14px;">Checkout funnel (last 30 days)</p>
            <div class="funnel-container">
              <div
                v-for="(step, i) in [
                  { label: 'Pricing viewed', key: 'pricing_viewed' },
                  { label: 'Buy Now clicked', key: 'checkout_initiated' },
                  { label: 'Abandoned', key: 'checkout_abandoned' },
                  { label: 'Paid', key: 'checkout_success' },
                ]"
                :key="step.key"
                style="flex:1;padding:12px 10px;text-align:center;font-size:12px;border-right:1px solid rgba(255,255,255,0.05);"
                :style="{ background: i === 3 ? 'rgba(74,222,128,0.12)' : i === 2 ? 'rgba(249,115,22,0.1)' : 'rgba(245,197,24,0.07)' }"
              >
                <p style="font-size:22px;font-weight:700;margin:0;" :style="{ color: i === 3 ? '#4ade80' : i === 2 ? '#f97316' : '#f5c518' }">
                  {{ analytics.funnel[step.key as keyof typeof analytics.funnel] }}
                </p>
                <p style="color:#8e8ba0;margin:4px 0 0;line-height:1.3;">{{ step.label }}</p>
              </div>
            </div>
          </div>

          <!-- ── Package breakdown ── -->
          <div v-if="Object.keys(analytics.packageBreakdown).length" class="record-card" style="margin-bottom:20px;">
            <p class="dash-hint" style="font-weight:600;margin-bottom:12px;">Package interest (all-time checkout clicks)</p>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <div
                v-for="[pkg, count] in Object.entries(analytics.packageBreakdown).sort((a,b) => (b[1] as number) - (a[1] as number))"
                :key="pkg"
                style="display:flex;align-items:center;gap:10px;"
              >
                <span style="width:90px;font-size:13px;font-weight:600;">{{ pkg }}</span>
                <div style="flex:1;background:rgba(255,255,255,0.05);border-radius:4px;height:20px;overflow:hidden;">
                  <div
                    style="height:100%;background:#f5c518;border-radius:4px;transition:width 0.4s;"
                    :style="{ width: Math.round((count as number) / Math.max(...Object.values(analytics.packageBreakdown) as number[]) * 100) + '%' }"
                  />
                </div>
                <span style="font-size:13px;color:#8e8ba0;width:24px;text-align:right;">{{ count }}</span>
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
                style="display:flex;justify-content:space-between;padding:6px 10px;border-radius:4px;background:rgba(255,255,255,0.03);font-size:13px;"
              >
                <span style="font-family:monospace;color:#f0ece6;">{{ evt }}</span>
                <span style="color:#f5c518;font-weight:600;">{{ cnt }}</span>
              </div>
            </div>
            <p v-else style="color:#68667a;font-size:13px;">No events in the last 7 days.</p>
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
                <span style="color:#68667a;font-family:monospace;">{{ new Date(e.createdAt).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) }}</span>
                <span style="font-family:monospace;color:#f5c518;font-weight:600;">{{ e.event }}</span>
                <span style="color:#8e8ba0;word-break:break-all;">{{ Object.keys(e.properties).length ? JSON.stringify(e.properties) : '' }}</span>
              </div>
            </div>
          </div>
        </div>

        <p v-else style="color:#8e8ba0;font-size:13px;">Click Refresh to load analytics data.</p>
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
                background: logsFilter === lvl ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.03)',
                borderColor: logsFilter === lvl ? 'rgba(245,197,24,0.4)' : '#2a2a32',
                color: logsFilter === lvl ? '#f5c518' : '#68667a',
              }"
              @click="logsFilter = (lvl as typeof logsFilter)"
            >{{ lvl }}</button>
          </div>
        </div>
        <p class="dash-hint">Structured log entries written by all server-side handlers. Sorted newest first.</p>

        <div v-if="logsLoading && !appLogs.length" style="color:#8e8ba0;font-size:13px;">Loading logs…</div>

        <div v-else-if="!filteredLogs.length" class="empty-state">
          {{ appLogs.length ? 'No logs match the selected filter.' : 'No logs yet — they appear here once the app starts writing them.' }}
        </div>

        <div v-else style="display:flex;flex-direction:column;gap:2px;">
          <div
            v-for="entry in filteredLogs" :key="entry.id"
            class="log-entry"
          >
            <!-- Timestamp -->
            <span style="color:#68667a;font-family:monospace;font-size:11px;">
              {{ new Date(entry.createdAt).toLocaleString('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' }) }}
            </span>
            <!-- Level badge -->
            <span
              style="display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;text-align:center;"
              :style="{ background: LEVEL_COLOR[entry.level] + '22', color: LEVEL_COLOR[entry.level], border: '1px solid ' + LEVEL_COLOR[entry.level] + '44' }"
            >{{ entry.level }}</span>
            <!-- Area -->
            <span style="font-family:monospace;color:#8e8ba0;font-size:11px;">[{{ entry.area }}]</span>
            <!-- Message + data -->
            <div>
              <span style="color:#f0ece6;">{{ entry.message }}</span>
              <span v-if="entry.data" style="display:block;margin-top:3px;font-family:monospace;font-size:10px;color:#68667a;word-break:break-all;">{{ entry.data }}</span>
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
        <div v-if="healthResult" style="font-family:monospace;font-size:12px;background:#111;color:#e5e5e5;padding:20px;border-radius:8px;white-space:pre-wrap;overflow-x:auto;">{{ JSON.stringify(healthResult, null, 2) }}</div>
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
                    <span style="font-size:10px;color:#68667a;margin-top:4px;">No image</span>
                  </div>
                </div>
                <div class="record-main">
                  <p class="record-title">{{ p.title }}</p>
                  <p class="record-meta">{{ p.industry }} · order {{ p.order }}</p>
                  <p class="record-body">{{ p.description }}</p>
                  <p v-if="p.url" class="record-url"><a :href="p.url" target="_blank">{{ p.url }}</a></p>
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

        <div v-if="docsLoading && !internalDocs.length" style="color: #8e8ba0; font-size: 13px;">Loading documents…</div>

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
                background: selectedDocKey === docItem.key ? 'rgba(245,197,24,0.1)' : 'rgba(255,255,255,0.02)',
                borderColor: selectedDocKey === docItem.key ? 'rgba(245,197,24,0.3)' : '#2a2a32',
                color: selectedDocKey === docItem.key ? '#f5c518' : '#8e8ba0',
              }"
              @click="selectDoc(docItem.key)"
            >
              {{ docItem.name }}
            </div>
          </div>

          <!-- Iframe viewer -->
          <div style="flex: 1; border: 1px solid #2a2a32; border-radius: 10px; overflow: hidden; position: relative;">
            <div v-if="docContentLoading" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: #141417; color: #8e8ba0; font-size: 13px;">
              Loading document…
            </div>
            <iframe
              v-else-if="docContent"
              :srcdoc="docContent"
              sandbox="allow-same-origin allow-scripts"
              style="width: 100%; height: 100%; border: none;"
              title="Internal document viewer"
            />
            <div v-else style="display: flex; align-items: center; justify-content: center; height: 100%; color: #68667a; font-size: 13px;">
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
            <p style="font-size:12px;color:#8e8ba0;margin:0;">Send this to new clients to collect their requirements, branding assets, and preferences.</p>
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
  background: #0f0f11;
  color: #f0ece6;
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
  color: #f0ece6;
  text-decoration: none;
}

.admin-logo span { color: #f5c518; }

h1 {
  font-family: 'Sora', sans-serif;
  font-size: 28px;
  font-weight: 700;
  margin: 12px 0 32px;
}

.login-form { display: flex; flex-direction: column; gap: 16px; }

.back-link {
  display: block;
  margin-top: 24px;
  font-size: 13px;
  color: #68667a;
  text-decoration: none;
}
.back-link:hover { color: #f0ece6; }

/* ── Dashboard ── */
.dashboard { display: flex; flex-direction: column; min-height: 100vh; }

.dash-header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px 32px;
  border-bottom: 1px solid #2a2a32;
  background: #0f0f11;
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
}
.dash-tabs::-webkit-scrollbar { display: none; }

.dash-tab {
  padding: 7px 16px;
  border-radius: 6px;
  background: none;
  border: 1px solid transparent;
  color: #68667a;
  cursor: pointer;
  font-size: 13px;
  text-transform: capitalize;
  transition: all 0.15s;
  flex-shrink: 0;
  white-space: nowrap;
}

.dash-tab.active {
  background: rgba(245, 197, 24, 0.1);
  border-color: rgba(245, 197, 24, 0.3);
  color: #f5c518;
}

.dash-tab:hover:not(.active) { color: #f0ece6; border-color: #2a2a32; }

.logout-btn {
  background: none;
  border: 1px solid #2a2a32;
  border-radius: 6px;
  padding: 7px 14px;
  color: #68667a;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
}
.logout-btn:hover { border-color: #f5c518; color: #f5c518; }

.palette-trigger {
  background: rgba(255,255,255,0.03);
  border: 1px solid #2a2a32;
  border-radius: 6px;
  padding: 6px 10px;
  color: #4a4855;
  cursor: pointer;
  font-size: 11px;
  font-family: 'Space Mono', monospace;
  letter-spacing: 0.5px;
  transition: all 0.15s;
  flex-shrink: 0;
}
.palette-trigger:hover { border-color: rgba(245,197,24,0.4); color: #f5c518; }

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
  box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04);
}

.palette-search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid #232328;
}

.palette-search-icon {
  color: #4a4855;
  font-size: 15px;
  flex-shrink: 0;
  line-height: 1;
}

.palette-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #f0ece6;
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  min-width: 0;
}
.palette-input::placeholder { color: #3a3845; }

.palette-esc-hint {
  background: rgba(255,255,255,0.04);
  border: 1px solid #2a2a32;
  color: #3a3845;
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 10px;
  cursor: pointer;
  font-family: 'Space Mono', monospace;
  flex-shrink: 0;
  transition: color 0.15s;
}
.palette-esc-hint:hover { color: #68667a; }

.palette-list {
  max-height: 320px;
  overflow-y: auto;
  padding: 6px;
  scrollbar-width: thin;
  scrollbar-color: #2a2a32 transparent;
}

.palette-group-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #3a3845;
  padding: 8px 10px 4px;
  margin: 0;
  font-family: 'Space Mono', monospace;
}

.palette-item {
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  color: #8e8ba0;
  padding: 9px 12px;
  border-radius: 7px;
  cursor: pointer;
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  transition: background 0.08s, color 0.08s;
  display: block;
}
.palette-item--active {
  background: rgba(245,197,24,0.08);
  color: #f0ece6;
}

.palette-empty {
  padding: 28px 16px;
  text-align: center;
  color: #3a3845;
  font-size: 13px;
}

.palette-footer {
  display: flex;
  gap: 16px;
  padding: 10px 16px;
  border-top: 1px solid #1e1e24;
  font-size: 11px;
  color: #3a3845;
}
.palette-footer kbd {
  background: rgba(255,255,255,0.05);
  border: 1px solid #2a2a32;
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
  color: #68667a;
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
  background: #1a1a1f;
  border: 1px solid #2a2a32;
  border-radius: 10px;
}

.record-card--new { border-color: rgba(245, 197, 24, 0.35); }

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
  border: 1px solid #2a2a32;
  background: #111116;
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
  border: 1px solid #2a2a32;
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
  border: 1px solid #2a2a32;
  color: #68667a;
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

.reorder-btn:hover:not(:disabled) { border-color: #f5c518; color: #f5c518; }
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
  color: #68667a;
  margin-bottom: 8px;
}

.record-body {
  font-size: 13px;
  color: #b8b4ae;
  line-height: 1.6;
}

.record-url { font-size: 12px; margin-top: 6px; }
.record-url a { color: #f5c518; text-decoration: none; }

.record-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.new-badge {
  font-size: 10px;
  font-weight: 700;
  background: #f5c518;
  color: #0f0f11;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

.empty-state {
  text-align: center;
  padding: 32px;
  color: #68667a;
  font-size: 13px;
  border: 1px dashed #2a2a32;
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

.badge-active { background: rgba(74, 222, 128, 0.12); border-color: rgba(74, 222, 128, 0.3); color: #4ade80; }
.badge-off { background: rgba(255, 255, 255, 0.05); border-color: #2a2a32; color: #68667a; }

.danger-btn {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  background: none;
  color: #68667a;
  transition: all 0.15s;
}
.danger-btn:hover { border-color: rgba(239, 68, 68, 0.4); color: #ef4444; }

.action-link {
  font-size: 12px;
  color: #f5c518;
  text-decoration: none;
  white-space: nowrap;
}

/* ── Add form ── */
.add-form {
  padding: 24px;
  background: #141417;
  border: 1px solid #2a2a32;
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
  color: #8e8ba0;
  letter-spacing: 0.2px;
}

.check-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #b8b4ae;
}

input[type="text"],
input[type="email"],
input[type="password"],
input[type="url"],
input[type="number"],
textarea {
  background: #1a1a1f;
  border: 1px solid #2a2a32;
  border-radius: 8px;
  padding: 10px 12px;
  color: #f0ece6;
  font-size: 14px;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: rgba(245, 197, 24, 0.4);
}

input[type="checkbox"] { accent-color: #f5c518; width: 14px; height: 14px; }

textarea { resize: vertical; }

.submit-btn {
  background: linear-gradient(110deg, #f5c518, #f09420);
  color: #0f0f11;
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
  color: #ef4444;
}

/* ── Log entries ── */
.log-entry {
  display: grid;
  grid-template-columns: 130px 90px 90px 1fr;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: #1a1a1f;
  border: 1px solid #2a2a32;
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
  background: rgba(255, 255, 255, 0.02);
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
  background: rgba(245, 197, 24, 0.07);
  border: 1px solid rgba(245, 197, 24, 0.25);
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
  background: rgba(245, 197, 24, 0.1);
  padding: 1px 6px;
  border-radius: 4px;
  color: #f5c518;
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
