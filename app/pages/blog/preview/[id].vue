<script setup lang="ts">
/**
 * /blog/preview/:id
 * Admin-only draft preview. Renders a post (any status) using the real blog layout.
 * Accessible only when logged in as admin — the API route enforces this.
 */
import type { BlogPost } from '~/types'

definePageMeta({ layout: 'blog' })

const route = useRoute()
const id = route.params.id as string

const { data: post, error } = await useFetch<BlogPost>(`/api/admin/blog/preview/${id}`)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found', fatal: true })
}

const DEFAULT_COVER = 'https://media.ilytat.com/blog-covers/general-image.png'
const coverImage = computed(() => post.value?.coverImage || DEFAULT_COVER)

const postVars = computed(() => {
  const style = post.value?.style
  return {
    '--accent': style?.accentColor || 'var(--theme-accent)',
    '--font-body': style?.fontStyle === 'serif'
      ? "'Georgia', 'Times New Roman', serif"
      : "'Inter', system-ui, sans-serif",
  }
})

useHead(() => ({
  title: post.value ? `[DRAFT] ${post.value.title} — ILYTAT` : 'Draft Preview',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
}))

function formatDate(d: Date | string | null | undefined) {
  if (!d) return ''
  return new Date(d as string).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<template>
  <article v-if="post" class="post-page" :style="postVars">
    <!-- Draft banner -->
    <div class="draft-banner">
      <span class="draft-label">Draft Preview</span>
      <span class="draft-info">
        This post is not publicly visible.
        <NuxtLink to="/admin" class="draft-link">Edit in Admin →</NuxtLink>
      </span>
    </div>

    <!-- Hero -->
    <header
      class="post-hero"
      :class="[`hero-${post.style?.heroStyle || 'gradient'}`]"
      :style="post.style?.heroStyle === 'image'
        ? { backgroundImage: `url(${coverImage})` }
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
          <span class="byline-sep" v-if="post.authorName">·</span>
          <time v-if="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
          <span v-else class="draft-time">Unpublished</span>
        </div>
      </div>
    </header>

    <!-- Cover image for non-image hero styles -->
    <div
      v-if="post.style?.heroStyle !== 'image'"
      class="post-cover-img"
    >
      <NuxtImg :src="coverImage" :alt="post.title" loading="eager" />
    </div>

    <!-- Body -->
    <div class="post-container">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="post-content prose" v-html="post.content" />

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
/* Draft banner */
.draft-banner {
  display: flex; align-items: center; justify-content: center; gap: 16px;
  padding: 8px 20px; flex-wrap: wrap;
  background: var(--callout-warn-bg); border-bottom: 1px solid var(--callout-warn-border);
}
.draft-label {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .06em; color: var(--status-warn);
  background: var(--callout-warn-bg); border-radius: 4px; padding: 2px 8px;
}
.draft-info { font-size: 13px; color: var(--theme-text-muted); }
.draft-link { color: var(--theme-accent); text-decoration: underline; }
.draft-time { color: var(--theme-text-ghost); font-style: italic; }

/* ── The rest mirrors [slug].vue ──────────────────────────────────────────── */
.post-page { min-height: 100vh; font-family: var(--font-body, 'Inter', sans-serif); }

.post-hero {
  padding: clamp(36px, 8vw, 72px) 20px clamp(32px, 6vw, 56px); text-align: center;
  border-bottom: 1px solid var(--glass-card-border);
}
.hero-gradient {
  background:
    radial-gradient(ellipse 100% 120% at 50% -10%, color-mix(in srgb, var(--accent) 40%, transparent) 0%, transparent 65%),
    radial-gradient(ellipse 60% 40% at 50% 0%, color-mix(in srgb, var(--accent) 18%, transparent) 0%, transparent 100%);
}
.hero-minimal { background: transparent; }
.hero-image { background-size: cover; background-position: center; position: relative; }
.hero-image::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,.5), rgba(0,0,0,.75));
}
.post-hero-inner { position: relative; max-width: 720px; margin: 0 auto; }

.post-tags { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 16px; }
.post-tag {
  background: color-mix(in srgb, var(--accent, var(--theme-accent)) 18%, transparent);
  color: var(--accent, var(--theme-accent));
  border-radius: 5px; padding: 3px 10px; font-size: 12px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .04em;
}
.post-heading {
  font-size: clamp(1.8rem, 5vw, 3rem); font-weight: 800; color: var(--theme-fg);
  line-height: 1.2; margin: 0 0 16px;
}
.post-excerpt { font-size: clamp(15px, 2vw, 18px); color: var(--theme-text-muted); max-width: 600px; margin: 0 auto 20px; line-height: 1.6; }
.post-byline { font-size: 14px; color: var(--theme-text-muted); display: flex; gap: 8px; justify-content: center; }
.byline-sep { color: var(--theme-text-ghost); }
.post-cover-img { max-width: 860px; margin: 0 auto; padding: 0 24px; }
.post-cover-img img { width: 100%; border-radius: 10px; margin-top: -20px; box-shadow: var(--card-shadow-deep); }

.post-container { max-width: 720px; margin: 0 auto; padding: clamp(28px, 6vw, 48px) 20px clamp(48px, 8vw, 80px); }

.prose { line-height: 1.8; color: var(--theme-text-hi); font-size: clamp(15px, 2vw, 17px); }
:deep(.prose h1) { font-size: 2em; font-weight: 800; color: var(--theme-fg); margin: 1.2em 0 .4em; }
:deep(.prose h2) { font-size: 1.5em; font-weight: 700; color: var(--theme-fg); margin: 1.1em 0 .4em; border-bottom: 1px solid var(--glass-card-border); padding-bottom: .3em; }
:deep(.prose h3) { font-size: 1.2em; font-weight: 600; color: var(--theme-fg); margin: 1em 0 .3em; }
:deep(.prose p) { margin: .9em 0; }
:deep(.prose a) { color: var(--accent, var(--theme-accent)); text-decoration: underline; text-underline-offset: 2px; }
:deep(.prose strong) { color: var(--theme-fg); font-weight: 600; }
:deep(.prose ul) { padding-left: 1.5em; list-style: disc; margin: .8em 0; }
:deep(.prose ol) { padding-left: 1.5em; list-style: decimal; margin: .8em 0; }
:deep(.prose li) { margin: .3em 0; }
:deep(.prose blockquote) {
  border-left: 3px solid var(--accent, var(--theme-accent)); margin: 1.2em 0;
  padding: .6em 1em; background: var(--quote-bg);
  border-radius: 0 6px 6px 0; color: var(--theme-text-muted); font-style: italic;
}
:deep(.prose code) { background: var(--code-bg); border-radius: 4px; padding: 2px 6px; font-family: 'Space Mono', monospace; font-size: .88em; color: var(--theme-text-hi); }
:deep(.prose pre) { background: var(--theme-surface-alt); border: 1px solid var(--glass-card-border); border-radius: 10px; padding: 18px 22px; overflow-x: auto; margin: 1.2em 0; }
:deep(.prose pre code) { background: none; padding: 0; font-size: .9em; }
:deep(.prose img) { max-width: 100%; border-radius: 8px; margin: 1em 0; display: block; }
:deep(.prose hr) { border: none; border-top: 1px solid var(--glass-card-border); margin: 2em 0; }

:deep(.prose [data-callout]) { border-radius: 8px; margin: 1.2em 0; overflow: hidden; border: 1px solid; }
:deep(.prose [data-callout='info'])    { background: var(--callout-info-bg);  border-color: var(--callout-info-border); }
:deep(.prose [data-callout='warning']) { background: var(--callout-warn-bg);  border-color: var(--callout-warn-border); }
:deep(.prose [data-callout='success']) { background: var(--callout-ok-bg);   border-color: var(--callout-ok-border); }
:deep(.prose [data-callout='danger'])  { background: var(--callout-bad-bg);   border-color: var(--callout-bad-border); }
:deep(.prose [data-callout] .callout-type-select) { display: none; }
:deep(.prose [data-callout] .callout-header),
:deep(.prose [data-callout] > div:first-child) {
  display: flex; align-items: center; gap: 8px; padding: 8px 14px;
  border-bottom: 1px solid var(--glass-card-bg);
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
}
:deep(.prose [data-callout='info']    .callout-header) { color: var(--theme-accent); }
:deep(.prose [data-callout='warning'] .callout-header) { color: var(--status-warn); }
:deep(.prose [data-callout='success'] .callout-header) { color: var(--status-good); }
:deep(.prose [data-callout='danger']  .callout-header) { color: var(--status-bad); }
:deep(.prose [data-callout] .callout-content),
:deep(.prose [data-callout] > div:last-child) { padding: 12px 14px; }

:deep(.prose details) { border: 1px solid var(--glass-card-border); border-radius: 8px; margin: 1.2em 0; background: var(--theme-surface-alt); overflow: hidden; }
:deep(.prose details summary) { cursor: pointer; padding: 12px 16px; font-weight: 600; color: var(--theme-text-hi); list-style: none; user-select: none; transition: background .15s; }
:deep(.prose details summary:hover) { background: var(--theme-surface-alt); }
:deep(.prose details[open] summary) { border-bottom: 1px solid var(--glass-card-border); }
:deep(.prose details .accordion-body),
:deep(.prose details > div) { padding: 14px 16px; }

.post-footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--glass-card-border); }
.post-footer-tags { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 20px; }
.footer-tags-label { font-size: 13px; color: var(--theme-text-ghost); }
.back-link { color: var(--accent, var(--theme-accent)); text-decoration: none; font-size: 14px; font-weight: 600; }
.back-link:hover { text-decoration: underline; }
</style>
