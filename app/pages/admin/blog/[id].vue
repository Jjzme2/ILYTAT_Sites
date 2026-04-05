<script setup lang="ts">
import type { BlogPost } from '~/types'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })
useHead({ title: 'Edit Post — ILYTAT Sites' })

const route = useRoute()
const { isAdmin } = useAuth()
const { getPostById, updatePost } = useBlog()

const original = ref<BlogPost | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref(false)

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

onMounted(async () => {
  if (!isAdmin.value) {
    navigateTo('/dashboard')
    return
  }
  const post = await getPostById(route.params.id as string)
  if (!post) {
    navigateTo('/admin/blog')
    return
  }
  original.value = post
  form.title = post.title
  form.slug = post.slug
  form.excerpt = post.excerpt
  form.content = post.content
  form.coverImage = post.coverImage ?? ''
  form.author = post.author
  form.tagsRaw = (post.tags ?? []).join(', ')
  form.status = post.status
  loading.value = false
})

const slugify = (text: string) =>
  text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')

const handleTitleBlur = () => {
  if (form.slug === slugify(original.value?.title ?? '')) {
    form.slug = slugify(form.title)
  }
}

const handleSave = async (status: 'draft' | 'published') => {
  if (!form.title.trim() || !form.slug.trim() || !form.excerpt.trim() || !form.content.trim() || !form.author.trim()) {
    error.value = 'Title, slug, excerpt, content, and author are required.'
    return
  }
  error.value = ''
  success.value = false
  saving.value = true
  try {
    const wasPublished = original.value?.status === 'published'
    await updatePost(
      route.params.id as string,
      {
        title: form.title.trim(),
        slug: form.slug.trim(),
        excerpt: form.excerpt.trim(),
        content: form.content.trim(),
        coverImage: form.coverImage.trim() || undefined,
        author: form.author.trim(),
        tags: form.tagsRaw.split(',').map((t) => t.trim()).filter(Boolean),
        status,
        publishedAt: original.value?.publishedAt ?? undefined,
      },
      wasPublished,
    )
    form.status = status
    if (original.value) original.value.status = status
    success.value = true
    setTimeout(() => { success.value = false }, 3000)
  } catch (e) {
    error.value = 'Failed to save. Please try again.'
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
        <h1 class="font-display text-3xl font-bold text-white">Edit Post</h1>
        <p class="text-slate-400 mt-0.5 text-sm">Update your blog post.</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <div v-else class="space-y-6">
      <!-- Messages -->
      <div v-if="error" class="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
        {{ error }}
      </div>
      <div v-if="success" class="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
        <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
        Post saved successfully.
      </div>

      <!-- Core fields -->
      <div class="glass border border-white/5 rounded-2xl p-6 space-y-5">
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-2">Title <span class="text-red-400">*</span></label>
          <input
            v-model="form.title"
            type="text"
            placeholder="Your post title"
            class="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
            @blur="handleTitleBlur"
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
          <p class="text-slate-500 text-xs mt-1.5">URL: /blog/{{ form.slug || '…' }}</p>
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
            placeholder="Write your post here…"
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
      <div class="flex items-center justify-between pt-2">
        <div class="flex items-center gap-2">
          <span
            :class="[
              'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full',
              form.status === 'published'
                ? 'bg-green-500/10 text-green-400'
                : 'bg-slate-500/10 text-slate-400',
            ]"
          >
            <span
              :class="[
                'w-1.5 h-1.5 rounded-full',
                form.status === 'published' ? 'bg-green-400' : 'bg-slate-500',
              ]"
            />
            {{ form.status === 'published' ? 'Published' : 'Draft' }}
          </span>
          <NuxtLink
            v-if="form.status === 'published'"
            :to="`/blog/${form.slug}`"
            target="_blank"
            class="text-xs text-slate-500 hover:text-orange-400 transition-colors flex items-center gap-1"
          >
            View live
            <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3" />
          </NuxtLink>
        </div>

        <div class="flex items-center gap-3">
          <NuxtLink
            to="/admin/blog"
            class="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </NuxtLink>
          <button
            v-if="form.status === 'published'"
            :disabled="saving"
            class="px-5 py-2.5 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors disabled:opacity-40"
            @click="handleSave('draft')"
          >
            Revert to Draft
          </button>
          <button
            :disabled="saving"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-all hover:-translate-y-0.5 shadow-lg shadow-orange-500/20 disabled:opacity-40 disabled:translate-y-0"
            @click="handleSave(form.status === 'published' ? 'published' : 'published')"
          >
            <UIcon v-if="saving" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
            <UIcon v-else name="i-heroicons-check" class="w-4 h-4" />
            {{ form.status === 'published' ? 'Save Changes' : 'Publish' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
