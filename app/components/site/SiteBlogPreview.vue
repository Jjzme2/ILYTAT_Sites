<script setup lang="ts">
/**
 * SiteBlogPreview — the three most recent published posts, on the homepage.
 *
 * The blog was invisible to anyone who did not already know to visit /blog:
 * nothing on the homepage linked to it, and nothing linked to it in the nav
 * either. A weekly post that no visitor ever sees is work spent for search
 * engines alone, and the posts are the main evidence on the whole site that
 * someone here knows the subject.
 *
 * Renders nothing at all when there are no published posts. An empty
 * "From the blog" heading on a sales page reads worse than no section — and
 * this is the realistic state, since generated posts stay drafts until
 * approved.
 */
interface Post {
  id: string
  title: string
  slug: string
  excerpt?: string
  tags?: string[]
  publishedAt?: string | Date | null
}

// Shares the /blog request rather than issuing its own: both render from the
// same list, and the endpoint reads every document in the collection.
const { data } = await useFetch<Post[]>('/api/blog', {
  key: 'blog-posts',
  default: () => [],
  // A failing blog fetch must not take the homepage down with it.
  onResponseError: () => {},
})

const posts = computed(() => (data.value ?? []).slice(0, 3))

function formatDate(d: Post['publishedAt']): string {
  if (!d) return ''
  const parsed = d instanceof Date ? d : new Date(d)
  return Number.isNaN(parsed.getTime())
    ? ''
    : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <section
    v-if="posts.length"
    id="blog"
    class="max-w-[1200px] mx-auto px-4 pb-16 md:px-6 md:pb-20 lg:px-12 lg:pb-[100px]">
    <header class="mb-16 flex flex-wrap items-end justify-between gap-6" data-reveal>
      <div>
        <p class="eyebrow">From the Blog</p>
        <h2 class="font-display text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-2px] text-(--theme-fg) leading-[1.05]">
          Plain answers to the questions I get asked
        </h2>
      </div>
      <NuxtLink
        to="/blog"
        class="btn-ghost shrink-0">
        Read all posts
      </NuxtLink>
    </header>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <LumenSurface
        v-for="(post, i) in posts"
        :key="post.id"
        class="glass-deep rounded-[var(--radius)] flex flex-col transition-[border-color,box-shadow] duration-300 hover:border-[var(--glass-card-border)] hover:shadow-[var(--card-shadow)]"
        data-reveal
        :data-reveal-delay="i * 100">
        <NuxtLink
          :to="`/blog/${post.slug}`"
          class="px-7 py-8 flex flex-col gap-4 flex-1 no-underline">
          <time
            v-if="formatDate(post.publishedAt)"
            class="font-mono text-[9px] text-(--theme-text-ghost) tracking-[1.5px] uppercase">
            {{ formatDate(post.publishedAt) }}
          </time>
          <h3 class="font-display text-[19px] font-bold tracking-[-0.01em] text-(--theme-fg) leading-[1.3]">
            {{ post.title }}
          </h3>
          <p
            v-if="post.excerpt"
            class="text-[14.5px] text-(--theme-text-body) leading-[1.75] flex-1">
            {{ post.excerpt }}
          </p>
          <span class="font-mono text-[10px] text-(--theme-accent) tracking-[1.2px] uppercase mt-auto">
            Read it →
          </span>
        </NuxtLink>
      </LumenSurface>
    </div>
  </section>
</template>
