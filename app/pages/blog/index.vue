<script setup lang="ts">
import type { BlogPost } from '~/types'

useHead({ title: 'Blog — ILYTAT Sites' })

const { getPublishedPosts } = useBlog()
const posts = ref<BlogPost[]>([])
const loading = ref(true)

onMounted(async () => {
  posts.value = await getPublishedPosts()
  loading.value = false
})

const formatDate = (date: Date | undefined | null) => {
  if (!date) return ''
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}
</script>

<template>
  <div class="pt-28 pb-24">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="text-center mb-16">
        <span class="text-orange-400 text-sm font-semibold uppercase tracking-widest mb-3 block">
          Blog
        </span>
        <h1 class="font-display text-5xl sm:text-6xl font-bold text-white mb-4">
          Tips, insights &<br /><span class="gradient-text">local business advice</span>
        </h1>
        <p class="text-slate-400 text-xl max-w-2xl mx-auto">
          Practical guides and ideas for small businesses on web design, marketing, and branding.
        </p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-20">
        <div class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>

      <!-- Empty -->
      <div v-else-if="posts.length === 0" class="text-center py-20">
        <UIcon name="i-heroicons-document-text" class="w-14 h-14 text-slate-700 mx-auto mb-4" />
        <p class="text-slate-400 text-lg">No posts yet — check back soon.</p>
      </div>

      <!-- Post list -->
      <div v-else class="space-y-8">
        <NuxtLink
          v-for="post in posts"
          :key="post.id"
          :to="`/blog/${post.slug}`"
          class="group block glass border border-white/5 hover:border-orange-500/20 rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
        >
          <!-- Cover image -->
          <div
            v-if="post.coverImage"
            class="h-52 bg-slate-900 overflow-hidden"
          >
            <img
              :src="post.coverImage"
              :alt="post.title"
              class="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
            />
          </div>

          <div class="p-8">
            <!-- Tags -->
            <div v-if="post.tags?.length" class="flex flex-wrap gap-2 mb-4">
              <span
                v-for="tag in post.tags"
                :key="tag"
                class="text-xs font-medium text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full"
              >
                {{ tag }}
              </span>
            </div>

            <h2 class="font-display text-2xl font-bold text-white mb-3 group-hover:text-orange-300 transition-colors">
              {{ post.title }}
            </h2>
            <p class="text-slate-400 leading-relaxed mb-5">{{ post.excerpt }}</p>

            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                  <UIcon name="i-heroicons-user" class="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <span class="text-sm font-medium text-white">{{ post.author }}</span>
                  <span class="text-slate-500 text-sm mx-2">·</span>
                  <span class="text-slate-400 text-sm">{{ formatDate(post.publishedAt) }}</span>
                </div>
              </div>
              <span class="text-orange-400 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                Read more
                <UIcon name="i-heroicons-arrow-right" class="w-4 h-4" />
              </span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
