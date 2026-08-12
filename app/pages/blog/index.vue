<script setup lang="ts">
import type { BlogPost } from '~/types'

definePageMeta({ layout: 'blog' })

const { data: posts, pending, error } = await useFetch<BlogPost[]>('/api/blog')

const ORIGIN = 'https://sites.ilytat.com'
const description = 'Plain answers for local businesses in Kankakee County building their online presence — websites, Google visibility and what actually brings customers in.'

useHead(() => ({
  title: 'Blog — ILYTAT',
  meta: [
    { name: 'description', content: description },
    { property: 'og:title', content: 'Blog — ILYTAT' },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `${ORIGIN}/blog` },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
  // The listing had no canonical and no structured data. Blog schema with the
  // posts enumerated tells Google this is a publication rather than a page that
  // happens to have links on it, and gives each post a second path to discovery
  // beyond the sitemap.
  link: [{ rel: 'canonical', href: `${ORIGIN}/blog` }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: 'ILYTAT Blog',
        description,
        url: `${ORIGIN}/blog`,
        publisher: {
          '@type': 'Organization',
          name: 'ILYTAT LLC',
          url: ORIGIN,
          logo: { '@type': 'ImageObject', url: 'https://media.ilytat.com/logo-144.webp' },
        },
        blogPost: (posts.value ?? []).slice(0, 20).map(p => ({
          '@type': 'BlogPosting',
          headline: p.title,
          url: `${ORIGIN}/blog/${p.slug}`,
          datePublished: p.publishedAt || undefined,
        })),
      }),
    },
  ],
}))
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
  background: radial-gradient(ellipse 80% 60% at 50% -20%, color-mix(in srgb, var(--theme-accent) 16%, transparent), transparent);
  border-bottom: 1px solid var(--glass-card-border);
}
.blog-index-heading {
  font-size: clamp(2rem, 6vw, 4rem); font-weight: 800; color: var(--theme-fg); margin: 0 0 10px;
}
.blog-index-sub { font-size: clamp(15px, 2vw, 18px); color: var(--theme-text-muted); max-width: 480px; margin: 0 auto; }

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
  background: linear-gradient(90deg, var(--theme-surface-alt) 25%, var(--theme-surface-alt) 50%, var(--theme-surface-alt) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }

.blog-error, .blog-empty { text-align: center; padding: 60px 0; color: var(--theme-text-muted); font-size: 16px; }
</style>
