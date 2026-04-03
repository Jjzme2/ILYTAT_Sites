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

onMounted(() => {
  const auth = useFirebaseAuth()
  onAuthStateChanged(auth, (u) => {
    user.value = u
    if (u) loadAll()
  })
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

// ── Tab state ─────────────────────────────────────────────────────────────────
const activeTab = ref<'portfolio' | 'promotions' | 'testimonials' | 'inquiries'>('portfolio')

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

async function loadProjects() {
  const snap = await getDocs(query(collection(db(), 'projects'), orderBy('order')))
  projects.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as Project))
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
  finally {
    savingProject.value = false
  }
}

async function toggleProjectVisible(p: Project) {
  await updateDoc(doc(db(), 'projects', p.id), { visible: !p.visible })
  await loadProjects()
}

async function deleteProject(id: string) {
  if (!confirm('Delete this project?')) return
  await deleteDoc(doc(db(), 'projects', id))
  await loadProjects()
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
  const snap = await getDocs(collection(db(), 'promotions'))
  promotions.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as Promotion))
}

async function addPromotion() {
  savingPromo.value = true
  try {
    await addDoc(collection(db(), 'promotions'), {
      message: newPromo.message,
      ctaText: newPromo.ctaText || null,
      ctaUrl: newPromo.ctaUrl || null,
      active: true,
      expiresAt: newPromo.expiresAt || null,
    })
    Object.assign(newPromo, { message: '', ctaText: '', ctaUrl: '', expiresAt: '' })
    await loadPromotions()
  }
  finally {
    savingPromo.value = false
  }
}

async function togglePromoActive(p: Promotion) {
  await updateDoc(doc(db(), 'promotions', p.id), { active: !p.active })
  await loadPromotions()
}

async function deletePromotion(id: string) {
  if (!confirm('Delete this promotion?')) return
  await deleteDoc(doc(db(), 'promotions', id))
  await loadPromotions()
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
  const snap = await getDocs(query(collection(db(), 'testimonials'), orderBy('order')))
  testimonials.value = snap.docs.map(d => ({ id: d.id, ...d.data() } as Testimonial))
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
  finally {
    savingTestimonial.value = false
  }
}

async function toggleTestimonialVisible(t: Testimonial) {
  await updateDoc(doc(db(), 'testimonials', t.id), { visible: !t.visible })
  await loadTestimonials()
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
  const snap = await getDocs(collection(db(), 'inquiries'))
  inquiries.value = snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Inquiry))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

async function markInquiryRead(id: string) {
  await updateDoc(doc(db(), 'inquiries', id), { status: 'read' })
  await loadInquiries()
}

// ── Load all on auth ──────────────────────────────────────────────────────────
async function loadAll() {
  await Promise.all([loadProjects(), loadPromotions(), loadTestimonials(), loadInquiries()])
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
v-for="tab in ['portfolio', 'promotions', 'testimonials', 'inquiries']" :key="tab"
            class="dash-tab" :class="{ active: activeTab === tab }"
            @click="activeTab = (tab as typeof activeTab)">
            {{ tab }}
          </button>
        </nav>
        <button class="logout-btn" @click="logout">Sign out</button>
      </header>

      <!-- ── PORTFOLIO tab ── -->
      <section v-if="activeTab === 'portfolio'" class="dash-section">
        <h2>Portfolio Projects</h2>
        <p class="dash-hint">Add real client sites here. Set <code>visible: false</code> to hide while building.</p>

        <div class="record-list">
          <div v-if="!projects.length" class="empty-state">No projects yet.</div>
          <div v-for="p in projects" :key="p.id" class="record-card">
            <div class="record-main">
              <p class="record-title">{{ p.title }}</p>
              <p class="record-meta">{{ p.industry }} · order {{ p.order }}</p>
              <p class="record-body">{{ p.description }}</p>
              <p v-if="p.url" class="record-url"><a :href="p.url" target="_blank">{{ p.url }}</a></p>
            </div>
            <div class="record-actions">
              <button
class="badge-btn" :class="p.visible ? 'badge-active' : 'badge-off'"
                @click="toggleProjectVisible(p)">
                {{ p.visible ? 'Visible' : 'Hidden' }}
              </button>
              <button class="danger-btn" @click="deleteProject(p.id)">Delete</button>
            </div>
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
            <div class="record-main">
              <p class="record-title">{{ p.message }}</p>
              <p class="record-meta">
                {{ p.ctaText ? `CTA: "${p.ctaText}" → ${p.ctaUrl}` : 'No CTA button' }}
                {{ p.expiresAt ? ` · expires ${p.expiresAt}` : '' }}
              </p>
            </div>
            <div class="record-actions">
              <button
class="badge-btn" :class="p.active ? 'badge-active' : 'badge-off'"
                @click="togglePromoActive(p)">
                {{ p.active ? 'Active' : 'Inactive' }}
              </button>
              <button class="danger-btn" @click="deletePromotion(p.id)">Delete</button>
            </div>
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
            <label>Expiry date (optional, ISO format)</label>
            <input v-model="newPromo.expiresAt" type="text" placeholder="2026-06-01T00:00:00Z">
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
            <div class="record-main">
              <p class="record-title">{{ t.name }} · {{ t.businessName }}</p>
              <p class="record-body">"{{ t.quote }}"</p>
            </div>
            <div class="record-actions">
              <button
class="badge-btn" :class="t.visible ? 'badge-active' : 'badge-off'"
                @click="toggleTestimonialVisible(t)">
                {{ t.visible ? 'Visible' : 'Hidden' }}
              </button>
              <button class="danger-btn" @click="deleteTestimonial(t.id)">Delete</button>
            </div>
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

      <!-- ── INQUIRIES tab ── -->
      <section v-if="activeTab === 'inquiries'" class="dash-section">
        <h2>Inquiries</h2>
        <p class="dash-hint">All contact form submissions, newest first.</p>

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
              <button
v-if="inq.status === 'new'" class="badge-btn badge-off"
                @click="markInquiryRead(inq.id)">Mark read</button>
            </div>
          </div>
        </div>
      </section>
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
}

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

code {
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  background: rgba(245, 197, 24, 0.1);
  padding: 1px 6px;
  border-radius: 4px;
  color: #f5c518;
}

@media (max-width: 640px) {
  .dash-header { padding: 12px 16px; gap: 12px; }
  .dash-tabs { gap: 2px; }
  .dash-tab { padding: 6px 10px; font-size: 12px; }
  .form-row { grid-template-columns: 1fr; }
}
</style>
