<script setup lang="ts">
import type { BlogPost } from '~/types'

const route = useRoute()
const { getPostBySlug } = useBlog()

const post = ref<BlogPost | null>(null)
const loading = ref(true)
const notFound = ref(false)

onMounted(async () => {
  const result = await getPostBySlug(route.params.slug as string)
  if (!result) {
    notFound.value = true
  } else {
    post.value = result
    useHead({
      title: `${result.title} — ILYTAT Sites`,
      meta: [{ name: 'description', content: result.excerpt }],
    })
  }
  loading.value = false
})

const formatDate = (date: Date | undefined | null) => {
  if (!date) return ''
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

const paragraphs = computed(() =>
  (post.value?.content ?? '').split(/\n\n+/).map((p) => p.trim()).filter(Boolean),
)
</script>

<template>
  <div class="pt-28 pb-24">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-20">
        <div class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>

      <!-- Not found -->
      <div v-else-if="notFound" class="text-center py-20">
        <div class="font-display text-7xl font-bold gradient-text mb-4">404</div>
        <h1 class="font-display text-2xl font-bold text-white mb-3">Post not found</h1>
        <p class="text-slate-400 mb-8">This post may have been removed or the URL is incorrect.</p>
        <NuxtLink
          to="/blog"
          class="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold px-6 py-3 rounded-xl transition-all"
        >
          <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
          Back to Blog
        </NuxtLink>
      </div>

      <!-- Post -->
      <article v-else-if="post">
        <!-- Back -->
        <NuxtLink
          to="/blog"
          class="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium mb-10 transition-colors"
        >
          <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
          All Posts
        </NuxtLink>

        <!-- Cover -->
        <div v-if="post.coverImage" class="rounded-2xl overflow-hidden mb-10 h-72">
          <img :src="post.coverImage" :alt="post.title" class="w-full h-full object-cover" />
        </div>

        <!-- Tags -->
        <div v-if="post.tags?.length" class="flex flex-wrap gap-2 mb-5">
          <span
            v-for="tag in post.tags"
            :key="tag"
            class="text-xs font-medium text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full"
          >
            {{ tag }}
          </span>
        </div>

        <!-- Title -->
        <h1 class="font-display text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
          {{ post.title }}
        </h1>

        <!-- Meta -->
        <div class="flex items-center gap-4 mb-10 pb-10 border-b border-white/5">
          <div class="w-10 h-10 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
            <UIcon name="i-heroicons-user" class="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <span class="font-medium text-white block">{{ post.author }}</span>
            <span class="text-slate-400 text-sm">{{ formatDate(post.publishedAt) }}</span>
          </div>
        </div>

        <!-- Excerpt -->
        <p class="text-slate-300 text-xl leading-relaxed mb-8 font-medium">{{ post.excerpt }}</p>

        <!-- Content -->
        <div class="space-y-5">
          <p
            v-for="(para, i) in paragraphs"
            :key="i"
            class="text-slate-300 leading-relaxed text-lg whitespace-pre-line"
          >
            {{ para }}
          </p>
        </div>

        <!-- Footer -->
        <div class="mt-16 pt-10 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p class="text-sm text-slate-500 mb-1">Written by</p>
            <p class="font-semibold text-white">{{ post.author }}</p>
          </div>
          <NuxtLink
            to="/blog"
            class="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white font-medium px-5 py-2.5 rounded-xl transition-colors border border-white/10"
          >
            <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
            More Posts
          </NuxtLink>
        </div>
      </article>
    </div>
  </div>
</template>
