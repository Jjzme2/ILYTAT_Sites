<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
useHead({ title: 'New Post — ILYTAT Sites' })

const { isAdmin } = useAuth()
const { createPost } = useBlog()

const saving = ref(false)
const error = ref('')

const form = reactive({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImage: '',
  author: '',
  tagsRaw: '',
  status: 'draft' as 'draft' | 'published',
})

onMounted(() => {
  if (!isAdmin.value) navigateTo('/dashboard')
})

const slugify = (text: string) =>
  text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')

watch(
  () => form.title,
  (val) => {
    form.slug = slugify(val)
  },
)

const handleSave = async (status: 'draft' | 'published') => {
  if (!form.title.trim() || !form.slug.trim() || !form.excerpt.trim() || !form.content.trim() || !form.author.trim()) {
    error.value = 'Title, slug, excerpt, content, and author are required.'
    return
  }
  error.value = ''
  saving.value = true
  try {
    await createPost({
      title: form.title.trim(),
      slug: form.slug.trim(),
      excerpt: form.excerpt.trim(),
      content: form.content.trim(),
      coverImage: form.coverImage.trim() || undefined,
      author: form.author.trim(),
      tags: form.tagsRaw.split(',').map((t) => t.trim()).filter(Boolean),
      status,
    })
    navigateTo('/admin/blog')
  } catch (e) {
    error.value = 'Failed to save post. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl">
    <div class="flex items-center gap-4 mb-8">
      <NuxtLink
        to="/admin/blog"
        class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
      >
        <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
      </NuxtLink>
      <div>
        <h1 class="font-display text-3xl font-bold text-white">New Post</h1>
        <p class="text-slate-400 mt-0.5 text-sm">Write and publish a blog post.</p>
      </div>
    </div>

    <div class="space-y-6">
      <!-- Error -->
      <div v-if="error" class="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
        {{ error }}
      </div>

      <!-- Title -->
      <div class="glass border border-white/5 rounded-2xl p-6 space-y-5">
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">Title <span class="text-red-400">*</span></label>
          <input
            v-model="form.title"
            type="text"
            placeholder="Your post title"
            class="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">Slug <span class="text-red-400">*</span></label>
          <input
            v-model="form.slug"
            type="text"
            placeholder="your-post-slug"
            class="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-orange-500/50 transition-colors"
          />
          <p class="text-slate-500 text-xs mt-1.5">Auto-generated from title. URL: /blog/{{ form.slug || '…' }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">Author <span class="text-red-400">*</span></label>
          <input
            v-model="form.author"
            type="text"
            placeholder="Author name"
            class="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
          />
        </div>
      </div>

      <!-- Content -->
      <div class="glass border border-white/5 rounded-2xl p-6 space-y-5">
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">Excerpt <span class="text-red-400">*</span></label>
          <textarea
            v-model="form.excerpt"
            rows="3"
            placeholder="A short summary shown on the blog listing page…"
            class="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors resize-y"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">Content <span class="text-red-400">*</span></label>
          <textarea
            v-model="form.content"
            rows="16"
            placeholder="Write your post here…&#10;&#10;Separate paragraphs with a blank line."
            class="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors resize-y font-mono"
          />
          <p class="text-slate-500 text-xs mt-1.5">Separate paragraphs with a blank line.</p>
        </div>
      </div>

      <!-- Metadata -->
      <div class="glass border border-white/5 rounded-2xl p-6 space-y-5">
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">Cover Image URL</label>
          <input
            v-model="form.coverImage"
            type="url"
            placeholder="https://example.com/image.jpg"
            class="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">Tags</label>
          <input
            v-model="form.tagsRaw"
            type="text"
            placeholder="web design, tips, marketing"
            class="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
          />
          <p class="text-slate-500 text-xs mt-1.5">Comma-separated list of tags.</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-2">
        <NuxtLink
          to="/admin/blog"
          class="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          Cancel
        </NuxtLink>
        <button
          :disabled="saving"
          class="px-5 py-2.5 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors disabled:opacity-40"
          @click="handleSave('draft')"
        >
          Save Draft
        </button>
        <button
          :disabled="saving"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-all hover:-translate-y-0.5 shadow-lg shadow-orange-500/20 disabled:opacity-40 disabled:translate-y-0"
          @click="handleSave('published')"
        >
          <UIcon v-if="saving" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
          <UIcon v-else name="i-heroicons-globe-alt" class="w-4 h-4" />
          Publish
        </button>
      </div>
    </div>
  </div>
</template>
