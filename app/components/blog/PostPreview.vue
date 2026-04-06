<script setup lang="ts">
import type { BlogPost } from '~/types'

const props = defineProps<{ post: Partial<BlogPost> }>()

const DEFAULT_COVER = 'https://media.ilytat.com/blog-covers/general-image.png'
const coverImage = computed(() => props.post.coverImage || DEFAULT_COVER)

const postVars = computed(() => ({
  '--accent': props.post.style?.accentColor || '#6366f1',
  '--font-body': props.post.style?.fontStyle === 'serif'
    ? "'Georgia', 'Times New Roman', serif"
    : "'Inter', system-ui, sans-serif",
}))

function formatDate(d: Date | string | null | undefined) {
  if (!d) return ''
  return new Date(d as string).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<template>
  <div class="post-preview" :style="postVars">
    <!-- Draft badge -->
    <div class="preview-badge">
      <span>Draft Preview</span>
    </div>

    <!-- Hero -->
    <header
      class="post-hero"
      :class="`hero-${post.style?.heroStyle || 'gradient'}`"
      :style="post.style?.heroStyle === 'image' ? { backgroundImage: `url(${coverImage})` } : {}"
    >
      <div class="post-hero-inner">
        <div v-if="post.tags?.length" class="post-tags">
          <span v-for="tag in post.tags" :key="tag" class="post-tag">{{ tag }}</span>
        </div>
        <h1 class="post-heading">{{ post.title || 'Untitled Post' }}</h1>
        <p v-if="post.excerpt" class="post-excerpt">{{ post.excerpt }}</p>
        <div class="post-byline">
          <span v-if="post.authorName">{{ post.authorName }}</span>
          <span v-if="post.authorName" class="byline-sep">·</span>
          <time>{{ formatDate(post.publishedAt) || 'Unpublished' }}</time>
        </div>
      </div>
    </header>

    <!-- Cover image (non-image hero styles) -->
    <div v-if="post.style?.heroStyle !== 'image'" class="post-cover-img">
      <img :src="coverImage" :alt="post.title || 'Cover'" loading="lazy" />
    </div>

    <!-- Content -->
    <div class="post-container">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="post.content" class="post-content prose" v-html="post.content" />
      <div v-else class="preview-empty">Start writing to see your post here…</div>
    </div>
  </div>
</template>

<style scoped>
.post-preview {
  min-height: 100%;
  font-family: var(--font-body, 'Inter', system-ui, sans-serif);
  background: #0a0a0e;
}

/* Draft badge */
.preview-badge {
  display: flex; align-items: center; justify-content: center;
  padding: 6px; background: rgba(251,191,36,.08);
  border-bottom: 1px solid rgba(251,191,36,.2);
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .06em; color: #fbbf24;
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */
.post-hero {
  padding: clamp(28px, 6vw, 52px) 20px clamp(24px, 4vw, 40px);
  text-align: center; border-bottom: 1px solid #1e1e28;
}
.hero-gradient {
  background:
    radial-gradient(ellipse 100% 120% at 50% -10%, color-mix(in srgb, var(--accent) 40%, transparent) 0%, transparent 65%),
    radial-gradient(ellipse 60% 40% at 50% 0%, color-mix(in srgb, var(--accent) 18%, transparent) 0%, transparent 100%);
}
.hero-minimal { background: transparent; }
.hero-image {
  background-size: cover; background-position: center; position: relative;
}
.hero-image::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,.5), rgba(0,0,0,.75));
}
.post-hero-inner { position: relative; max-width: 640px; margin: 0 auto; }

.post-tags { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 12px; }
.post-tag {
  background: color-mix(in srgb, var(--accent, #6366f1) 18%, transparent);
  color: var(--accent, #6366f1);
  border-radius: 4px; padding: 2px 9px; font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .04em;
}
.post-heading {
  font-size: clamp(1.4rem, 3.5vw, 2.2rem); font-weight: 800; color: #f0ece6;
  line-height: 1.2; margin: 0 0 12px;
}
.post-excerpt { font-size: clamp(13px, 1.8vw, 15px); color: #9996a8; margin: 0 auto 16px; line-height: 1.6; }
.post-byline { font-size: 13px; color: #777; display: flex; gap: 6px; justify-content: center; }
.byline-sep { color: #444; }

/* Cover image */
.post-cover-img { max-width: 760px; margin: 0 auto; padding: 0 16px; }
.post-cover-img img {
  width: 100%; border-radius: 8px; display: block;
  margin-top: -16px; box-shadow: 0 16px 48px rgba(0,0,0,.4);
}

/* ── Body ──────────────────────────────────────────────────────────────────── */
.post-container { max-width: 640px; margin: 0 auto; padding: clamp(20px, 4vw, 36px) 20px clamp(36px, 6vw, 60px); }

.preview-empty { color: #444; font-size: 14px; font-style: italic; text-align: center; padding: 40px 0; }

/* Prose */
.prose { line-height: 1.8; color: #c8c4be; font-size: clamp(14px, 1.8vw, 16px); }
:deep(.prose h1) { font-size: 1.9em; font-weight: 800; color: #f0ece6; margin: 1.2em 0 .4em; }
:deep(.prose h2) { font-size: 1.45em; font-weight: 700; color: #f0ece6; margin: 1.1em 0 .4em; border-bottom: 1px solid #2a2a32; padding-bottom: .3em; }
:deep(.prose h3) { font-size: 1.15em; font-weight: 600; color: #e8e4de; margin: 1em 0 .3em; }
:deep(.prose p) { margin: .9em 0; }
:deep(.prose a) { color: var(--accent, #6366f1); text-decoration: underline; text-underline-offset: 2px; }
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
  background: #1e1e2e; border-radius: 4px; padding: 2px 5px;
  font-family: 'Space Mono', monospace; font-size: .87em; color: #c8c4be;
}
:deep(.prose pre) {
  background: #13131a; border: 1px solid #2a2a32; border-radius: 8px;
  padding: 14px 18px; overflow-x: auto; margin: 1.2em 0; font-size: .88em;
}
:deep(.prose pre code) { background: none; padding: 0; }
:deep(.prose img) { max-width: 100%; border-radius: 8px; margin: 1em 0; display: block; }
:deep(.prose hr) { border: none; border-top: 1px solid #2a2a32; margin: 1.8em 0; }

/* ── Callout blocks ──────────────────────────────────────────────────────── */
:deep(.prose [data-callout]) {
  border-radius: 8px; margin: 1.2em 0; overflow: hidden; border: 1px solid;
}
:deep(.prose [data-callout='info'])    { background: rgba(99,102,241,.08);  border-color: rgba(99,102,241,.3); }
:deep(.prose [data-callout='warning']) { background: rgba(251,191,36,.08);  border-color: rgba(251,191,36,.3); }
:deep(.prose [data-callout='success']) { background: rgba(34,197,94,.08);   border-color: rgba(34,197,94,.3); }
:deep(.prose [data-callout='danger'])  { background: rgba(239,68,68,.08);   border-color: rgba(239,68,68,.3); }
:deep(.prose [data-callout] .callout-type-select) { display: none; }
:deep(.prose [data-callout] .block-exit-hint) { display: none; }
:deep(.prose [data-callout] .callout-header),
:deep(.prose [data-callout] > div:first-child) {
  display: flex; align-items: center; gap: 8px; padding: 8px 14px;
  border-bottom: 1px solid rgba(255,255,255,.07);
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
}
:deep(.prose [data-callout='info']    .callout-header) { color: #818cf8; }
:deep(.prose [data-callout='warning'] .callout-header) { color: #fbbf24; }
:deep(.prose [data-callout='success'] .callout-header) { color: #4ade80; }
:deep(.prose [data-callout='danger']  .callout-header) { color: #f87171; }
:deep(.prose [data-callout] .callout-content),
:deep(.prose [data-callout] > div:last-child) { padding: 10px 14px; }

/* ── Accordion / Details ─────────────────────────────────────────────────── */
:deep(.prose details) {
  border: 1px solid #2a2a32; border-radius: 8px; margin: 1.2em 0;
  background: #13131a; overflow: hidden;
}
:deep(.prose details summary) {
  cursor: pointer; padding: 10px 14px; font-weight: 600; color: #c0bdb8;
  list-style: none; user-select: none; transition: background .15s;
}
:deep(.prose details summary:hover) { background: #1a1a24; }
:deep(.prose details[open] summary) { border-bottom: 1px solid #2a2a32; }
:deep(.prose details .accordion-body),
:deep(.prose details > div) { padding: 12px 14px; }
:deep(.prose .accordion-block .block-exit-hint) { display: none; }
</style>
