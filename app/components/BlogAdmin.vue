<script setup lang="ts">
import type { BlogPost, BlogPlan } from '~/types'
import { useFirebaseAuth } from '~/utils/firebase'

// ── Auth header helper ──────────────────────────────────────────────────────
async function getAdminHeaders(): Promise<Record<string, string>> {
  const auth  = useFirebaseAuth()
  const token = await auth.currentUser?.getIdToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ── Error / success display ─────────────────────────────────────────────────
const error   = ref('')
const success = ref('')
function showError(msg: string)   { error.value = msg;   setTimeout(() => { error.value   = '' }, 8000) }
function showSuccess(msg: string) { success.value = msg; setTimeout(() => { success.value = '' }, 6000) }

// ── Post list ───────────────────────────────────────────────────────────────
const posts        = ref<BlogPost[]>([])
const postsLoading = ref(false)

async function loadPosts() {
  postsLoading.value = true
  try {
    posts.value = await $fetch<BlogPost[]>('/api/admin/blog', { headers: await getAdminHeaders() })
  }
  catch (e: unknown) { showError(`Failed to load posts: ${e instanceof Error ? e.message : String(e)}`) }
  finally            { postsLoading.value = false }
}

onMounted(loadPosts)

// ── Editor modal ────────────────────────────────────────────────────────────
const editorOpen  = ref(false)
const editingPost = ref<Partial<BlogPost>>({})
const saving      = ref(false)
const previewMode = ref(false)

function openNew() {
  editingPost.value = {
    title: '', slug: '', excerpt: '', content: '', coverImage: '',
    tags: [], status: 'draft',
    style: { accentColor: '#6366f1', heroStyle: 'gradient', fontStyle: 'sans' },
    authorName: 'ILYTAT',
  }
  editorOpen.value = true
}

function openEdit(post: BlogPost) {
  editingPost.value = { ...post }
  editorOpen.value  = true
}

function closeEditor() {
  editorOpen.value  = false
  editingPost.value = {}
  previewMode.value = false
}

async function savePost() {
  if (!editingPost.value.title?.trim()) { showError('Title is required'); return }
  if (!editingPost.value.slug?.trim())  { showError('Slug is required');  return }

  saving.value = true
  try {
    const headers = await getAdminHeaders()
    if (editingPost.value.id) {
      await $fetch(`/api/admin/blog/${editingPost.value.id}`, { method: 'PUT', headers, body: editingPost.value })
    }
    else {
      await $fetch('/api/admin/blog', { method: 'POST', headers, body: editingPost.value })
    }
    closeEditor()
    await loadPosts()
  }
  catch (e: unknown) { showError(`Save failed: ${e instanceof Error ? e.message : String(e)}`) }
  finally            { saving.value = false }
}

// ── Delete ──────────────────────────────────────────────────────────────────
const deletingId      = ref<string | null>(null)
const confirmDeleteId = ref<string | null>(null)

async function deletePost(id: string) {
  if (confirmDeleteId.value !== id) {
    confirmDeleteId.value = id
    setTimeout(() => { if (confirmDeleteId.value === id) confirmDeleteId.value = null }, 3000)
    return
  }
  deletingId.value      = id
  confirmDeleteId.value = null
  try {
    await $fetch(`/api/admin/blog/${id}`, { method: 'DELETE', headers: await getAdminHeaders() })
    await loadPosts()
  }
  catch (e: unknown) { showError(`Delete failed: ${e instanceof Error ? e.message : String(e)}`) }
  finally            { deletingId.value = null }
}

// ── AI Panel ────────────────────────────────────────────────────────────────
const aiPanelOpen   = ref(true)
const planLoading   = ref(false)
const planSaving    = ref(false)
const planDirty     = ref(false)

const plan = ref<BlogPlan>({ focalPoint: '', additionalNotes: '', weekOf: '' })

async function loadPlan() {
  planLoading.value = true
  try {
    const data = await $fetch<BlogPlan>('/api/admin/blog-plan', { headers: await getAdminHeaders() })
    plan.value    = data
    planDirty.value = false
  }
  catch { /* non-fatal — defaults to empty */ }
  finally { planLoading.value = false }
}

async function savePlan() {
  planSaving.value = true
  try {
    const saved = await $fetch<BlogPlan>('/api/admin/blog-plan', {
      method: 'PUT',
      headers: await getAdminHeaders(),
      body: plan.value,
    })
    plan.value    = saved
    planDirty.value = false
    showSuccess('Plan saved.')
  }
  catch (e: unknown) { showError(`Failed to save plan: ${e instanceof Error ? e.message : String(e)}`) }
  finally { planSaving.value = false }
}

function markPlanDirty() { planDirty.value = true }

// Next Monday display
const nextMondayLabel = computed(() => {
  const d    = new Date()
  const dow  = d.getDay()           // 0=Sun … 6=Sat
  const diff = dow === 1 ? 7 : (8 - dow) % 7 || 7
  d.setDate(d.getDate() + diff)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
})

// ── Manual Generate ─────────────────────────────────────────────────────────
const generating           = ref(false)
const generateFocalPoint   = ref('')
const generateNotes        = ref('')
const generateStatus       = ref<'draft' | 'published'>('draft')
const generatePanelOpen    = ref(false)

async function generateNow() {
  const fp = generateFocalPoint.value.trim() || plan.value.focalPoint.trim()
  if (!fp) {
    showError('Enter a focal point before generating.')
    return
  }
  generating.value = true
  try {
    const res = await $fetch<{ id: string; title: string; slug: string; status: string }>(
      '/api/admin/generate-blog',
      {
        method:  'POST',
        headers: await getAdminHeaders(),
        body: {
          focalPoint:      fp,
          additionalNotes: generateNotes.value.trim() || plan.value.additionalNotes,
          status:          generateStatus.value,
        },
      },
    )
    showSuccess(`✓ "${res.title}" saved as ${res.status}. Review it in the list below.`)
    generateFocalPoint.value = ''
    generateNotes.value      = ''
    generatePanelOpen.value  = false
    await loadPosts()
  }
  catch (e: unknown) { showError(`Generation failed: ${e instanceof Error ? e.message : String(e)}`) }
  finally { generating.value = false }
}

onMounted(loadPlan)

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(d: Date | string | null | undefined) {
  if (!d) return '—'
  return new Date(d as string).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function isAiPost(post: BlogPost) {
  return post.authorName?.includes('Aria') || post.authorName?.includes('AI')
}
</script>

<template>
  <div class="blog-admin">
    <!-- Banners -->
    <div v-if="error"   class="ba-banner ba-banner-error">{{ error }}</div>
    <div v-if="success" class="ba-banner ba-banner-success">{{ success }}</div>

    <!-- ── AI Generation Panel ──────────────────────────────────────────────── -->
    <div class="ai-panel">
      <button class="ai-panel-toggle" @click="aiPanelOpen = !aiPanelOpen">
        <span class="ai-panel-toggle-left">
          <span class="ai-chip">AI</span>
          <span class="ai-panel-title">Weekly Blog Generation</span>
        </span>
        <span class="ai-panel-caret" :class="{ open: aiPanelOpen }">▾</span>
      </button>

      <div v-if="aiPanelOpen" class="ai-panel-body">
        <div v-if="planLoading" class="ai-loading">Loading plan…</div>
        <template v-else>
          <!-- Plan section -->
          <div class="ai-section">
            <div class="ai-section-label">
              Next auto-post: <strong>{{ nextMondayLabel }}</strong> at 10 AM CT
            </div>

            <div class="ai-field-row">
              <div class="ai-field ai-field-grow">
                <label class="ai-label">Focal point for next week</label>
                <input
                  v-model="plan.focalPoint"
                  class="ai-input"
                  placeholder="e.g. Why every contractor in Kankakee County needs a website"
                  @input="markPlanDirty"
                />
              </div>
            </div>

            <div class="ai-field">
              <label class="ai-label">Additional notes <span class="ai-optional">(optional)</span></label>
              <textarea
                v-model="plan.additionalNotes"
                class="ai-input ai-textarea"
                rows="2"
                placeholder="Tone hints, local angle, topics to avoid…"
                @input="markPlanDirty"
              />
            </div>

            <div class="ai-field-row ai-field-row-end">
              <span v-if="plan.updatedAt" class="ai-saved-at">
                Saved {{ formatDate(plan.updatedAt) }}
              </span>
              <button
                class="ai-btn ai-btn-secondary"
                :disabled="planSaving || !planDirty"
                @click="savePlan"
              >
                {{ planSaving ? 'Saving…' : 'Save Plan' }}
              </button>
            </div>
          </div>

          <div class="ai-divider" />

          <!-- Immediate generate section -->
          <div class="ai-section">
            <button class="ai-generate-toggle" @click="generatePanelOpen = !generatePanelOpen">
              <span>Generate a post right now</span>
              <span class="ai-panel-caret" :class="{ open: generatePanelOpen }">▾</span>
            </button>

            <div v-if="generatePanelOpen" class="ai-generate-form">
              <div class="ai-field">
                <label class="ai-label">
                  Focal point
                  <span class="ai-optional">(leave blank to use the saved plan above)</span>
                </label>
                <input
                  v-model="generateFocalPoint"
                  class="ai-input"
                  placeholder="Override focal point for this generation only…"
                />
              </div>

              <div class="ai-field">
                <label class="ai-label">Notes <span class="ai-optional">(optional)</span></label>
                <textarea
                  v-model="generateNotes"
                  class="ai-input ai-textarea"
                  rows="2"
                  placeholder="Extra context for this post only…"
                />
              </div>

              <div class="ai-field-row ai-field-row-end">
                <label class="ai-radio-label">
                  <input v-model="generateStatus" type="radio" value="draft" class="ai-radio" />
                  Save as Draft
                </label>
                <label class="ai-radio-label">
                  <input v-model="generateStatus" type="radio" value="published" class="ai-radio" />
                  Publish Immediately
                </label>
                <button
                  class="ai-btn ai-btn-primary"
                  :disabled="generating"
                  @click="generateNow"
                >
                  <span v-if="generating" class="ai-spinner" />
                  {{ generating ? 'Generating…' : 'Generate with AI ▶' }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Header row -->
    <div class="ba-header">
      <h2 class="ba-title">Blog Posts</h2>
      <div class="ba-header-actions">
        <a href="/blog" target="_blank" class="ba-link-btn">View Blog ↗</a>
        <button class="ba-btn ba-btn-primary" @click="openNew">+ New Post</button>
      </div>
    </div>

    <!-- Post list -->
    <div v-if="postsLoading" class="ba-loading">Loading…</div>
    <div v-else-if="!posts.length" class="ba-empty">
      No posts yet. <button class="ba-text-btn" @click="openNew">Create your first post →</button>
    </div>
    <div v-else class="ba-list">
      <div v-for="post in posts" :key="post.id" class="ba-item">
        <div class="ba-item-accent" :style="{ background: post.style?.accentColor || '#6366f1' }" />
        <div class="ba-item-info">
          <div class="ba-item-title-row">
            <span class="ba-item-title">{{ post.title }}</span>
            <span v-if="isAiPost(post)" class="ba-ai-badge">AI</span>
          </div>
          <div class="ba-item-meta">
            <span class="ba-slug">/blog/{{ post.slug }}</span>
            <span :class="['ba-status', post.status === 'published' ? 'ba-status-pub' : 'ba-status-draft']">
              {{ post.status }}
            </span>
            <span class="ba-date">{{ formatDate(post.publishedAt || post.updatedAt) }}</span>
            <span v-if="post.tags?.length" class="ba-tags">{{ post.tags.slice(0, 3).join(', ') }}</span>
          </div>
          <p v-if="post.excerpt" class="ba-excerpt">{{ post.excerpt }}</p>
        </div>
        <div class="ba-item-actions">
          <button class="ba-action-btn" @click="openEdit(post)" title="Edit">Edit</button>
          <a
            :href="post.status === 'published' ? `/blog/${post.slug}` : `/blog/preview/${post.id}`"
            target="_blank"
            class="ba-action-btn ba-action-view"
            :title="post.status === 'published' ? 'View published post' : 'Preview draft'"
          >{{ post.status === 'published' ? 'View' : 'Preview' }}</a>
          <button
            :class="['ba-action-btn', 'ba-action-delete', confirmDeleteId === post.id && 'ba-action-confirm']"
            :disabled="deletingId === post.id"
            @click="deletePost(post.id)"
            title="Delete"
          >
            {{ deletingId === post.id ? '…' : (confirmDeleteId === post.id ? 'Confirm?' : 'Delete') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Editor Modal ───────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="editorOpen" class="ba-modal-overlay" @click.self="closeEditor">
        <div :class="['ba-modal', previewMode && 'ba-modal-wide']">
          <div class="ba-modal-header">
            <span>{{ editingPost.id ? 'Edit Post' : 'New Post' }}</span>
            <div class="ba-modal-header-actions">
              <button
                :class="['ba-preview-toggle', previewMode && 'active']"
                @click="previewMode = !previewMode"
                title="Toggle live preview"
              >{{ previewMode ? '← Hide Preview' : '👁 Live Preview' }}</button>
              <button class="ba-modal-close" @click="closeEditor">✕</button>
            </div>
          </div>
          <div :class="['ba-modal-body', previewMode && 'ba-modal-split']">
            <div :class="previewMode ? 'ba-editor-pane' : 'ba-editor-full'">
              <BlogPostEditor v-model="editingPost" :loading="saving" @save="savePost" @close="closeEditor" />
            </div>
            <div v-if="previewMode" class="ba-preview-pane">
              <BlogPostPreview :post="editingPost" />
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.blog-admin { display: flex; flex-direction: column; gap: 0; }

/* Banners */
.ba-banner { padding: 10px 16px; border-radius: 6px; font-size: 13px; margin-bottom: 12px; }
.ba-banner-error   { background: rgba(239,68,68,.12);  border: 1px solid rgba(239,68,68,.3);  color: #f87171; }
.ba-banner-success { background: rgba(34,197,94,.10);  border: 1px solid rgba(34,197,94,.25); color: #4ade80; }

/* ── AI Panel ──────────────────────────────────────────────────────────────── */
.ai-panel {
  border: 1px solid #2a2a38;
  border-radius: 8px;
  margin-bottom: 20px;
  background: #0f0f18;
  overflow: hidden;
}

.ai-panel-toggle {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  background: none; border: none; padding: 13px 16px; cursor: pointer;
  color: #c0bdb8;
}
.ai-panel-toggle:hover { background: #13131e; }

.ai-panel-toggle-left { display: flex; align-items: center; gap: 10px; }

.ai-chip {
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
  background: rgba(99,102,241,.2); color: #818cf8; border: 1px solid rgba(99,102,241,.3);
  padding: 2px 7px; border-radius: 3px;
}

.ai-panel-title { font-size: 13px; font-weight: 600; }

.ai-panel-caret {
  font-size: 12px; color: #555; transition: transform .2s ease;
  display: inline-block;
}
.ai-panel-caret.open { transform: rotate(180deg); }

.ai-panel-body { padding: 0 16px 16px; }

.ai-section { display: flex; flex-direction: column; gap: 10px; }

.ai-section-label {
  font-size: 12px; color: #888; padding: 4px 0;
}
.ai-section-label strong { color: #c0bdb8; }

.ai-field { display: flex; flex-direction: column; gap: 4px; }
.ai-field-grow { flex: 1; }
.ai-field-row { display: flex; gap: 10px; align-items: flex-end; }
.ai-field-row-end { justify-content: flex-end; gap: 12px; align-items: center; }

.ai-label { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: .5px; }
.ai-optional { font-weight: 400; text-transform: none; letter-spacing: 0; color: #555; }

.ai-input {
  background: #0a0a12; border: 1px solid #2a2a38; border-radius: 5px;
  color: #f0ece6; font-size: 13px; padding: 8px 10px;
  outline: none; transition: border-color .15s;
  width: 100%; box-sizing: border-box;
  font-family: inherit;
}
.ai-input:focus { border-color: #6366f1; }
.ai-textarea { resize: vertical; min-height: 56px; }

.ai-saved-at { font-size: 11px; color: #555; }

.ai-divider { height: 1px; background: #1e1e2a; margin: 14px 0; }

.ai-generate-toggle {
  background: none; border: none; color: #888; font-size: 13px; cursor: pointer;
  display: flex; align-items: center; gap: 8px; padding: 4px 0;
}
.ai-generate-toggle:hover { color: #c0bdb8; }

.ai-generate-form { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }

.ai-radio-label {
  display: flex; align-items: center; gap: 6px; font-size: 12px; color: #888;
  cursor: pointer; user-select: none;
}
.ai-radio-label:hover { color: #c0bdb8; }
.ai-radio { accent-color: #6366f1; }

.ai-btn {
  border-radius: 6px; font-size: 13px; font-weight: 600;
  padding: 7px 16px; cursor: pointer; border: none;
  display: inline-flex; align-items: center; gap: 6px;
  transition: opacity .15s;
}
.ai-btn:disabled { opacity: .5; cursor: not-allowed; }
.ai-btn-primary   { background: #6366f1; color: #fff; }
.ai-btn-primary:hover:not(:disabled) { opacity: .85; }
.ai-btn-secondary { background: #1e1e2a; color: #c0bdb8; border: 1px solid #2a2a38; }
.ai-btn-secondary:hover:not(:disabled) { border-color: #6366f1; color: #818cf8; }

.ai-spinner {
  width: 12px; height: 12px; border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff; border-radius: 50%;
  animation: ai-spin .7s linear infinite; flex-shrink: 0;
}
@keyframes ai-spin { to { transform: rotate(360deg); } }

.ai-loading { color: #555; font-size: 13px; padding: 12px 0; }

/* Header */
.ba-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.ba-title  { font-size: 20px; font-weight: 700; color: #f0ece6; margin: 0; }
.ba-header-actions { display: flex; gap: 8px; align-items: center; }
.ba-btn         { border-radius: 7px; font-size: 13px; font-weight: 600; padding: 8px 16px; cursor: pointer; border: none; }
.ba-btn-primary { background: #6366f1; color: #fff; }
.ba-btn-primary:hover { opacity: .85; }
.ba-link-btn    { font-size: 13px; color: #6366f1; text-decoration: none; padding: 8px 4px; }
.ba-link-btn:hover { text-decoration: underline; }

/* Empty / loading */
.ba-loading, .ba-empty { color: #888; font-size: 14px; padding: 40px 0; text-align: center; }
.ba-text-btn { background: none; border: none; color: #6366f1; cursor: pointer; font-size: 14px; text-decoration: underline; }

/* Post list */
.ba-list { display: flex; flex-direction: column; gap: 1px; border: 1px solid #2a2a32; border-radius: 8px; overflow: hidden; }
.ba-item { display: flex; align-items: stretch; gap: 0; background: #13131a; transition: background .15s; }
.ba-item:hover { background: #16161e; }
.ba-item-accent { width: 4px; flex-shrink: 0; }
.ba-item-info   { flex: 1; padding: 14px 16px; min-width: 0; }

.ba-item-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.ba-item-title { font-size: 15px; font-weight: 600; color: #f0ece6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.ba-ai-badge {
  flex-shrink: 0; font-size: 9px; font-weight: 700; letter-spacing: 1px;
  background: rgba(99,102,241,.18); color: #818cf8;
  border: 1px solid rgba(99,102,241,.25); padding: 1px 6px; border-radius: 3px;
}

.ba-item-meta { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; font-size: 12px; color: #666; }
.ba-slug      { font-family: 'Space Mono', monospace; color: #888; }
.ba-status    { border-radius: 4px; padding: 1px 7px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
.ba-status-pub   { background: rgba(34,197,94,.15);  color: #4ade80; }
.ba-status-draft { background: rgba(251,191,36,.12); color: #fbbf24; }
.ba-date  { color: #666; }
.ba-tags  { color: #777; font-style: italic; }
.ba-excerpt { font-size: 13px; color: #777; margin: 6px 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Item actions */
.ba-item-actions { display: flex; align-items: center; gap: 0; padding: 0 8px; flex-shrink: 0; }
.ba-action-btn {
  background: none; border: none; border-radius: 5px; color: #888;
  font-size: 12px; padding: 6px 10px; cursor: pointer; text-decoration: none;
  display: inline-flex; align-items: center;
  transition: background .12s, color .12s;
}
.ba-action-btn:hover         { background: #1e1e28; color: #f0ece6; }
.ba-action-view              { color: #6366f1; }
.ba-action-view:hover        { color: #818cf8; background: rgba(99,102,241,.1); }
.ba-action-delete:hover      { background: rgba(239,68,68,.1); color: #f87171; }
.ba-action-confirm           { color: #f87171 !important; background: rgba(239,68,68,.1) !important; }

/* ── Editor Modal ─────────────────────────────────────────────────────────── */
.ba-modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 1000;
  display: flex; align-items: stretch; justify-content: flex-end;
}
.ba-modal {
  width: min(820px, 96vw); display: flex; flex-direction: column;
  background: #0f0f14; overflow: hidden;
  box-shadow: -8px 0 40px rgba(0,0,0,.5);
  transition: width .25s ease;
}
.ba-modal-wide { width: 100vw; }
.ba-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border-bottom: 1px solid #2a2a32;
  font-size: 14px; font-weight: 600; color: #c0bdb8; background: #13131a;
  flex-shrink: 0;
}
.ba-modal-header-actions { display: flex; align-items: center; gap: 10px; }
.ba-modal-close {
  background: none; border: none; color: #666; font-size: 16px;
  cursor: pointer; padding: 4px 8px; border-radius: 5px;
}
.ba-modal-close:hover { background: #1e1e28; color: #f0ece6; }
.ba-preview-toggle {
  background: none; border: 1px solid #3a3a48; border-radius: 5px;
  color: #888; font-size: 12px; padding: 5px 12px; cursor: pointer;
  transition: border-color .15s, color .15s, background .15s;
  white-space: nowrap;
}
.ba-preview-toggle:hover        { border-color: #6366f1; color: #818cf8; background: rgba(99,102,241,.08); }
.ba-preview-toggle.active       { border-color: #6366f1; color: #818cf8; background: rgba(99,102,241,.12); }

.ba-modal-body  { flex: 1; overflow-y: auto; }
.ba-editor-full { min-height: 100%; }

.ba-modal-split  { display: flex; flex-direction: row; overflow: hidden; }
.ba-editor-pane  { flex: 0 0 50%; overflow-y: auto; border-right: 1px solid #2a2a32; }
.ba-preview-pane { flex: 1; overflow-y: auto; background: #0a0a0e; }

@media (max-width: 768px) {
  .ba-modal-split  { flex-direction: column; }
  .ba-editor-pane  { flex: 0 0 auto; }
  .ba-preview-pane { flex: 1; min-height: 50vh; border-top: 1px solid #2a2a32; border-right: none; }
}
</style>
