<script setup lang="ts">
import type { BlogPost } from '~/types'

definePageMeta({ layout: 'blog' })

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data: post, error } = await useFetch<BlogPost>(() => `/api/blog/${slug.value}`)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found', fatal: true })
}

const DEFAULT_COVER = 'https://media.ilytat.com/blog-covers/general-image.png'
const coverImage = computed(() => post.value?.coverImage || DEFAULT_COVER)

// Per-post CSS variables
const postVars = computed(() => {
  const style = post.value?.style
  return {
    '--accent': style?.accentColor || 'var(--theme-accent)',
    '--font-body': style?.fontStyle === 'serif'
      ? "'Georgia', 'Times New Roman', serif"
      : "'Inter', system-ui, sans-serif",
  }
})

const ORIGIN = 'https://sites.ilytat.com'
const postUrl = computed(() => `${ORIGIN}/blog/${post.value?.slug ?? ''}`)

useHead(() => ({
  title: post.value ? `${post.value.title} — ILYTAT Blog` : 'Blog — ILYTAT',
  meta: [
    { name: 'description', content: post.value?.excerpt || '' },
    { property: 'og:title', content: post.value?.title || '' },
    { property: 'og:description', content: post.value?.excerpt || '' },
    { property: 'og:image', content: coverImage.value },
    { property: 'og:type', content: 'article' },
    { property: 'article:published_time', content: String(post.value?.publishedAt ?? '') },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
  // Canonical was missing entirely. Without it a post reachable by more than
  // one URL splits its own ranking signals between them.
  link: post.value ? [{ rel: 'canonical', href: postUrl.value }] : [],
  script: post.value
    ? [
        {
          // Posts carried no structured data at all — the weekly generation
          // produces the site's only regular content, and every piece of it was
          // invisible to article rich results. Author and publisher are what
          // tie each post back to the business entity, which is the point for
          // local search: it is the business being established as the source,
          // not just the page.
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.value.title,
            description: post.value.excerpt || '',
            image: coverImage.value || undefined,
            datePublished: post.value.publishedAt || undefined,
            dateModified: post.value.updatedAt || post.value.publishedAt || undefined,
            author: { '@type': 'Organization', name: 'ILYTAT LLC', url: ORIGIN },
            publisher: {
              '@type': 'Organization',
              name: 'ILYTAT LLC',
              url: ORIGIN,
              logo: { '@type': 'ImageObject', url: 'https://media.ilytat.com/logo-144.webp' },
            },
            mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl.value },
            keywords: Array.isArray(post.value.tags) ? post.value.tags.join(', ') : undefined,
          }),
        },
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` },
              { '@type': 'ListItem', position: 2, name: 'Blog', item: `${ORIGIN}/blog` },
              { '@type': 'ListItem', position: 3, name: post.value.title, item: postUrl.value },
            ],
          }),
        },
      ]
    : [],
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
          <span class="byline-sep" v-if="post.authorName && post.publishedAt">·</span>
          <time v-if="post.publishedAt">{{ formatDate(post.publishedAt) }}</time>
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

      <!-- End-of-post CTA. A reader who reached the bottom of an article is the
           warmest traffic the blog produces; previously the only exit was
           "Back to Blog". Offers the free tools first because they cost the
           reader nothing, with the contact form as the direct route. -->
      <aside class="post-cta">
        <h2 class="post-cta-title">Want to know how your own site is doing?</h2>
        <p class="post-cta-body">
          Run a free speed and SEO audit — no signup, results in about thirty seconds.
          Or tell me what you are working on and I will take a look myself.
        </p>
        <div class="post-cta-actions">
          <NuxtLink to="/tools/website-audit" class="post-cta-btn">Run a free audit</NuxtLink>
          <NuxtLink to="/#contact" class="post-cta-btn post-cta-btn-ghost">Get in touch</NuxtLink>
        </div>
        <p class="post-cta-meta">Websites for local businesses in Kankakee County, IL.</p>
      </aside>
    </div>
  </article>
</template>

<style scoped>
/* ── End-of-post CTA ────────────────────────────────────────────────────────── */
.post-cta {
  margin-top: 48px;
  padding: 36px 28px;
  border: 1px solid var(--glass-card-border);
  border-radius: var(--radius, 12px);
  background: var(--theme-surface-alt);
  text-align: center;
}
.post-cta-title {
  font-family: var(--font-display), sans-serif;
  font-size: clamp(20px, 3vw, 26px);
  font-weight: 800; letter-spacing: -0.02em;
  color: var(--theme-fg); margin: 0 0 12px;
}
.post-cta-body {
  font-size: 15px; line-height: 1.7;
  color: var(--theme-text-body);
  max-width: 460px; margin: 0 auto 24px;
}
.post-cta-actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
.post-cta-btn {
  display: inline-flex; align-items: center;
  padding: 13px 24px; border-radius: var(--radius-sm, 8px);
  background: var(--theme-btn-from); color: var(--theme-cta-text);
  font-size: 14px; font-weight: 700; text-decoration: none;
  transition: filter .2s, transform .2s;
}
.post-cta-btn:hover { filter: brightness(1.06); transform: translateY(-1px); }
.post-cta-btn-ghost {
  background: transparent; color: var(--theme-text-hi);
  border: 1px solid var(--glass-card-border);
}
.post-cta-btn-ghost:hover { border-color: color-mix(in srgb, var(--theme-accent) 45%, transparent); }
.post-cta-meta { margin: 20px 0 0; font-size: 13px; color: var(--theme-text-muted); }

/* ── Page layout ────────────────────────────────────────────────────────────── */
.post-page { min-height: 100vh; font-family: var(--font-body, 'Inter', sans-serif); }

/* ── Hero variants ──────────────────────────────────────────────────────────── */
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

/* Cover image */
.post-cover-img { max-width: 860px; margin: 0 auto; padding: 0 24px; }
.post-cover-img img { width: 100%; border-radius: 10px; margin-top: -20px; box-shadow: var(--card-shadow-deep); }

/* ── Body ──────────────────────────────────────────────────────────────────── */
.post-container { max-width: 720px; margin: 0 auto; padding: clamp(28px, 6vw, 48px) 20px clamp(48px, 8vw, 80px); }

/* Prose styles applied to v-html content */
.prose { line-height: 1.8; color: var(--theme-text-hi); font-size: clamp(15px, 2vw, 17px); }
:deep(.prose h1) { font-size: 2em; font-weight: 800; color: var(--theme-fg); margin: 1.2em 0 .4em; }
:deep(.prose h2) { font-size: 1.5em; font-weight: 700; color: var(--theme-fg); margin: 1.1em 0 .4em; border-bottom: 1px solid var(--glass-card-border); padding-bottom: .3em; }
:deep(.prose h3) { font-size: 1.2em; font-weight: 600; color: var(--theme-fg); margin: 1em 0 .3em; }
:deep(.prose p) { margin: .9em 0; }
:deep(.prose a) { color: var(--accent, var(--theme-accent)); text-decoration: underline; text-underline-offset: 2px; }
:deep(.prose a:hover) { opacity: .8; }
:deep(.prose strong) { color: var(--theme-fg); font-weight: 600; }
:deep(.prose em) { font-style: italic; }
:deep(.prose ul) { padding-left: 1.5em; list-style: disc; margin: .8em 0; }
:deep(.prose ol) { padding-left: 1.5em; list-style: decimal; margin: .8em 0; }
:deep(.prose li) { margin: .3em 0; }
:deep(.prose blockquote) {
  border-left: 3px solid var(--accent, var(--theme-accent)); margin: 1.2em 0;
  padding: .6em 1em; background: var(--quote-bg);
  border-radius: 0 6px 6px 0; color: var(--theme-text-muted); font-style: italic;
}
:deep(.prose code) {
  background: var(--code-bg); border-radius: 4px; padding: 2px 6px;
  font-family: 'Space Mono', monospace; font-size: .88em; color: var(--theme-text-hi);
}
:deep(.prose pre) {
  background: var(--theme-surface-alt); border: 1px solid var(--glass-card-border); border-radius: 10px;
  padding: 18px 22px; overflow-x: auto; margin: 1.2em 0;
}
:deep(.prose pre code) { background: none; padding: 0; font-size: .9em; }
:deep(.prose img) { max-width: 100%; border-radius: 8px; margin: 1em 0; display: block; }
:deep(.prose hr) { border: none; border-top: 1px solid var(--glass-card-border); margin: 2em 0; }

/* ── Callout blocks ─────────────────────────────────────────────────────────── */
:deep(.prose [data-callout]) {
  border-radius: 8px; margin: 1.2em 0; overflow: hidden;
  border: 1px solid;
}
:deep(.prose [data-callout='info'])    { background: var(--callout-info-bg); border-color: var(--callout-info-border); }
:deep(.prose [data-callout='warning']) { background: var(--callout-warn-bg); border-color: var(--callout-warn-border); }
:deep(.prose [data-callout='success']) { background: var(--callout-ok-bg);  border-color: var(--callout-ok-border); }
:deep(.prose [data-callout='danger'])  { background: var(--callout-bad-bg);  border-color: var(--callout-bad-border); }

/* Hide the type-selector select from view (rendered by Tiptap NodeView in editor, raw in static HTML) */
:deep(.prose [data-callout] .callout-type-select) { display: none; }

:deep(.prose [data-callout] .callout-header),
:deep(.prose [data-callout] > div:first-child) {
  display: flex; align-items: center; gap: 8px; padding: 8px 14px;
  border-bottom: 1px solid var(--glass-card-bg);
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
}
:deep(.prose [data-callout='info']    .callout-header),
:deep(.prose [data-callout='info']    > div:first-child) { color: var(--theme-accent); }
:deep(.prose [data-callout='warning'] .callout-header),
:deep(.prose [data-callout='warning'] > div:first-child) { color: var(--status-warn); }
:deep(.prose [data-callout='success'] .callout-header),
:deep(.prose [data-callout='success'] > div:first-child) { color: var(--status-good); }
:deep(.prose [data-callout='danger']  .callout-header),
:deep(.prose [data-callout='danger']  > div:first-child) { color: var(--status-bad); }

:deep(.prose [data-callout] .callout-content),
:deep(.prose [data-callout] > div:last-child) { padding: 12px 14px; }

/* ── Accordion / Details ────────────────────────────────────────────────────── */
:deep(.prose details) {
  border: 1px solid var(--glass-card-border); border-radius: 8px; margin: 1.2em 0;
  background: var(--theme-surface-alt); overflow: hidden;
}
:deep(.prose details summary) {
  cursor: pointer; padding: 12px 16px; font-weight: 600; color: var(--theme-text-hi);
  list-style: none; user-select: none;
  transition: background .15s;
}
:deep(.prose details summary:hover) { background: var(--theme-surface-alt); }
:deep(.prose details[open] summary) { border-bottom: 1px solid var(--glass-card-border); }
:deep(.prose details .accordion-body),
:deep(.prose details > div) { padding: 14px 16px; }

/* ── Footer ─────────────────────────────────────────────────────────────────── */
.post-footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--glass-card-border); }
.post-footer-tags { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 20px; }
.footer-tags-label { font-size: 13px; color: var(--theme-text-ghost); }
.back-link { color: var(--accent, var(--theme-accent)); text-decoration: none; font-size: 14px; font-weight: 600; }
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
