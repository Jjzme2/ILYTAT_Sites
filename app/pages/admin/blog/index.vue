<script setup lang="ts">
import type { BlogPost } from '~/types'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })
useHead({ title: 'Blog Management — ILYTAT Sites' })

const { isAdmin } = useAuth()
const { getAllPosts, deletePost } = useBlog()

const posts = ref<BlogPost[]>([])
const loading = ref(true)
const deleting = ref<string | null>(null)

onMounted(async () => {
  if (!isAdmin.value) {
    navigateTo('/dashboard')
    return
  }
  posts.value = await getAllPosts()
  loading.value = false
})

const formatDate = (date: Date | undefined | null) => {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

const handleDelete = async (post: BlogPost) => {
  if (!post.id) return
  if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return
  deleting.value = post.id
  await deletePost(post.id)
  posts.value = posts.value.filter((p) => p.id !== post.id)
  deleting.value = null
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="font-display text-3xl font-bold text-white">Blog</h1>
        <p class="text-slate-400 mt-1">Manage your blog posts.</p>
      </div>
      <NuxtLink
        to="/admin/blog/new"
        class="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-orange-500/20"
      >
        <UIcon name="i-heroicons-plus" class="w-4 h-4" />
        New Post
      </NuxtLink>
    </div>

    <div class="glass border border-white/5 rounded-2xl overflow-hidden">
      <!-- Loading -->
      <div v-if="loading" class="p-12 flex justify-center">
        <div class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>

      <!-- Empty -->
      <div v-else-if="posts.length === 0" class="p-12 text-center">
        <UIcon name="i-heroicons-document-text" class="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p class="text-slate-400 mb-5">No posts yet.</p>
        <NuxtLink
          to="/admin/blog/new"
          class="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-6 py-3 rounded-xl transition-all"
        >
          Write your first post
          <UIcon name="i-heroicons-arrow-right" class="w-4 h-4" />
        </NuxtLink>
      </div>

      <!-- Table -->
      <div v-else>
        <div class="px-6 py-4 border-b border-white/5 grid grid-cols-12 gap-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
          <span class="col-span-5">Title</span>
          <span class="col-span-2">Status</span>
          <span class="col-span-2">Published</span>
          <span class="col-span-3 text-right">Actions</span>
        </div>

        <div class="divide-y divide-white/5">
          <div
            v-for="post in posts"
            :key="post.id"
            class="px-6 py-4 grid grid-cols-12 gap-4 items-center"
          >
            <!-- Title -->
            <div class="col-span-5 min-w-0">
              <p class="font-medium text-white truncate">{{ post.title }}</p>
              <p class="text-slate-500 text-sm truncate mt-0.5">{{ post.excerpt }}</p>
            </div>

            <!-- Status -->
            <div class="col-span-2">
              <span
                :class="[
                  'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full',
                  post.status === 'published'
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-slate-500/10 text-slate-400',
                ]"
              >
                <span
                  :class="[
                    'w-1.5 h-1.5 rounded-full',
                    post.status === 'published' ? 'bg-green-400' : 'bg-slate-500',
                  ]"
                />
                {{ post.status === 'published' ? 'Published' : 'Draft' }}
              </span>
            </div>

            <!-- Published date -->
            <div class="col-span-2 text-slate-400 text-sm">
              {{ formatDate(post.publishedAt) }}
            </div>

            <!-- Actions -->
            <div class="col-span-3 flex items-center justify-end gap-2">
              <NuxtLink
                v-if="post.status === 'published'"
                :to="`/blog/${post.slug}`"
                target="_blank"
                class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                title="View live"
              >
                <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-4 h-4" />
              </NuxtLink>
              <NuxtLink
                :to="`/admin/blog/${post.id}`"
                class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Edit"
              >
                <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
              </NuxtLink>
              <button
                :disabled="deleting === post.id"
                class="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                title="Delete"
                @click="handleDelete(post)"
              >
                <UIcon
                  :name="deleting === post.id ? 'i-heroicons-arrow-path' : 'i-heroicons-trash'"
                  class="w-4 h-4"
                  :class="{ 'animate-spin': deleting === post.id }"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
