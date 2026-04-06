<script setup lang="ts">
import type { BlogPost } from '~/types'

definePageMeta({ layout: 'blog' })

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data: post, error } = await useFetch<BlogPost>(() => `/api/blog/${slug.value}`)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found', fatal: true })
}

// Per-post CSS variables
const postVars = computed(() => {
  const style = post.value?.style
  return {
    '--accent': style?.accentColor || '#6366f1',
    '--font-body': style?.fontStyle === 'serif'
      ? "'Georgia', 'Times New Roman', serif"
      : "'Inter', system-ui, sans-serif",
  }
})

useHead(() => ({
  title: post.value ? `${post.value.title} — ILYTAT Blog` : 'Blog — ILYTAT',
  meta: [
    { name: 'description', content: post.value?.excerpt || '' },
    { property: 'og:title', content: post.value?.title || '' },
    { property: 'og:description', content: post.value?.excerpt || '' },
    { property: 'og:image', content: post.value?.coverImage || '' },
    { property: 'og:type', content: 'article' },
  ],
}))

function formatDate(d: Date | string | null | undefined) {
  if (!d) return ''
  return new Date(d as string).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<template>
  <article v-if="post" class="post-page" :style="postVars">
    <!-- ── Hero ─────────────────────────────────────────────────────────────── -->
    <header
      class="post-hero"
      :class="[`hero-${post.style?.heroStyle || 'gradient'}`]"
      :style="post.style?.heroStyle === 'image' && post.coverImage
        ? { backgroundImage: `url(${post.coverImage})` }
        : {}"
    >
      <div class="post-hero-inner">
        <div v-if="post.tags?.length" class="post-tags">
          <span v-for="tag in post.tags" :key="tag" class="post-tag">{{ tag }}</span>
        </div>
        <h1 class="post-heading">{{ post.title }}</h1>
        <p v-if="post.excerpt" class="post-excerpt">{{ post.excerpt }}</p>
        <div class="post-byline">
          <span v-if="post.authorName">{{ post.authorName }}</span>
          <span class="byline-sep" v-if="post.authorName && post.publishedAt">·</span>
          <time v-if="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
        </div>
      </div>
    </header>

    <!-- Cover image for non-image hero styles -->
    <div
      v-if="post.coverImage && post.style?.heroStyle !== 'image'"
      class="post-cover-img"
    >
      <NuxtImg :src="post.coverImage" :alt="post.title" loading="eager" />
    </div>

    <!-- ── Body ─────────────────────────────────────────────────────────────── -->
    <div class="post-container">
      <div class="post-content prose" v-html="post.content" />

      <!-- Footer -->
      <footer class="post-footer">
        <div v-if="post.tags?.length" class="post-footer-tags">
          <span class="footer-tags-label">Tags:</span>
          <span v-for="tag in post.tags" :key="tag" class="post-tag">{{ tag }}</span>
        </div>
        <NuxtLink to="/blog" class="back-link">← Back to Blog</NuxtLink>
      </footer>
    </div>
  </article>
</template>

<style scoped>
/* ── Page layout ────────────────────────────────────────────────────────────── */
.post-page { min-height: 100vh; font-family: var(--font-body, 'Inter', sans-serif); }

/* ── Hero variants ──────────────────────────────────────────────────────────── */
.post-hero {
  padding: clamp(36px, 8vw, 72px) 20px clamp(32px, 6vw, 56px); text-align: center;
  border-bottom: 1px solid #1e1e28;
}
.hero-gradient {
  background: radial-gradient(ellipse 80% 60% at 50% -10%, color-mix(in srgb, var(--accent) 22%, transparent), transparent);
}
.hero-minimal { background: transparent; }
.hero-image {
  background-size: cover; background-position: center; position: relative;
}
.hero-image::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,.5), rgba(0,0,0,.75));
}
.post-hero-inner { position: relative; max-width: 720px; margin: 0 auto; }

/* Tags */
.post-tags { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 16px; }
.post-tag {
  background: color-mix(in srgb, var(--accent, #6366f1) 18%, transparent);
  color: var(--accent, #6366f1);
  border-radius: 5px; padding: 3px 10px; font-size: 12px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .04em;
}

.post-heading {
  font-size: clamp(1.8rem, 5vw, 3rem); font-weight: 800; color: #f0ece6;
  line-height: 1.2; margin: 0 0 16px;
}
.post-excerpt { font-size: clamp(15px, 2vw, 18px); color: #9996a8; max-width: 600px; margin: 0 auto 20px; line-height: 1.6; }
.post-byline { font-size: 14px; color: #777; display: flex; gap: 8px; justify-content: center; }
.byline-sep { color: #444; }

/* Cover image */
.post-cover-img { max-width: 860px; margin: 0 auto; padding: 0 24px; }
.post-cover-img img { width: 100%; border-radius: 10px; margin-top: -20px; box-shadow: 0 20px 60px rgba(0,0,0,.4); }

/* ── Body ──────────────────────────────────────────────────────────────────── */
.post-container { max-width: 720px; margin: 0 auto; padding: clamp(28px, 6vw, 48px) 20px clamp(48px, 8vw, 80px); }

/* Prose styles applied to v-html content */
.prose { line-height: 1.8; color: #c8c4be; font-size: clamp(15px, 2vw, 17px); }
:deep(.prose h1) { font-size: 2em; font-weight: 800; color: #f0ece6; margin: 1.2em 0 .4em; }
:deep(.prose h2) { font-size: 1.5em; font-weight: 700; color: #f0ece6; margin: 1.1em 0 .4em; border-bottom: 1px solid #2a2a32; padding-bottom: .3em; }
:deep(.prose h3) { font-size: 1.2em; font-weight: 600; color: #e8e4de; margin: 1em 0 .3em; }
:deep(.prose p) { margin: .9em 0; }
:deep(.prose a) { color: var(--accent, #6366f1); text-decoration: underline; text-underline-offset: 2px; }
:deep(.prose a:hover) { opacity: .8; }
:deep(.prose strong) { color: #f0ece6; font-weight: 600; }
:deep(.prose em) { font-style: italic; }
:deep(.prose ul) { padding-left: 1.5em; list-style: disc; margin: .8em 0; }
:deep(.prose ol) { padding-left: 1.5em; list-style: decimal; margin: .8em 0; }
:deep(.prose li) { margin: .3em 0; }
:deep(.prose blockquote) {
  border-left: 3px solid var(--accent, #6366f1); margin: 1.2em 0;
  padding: .6em 1em; background: rgba(99,102,241,.06);
  border-radius: 0 6px 6px 0; color: #9996a8; font-style: italic;
}
:deep(.prose code) {
  background: #1e1e2e; border-radius: 4px; padding: 2px 6px;
  font-family: 'Space Mono', monospace; font-size: .88em; color: #c8c4be;
}
:deep(.prose pre) {
  background: #13131a; border: 1px solid #2a2a32; border-radius: 10px;
  padding: 18px 22px; overflow-x: auto; margin: 1.2em 0;
}
:deep(.prose pre code) { background: none; padding: 0; font-size: .9em; }
:deep(.prose img) { max-width: 100%; border-radius: 8px; margin: 1em 0; display: block; }
:deep(.prose hr) { border: none; border-top: 1px solid #2a2a32; margin: 2em 0; }

/* ── Callout blocks ─────────────────────────────────────────────────────────── */
:deep(.prose [data-callout]) {
  border-radius: 8px; margin: 1.2em 0; overflow: hidden;
  border: 1px solid;
}
:deep(.prose [data-callout='info'])    { background: rgba(99,102,241,.08); border-color: rgba(99,102,241,.3); }
:deep(.prose [data-callout='warning']) { background: rgba(251,191,36,.08); border-color: rgba(251,191,36,.3); }
:deep(.prose [data-callout='success']) { background: rgba(34,197,94,.08);  border-color: rgba(34,197,94,.3); }
:deep(.prose [data-callout='danger'])  { background: rgba(239,68,68,.08);  border-color: rgba(239,68,68,.3); }

/* Hide the type-selector select from view (rendered by Tiptap NodeView in editor, raw in static HTML) */
:deep(.prose [data-callout] .callout-type-select) { display: none; }

:deep(.prose [data-callout] .callout-header),
:deep(.prose [data-callout] > div:first-child) {
  display: flex; align-items: center; gap: 8px; padding: 8px 14px;
  border-bottom: 1px solid rgba(255,255,255,.07);
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
}
:deep(.prose [data-callout='info']    .callout-header),
:deep(.prose [data-callout='info']    > div:first-child) { color: #818cf8; }
:deep(.prose [data-callout='warning'] .callout-header),
:deep(.prose [data-callout='warning'] > div:first-child) { color: #fbbf24; }
:deep(.prose [data-callout='success'] .callout-header),
:deep(.prose [data-callout='success'] > div:first-child) { color: #4ade80; }
:deep(.prose [data-callout='danger']  .callout-header),
:deep(.prose [data-callout='danger']  > div:first-child) { color: #f87171; }

:deep(.prose [data-callout] .callout-content),
:deep(.prose [data-callout] > div:last-child) { padding: 12px 14px; }

/* ── Accordion / Details ────────────────────────────────────────────────────── */
:deep(.prose details) {
  border: 1px solid #2a2a32; border-radius: 8px; margin: 1.2em 0;
  background: #13131a; overflow: hidden;
}
:deep(.prose details summary) {
  cursor: pointer; padding: 12px 16px; font-weight: 600; color: #c0bdb8;
  list-style: none; user-select: none;
  transition: background .15s;
}
:deep(.prose details summary:hover) { background: #1a1a24; }
:deep(.prose details[open] summary) { border-bottom: 1px solid #2a2a32; }
:deep(.prose details .accordion-body),
:deep(.prose details > div) { padding: 14px 16px; }

/* ── Footer ─────────────────────────────────────────────────────────────────── */
.post-footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #2a2a32; }
.post-footer-tags { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 20px; }
.footer-tags-label { font-size: 13px; color: #666; }
.back-link { color: var(--accent, #6366f1); text-decoration: none; font-size: 14px; font-weight: 600; }
.back-link:hover { text-decoration: underline; }

@media (max-width: 640px) {
  .post-cover-img { padding: 0 16px; }
  .post-cover-img img { border-radius: 8px; margin-top: -12px; }
  /* Prevent code blocks from blowing out the viewport */
  :deep(.prose pre) { border-radius: 6px; padding: 14px 16px; font-size: .82em; }
  :deep(.prose code) { word-break: break-word; }
  /* Tighten callout / accordion padding on small screens */
  :deep(.prose [data-callout] .callout-content),
  :deep(.prose [data-callout] > div:last-child) { padding: 10px 12px; }
  :deep(.prose details summary) { padding: 10px 14px; }
  :deep(.prose details .accordion-body),
  :deep(.prose details > div) { padding: 12px 14px; }
}
</style>
