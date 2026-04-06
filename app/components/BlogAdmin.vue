<script setup lang="ts">
import type { BlogPost } from '~/types'
import { useFirebaseAuth } from '~/utils/firebase'

// ── Auth header helper ──────────────────────────────────────────────────────
async function getAdminHeaders(): Promise<Record<string, string>> {
  const auth = useFirebaseAuth()
  const token = await auth.currentUser?.getIdToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ── Error display ───────────────────────────────────────────────────────────
const error = ref('')
function showError(msg: string) {
  error.value = msg
  setTimeout(() => { error.value = '' }, 8000)
}

// ── Post list ───────────────────────────────────────────────────────────────
const posts = ref<BlogPost[]>([])
const postsLoading = ref(false)

async function loadPosts() {
  postsLoading.value = true
  try {
    posts.value = await $fetch<BlogPost[]>('/api/admin/blog', { headers: await getAdminHeaders() })
  }
  catch (e: unknown) {
    showError(`Failed to load posts: ${e instanceof Error ? e.message : String(e)}`)
  }
  finally {
    postsLoading.value = false
  }
}

onMounted(loadPosts)

// ── Editor modal ────────────────────────────────────────────────────────────
const editorOpen = ref(false)
const editingPost = ref<Partial<BlogPost>>({})
const saving = ref(false)

function openNew() {
  editingPost.value = {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    coverImage: '',
    tags: [],
    status: 'draft',
    style: { accentColor: '#6366f1', heroStyle: 'gradient', fontStyle: 'sans' },
    authorName: 'ILYTAT',
  }
  editorOpen.value = true
}

function openEdit(post: BlogPost) {
  editingPost.value = { ...post }
  editorOpen.value = true
}

function closeEditor() {
  editorOpen.value = false
  editingPost.value = {}
}

async function savePost() {
  if (!editingPost.value.title?.trim()) {
    showError('Title is required')
    return
  }
  if (!editingPost.value.slug?.trim()) {
    showError('Slug is required')
    return
  }

  saving.value = true
  try {
    const headers = await getAdminHeaders()
    if (editingPost.value.id) {
      await $fetch(`/api/admin/blog/${editingPost.value.id}`, {
        method: 'PUT',
        headers,
        body: editingPost.value,
      })
    }
    else {
      await $fetch('/api/admin/blog', {
        method: 'POST',
        headers,
        body: editingPost.value,
      })
    }
    closeEditor()
    await loadPosts()
  }
  catch (e: unknown) {
    showError(`Save failed: ${e instanceof Error ? e.message : String(e)}`)
  }
  finally {
    saving.value = false
  }
}

// ── Delete ──────────────────────────────────────────────────────────────────
const deletingId = ref<string | null>(null)
const confirmDeleteId = ref<string | null>(null)

async function deletePost(id: string) {
  if (confirmDeleteId.value !== id) {
    confirmDeleteId.value = id
    setTimeout(() => { if (confirmDeleteId.value === id) confirmDeleteId.value = null }, 3000)
    return
  }
  deletingId.value = id
  confirmDeleteId.value = null
  try {
    await $fetch(`/api/admin/blog/${id}`, { method: 'DELETE', headers: await getAdminHeaders() })
    await loadPosts()
  }
  catch (e: unknown) {
    showError(`Delete failed: ${e instanceof Error ? e.message : String(e)}`)
  }
  finally {
    deletingId.value = null
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(d: Date | string | null | undefined) {
  if (!d) return '—'
  return new Date(d as string).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="blog-admin">
    <!-- Error banner -->
    <div v-if="error" class="ba-error">{{ error }}</div>

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
          <div class="ba-item-title">{{ post.title }}</div>
          <div class="ba-item-meta">
            <span class="ba-slug">/blog/{{ post.slug }}</span>
            <span :class="['ba-status', post.status === 'published' ? 'ba-status-pub' : 'ba-status-draft']">
              {{ post.status }}
            </span>
            <span class="ba-date">{{ formatDate(post.publishedAt || post.updatedAt) }}</span>
            <span v-if="post.tags?.length" class="ba-tags">
              {{ post.tags.slice(0, 3).join(', ') }}
            </span>
          </div>
          <p v-if="post.excerpt" class="ba-excerpt">{{ post.excerpt }}</p>
        </div>
        <div class="ba-item-actions">
          <button class="ba-action-btn" @click="openEdit(post)" title="Edit">Edit</button>
          <a :href="`/blog/${post.slug}`" target="_blank" class="ba-action-btn ba-action-view" title="View">View</a>
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
        <div class="ba-modal">
          <div class="ba-modal-header">
            <span>{{ editingPost.id ? 'Edit Post' : 'New Post' }}</span>
            <button class="ba-modal-close" @click="closeEditor">✕</button>
          </div>
          <div class="ba-modal-body">
            <BlogPostEditor
              v-model="editingPost"
              :loading="saving"
              @save="savePost"
              @close="closeEditor"
            />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.blog-admin { display: flex; flex-direction: column; gap: 0; }

/* Error */
.ba-error { background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.3); color: #f87171; padding: 10px 16px; border-radius: 6px; font-size: 13px; margin-bottom: 12px; }

/* Header */
.ba-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.ba-title { font-size: 20px; font-weight: 700; color: #f0ece6; margin: 0; }
.ba-header-actions { display: flex; gap: 8px; align-items: center; }
.ba-btn { border-radius: 7px; font-size: 13px; font-weight: 600; padding: 8px 16px; cursor: pointer; border: none; }
.ba-btn-primary { background: #6366f1; color: #fff; }
.ba-btn-primary:hover { opacity: .85; }
.ba-link-btn { font-size: 13px; color: #6366f1; text-decoration: none; padding: 8px 4px; }
.ba-link-btn:hover { text-decoration: underline; }

/* Empty/loading */
.ba-loading, .ba-empty { color: #888; font-size: 14px; padding: 40px 0; text-align: center; }
.ba-text-btn { background: none; border: none; color: #6366f1; cursor: pointer; font-size: 14px; text-decoration: underline; }

/* Post list */
.ba-list { display: flex; flex-direction: column; gap: 1px; border: 1px solid #2a2a32; border-radius: 8px; overflow: hidden; }
.ba-item { display: flex; align-items: stretch; gap: 0; background: #13131a; transition: background .15s; }
.ba-item:hover { background: #16161e; }
.ba-item-accent { width: 4px; flex-shrink: 0; }
.ba-item-info { flex: 1; padding: 14px 16px; min-width: 0; }
.ba-item-title { font-size: 15px; font-weight: 600; color: #f0ece6; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ba-item-meta { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; font-size: 12px; color: #666; }
.ba-slug { font-family: 'Space Mono', monospace; color: #888; }
.ba-status { border-radius: 4px; padding: 1px 7px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
.ba-status-pub { background: rgba(34,197,94,.15); color: #4ade80; }
.ba-status-draft { background: rgba(251,191,36,.12); color: #fbbf24; }
.ba-date { color: #666; }
.ba-tags { color: #777; font-style: italic; }
.ba-excerpt { font-size: 13px; color: #777; margin: 6px 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Item actions */
.ba-item-actions { display: flex; align-items: center; gap: 0; padding: 0 8px; flex-shrink: 0; }
.ba-action-btn {
  background: none; border: none; border-radius: 5px; color: #888;
  font-size: 12px; padding: 6px 10px; cursor: pointer; text-decoration: none;
  display: inline-flex; align-items: center;
  transition: background .12s, color .12s;
}
.ba-action-btn:hover { background: #1e1e28; color: #f0ece6; }
.ba-action-view { color: #6366f1; }
.ba-action-view:hover { color: #818cf8; background: rgba(99,102,241,.1); }
.ba-action-delete:hover { background: rgba(239,68,68,.1); color: #f87171; }
.ba-action-confirm { color: #f87171 !important; background: rgba(239,68,68,.1) !important; }

/* ── Editor Modal ─────────────────────────────────────────────────────────── */
.ba-modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 1000;
  display: flex; align-items: stretch; justify-content: flex-end;
}
.ba-modal {
  width: min(820px, 96vw); display: flex; flex-direction: column;
  background: #0f0f14; overflow: hidden;
  box-shadow: -8px 0 40px rgba(0,0,0,.5);
}
.ba-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border-bottom: 1px solid #2a2a32;
  font-size: 14px; font-weight: 600; color: #c0bdb8; background: #13131a;
  flex-shrink: 0;
}
.ba-modal-close {
  background: none; border: none; color: #666; font-size: 16px;
  cursor: pointer; padding: 4px 8px; border-radius: 5px;
}
.ba-modal-close:hover { background: #1e1e28; color: #f0ece6; }
.ba-modal-body { flex: 1; overflow-y: auto; }
</style>
