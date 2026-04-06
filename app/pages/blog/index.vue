<script setup lang="ts">
import type { BlogPost } from '~/types'

definePageMeta({ layout: 'blog' })

useHead({
  title: 'Blog — ILYTAT',
  meta: [
    { name: 'description', content: 'Tips, guides, and stories for local businesses building their online presence.' },
    { property: 'og:title', content: 'Blog — ILYTAT' },
  ],
})

const { data: posts, pending, error } = await useFetch<BlogPost[]>('/api/blog')
</script>

<template>
  <main class="blog-index">
    <div class="blog-index-hero">
      <h1 class="blog-index-heading">Blog</h1>
      <p class="blog-index-sub">Tips, guides, and stories for local businesses.</p>
    </div>

    <div class="blog-container">
      <div v-if="pending" class="blog-loading">
        <div class="blog-loading-grid">
          <div v-for="n in 6" :key="n" class="blog-skeleton" />
        </div>
      </div>

      <div v-else-if="error" class="blog-error">
        Could not load posts. Please try again later.
      </div>

      <div v-else-if="!posts?.length" class="blog-empty">
        No posts yet — check back soon.
      </div>

      <div v-else class="blog-grid">
        <BlogPostCard v-for="post in posts" :key="post.id" :post="post" />
      </div>
    </div>
  </main>
</template>

<style scoped>
.blog-index { min-height: 100vh; }

.blog-index-hero {
  padding: 48px 20px 36px;
  text-align: center;
  background: radial-gradient(ellipse 80% 60% at 50% -20%, rgba(99,102,241,.18), transparent);
  border-bottom: 1px solid #1e1e28;
}
.blog-index-heading {
  font-size: clamp(2rem, 6vw, 4rem); font-weight: 800; color: #f0ece6; margin: 0 0 10px;
}
.blog-index-sub { font-size: clamp(15px, 2vw, 18px); color: #9996a8; max-width: 480px; margin: 0 auto; }

.blog-container { max-width: 1200px; margin: 0 auto; padding: 48px 24px 80px; }

.blog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

/* Loading skeletons */
.blog-loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}
.blog-skeleton {
  height: 280px; border-radius: 12px;
  background: linear-gradient(90deg, #13131a 25%, #1a1a24 50%, #13131a 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }

.blog-error, .blog-empty { text-align: center; padding: 60px 0; color: #888; font-size: 16px; }
</style>
