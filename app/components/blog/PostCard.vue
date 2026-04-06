<script setup lang="ts">
import type { BlogPost } from '~/types'

const props = defineProps<{ post: Partial<BlogPost> }>()

const accent = computed(() => props.post.style?.accentColor || '#6366f1')

function formatDate(d: Date | string | null | undefined) {
  if (!d) return ''
  return new Date(d as string).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<template>
  <NuxtLink
    :to="`/blog/${post.slug}`"
    class="post-card"
    :style="{ '--accent': accent }"
  >
    <div v-if="post.coverImage" class="post-cover">
      <NuxtImg :src="post.coverImage" :alt="post.title" loading="lazy" />
    </div>
    <div class="post-body">
      <div class="post-tags" v-if="post.tags?.length">
        <span v-for="tag in post.tags.slice(0, 3)" :key="tag" class="post-tag">{{ tag }}</span>
      </div>
      <h2 class="post-title">{{ post.title }}</h2>
      <p v-if="post.excerpt" class="post-excerpt">{{ post.excerpt }}</p>
      <div class="post-meta">
        <span v-if="post.authorName" class="post-author">{{ post.authorName }}</span>
        <span v-if="post.publishedAt" class="post-date">{{ formatDate(post.publishedAt) }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.post-card {
  display: flex; flex-direction: column; border-radius: 12px; overflow: hidden;
  background: #13131a; border: 1px solid #2a2a32; text-decoration: none;
  transition: border-color .2s, transform .2s, box-shadow .2s;
}
.post-card:hover {
  border-color: var(--accent, #6366f1);
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0,0,0,.3);
}

.post-cover { aspect-ratio: 16/9; overflow: hidden; }
.post-cover img { width: 100%; height: 100%; object-fit: cover; transition: transform .3s; }
.post-card:hover .post-cover img { transform: scale(1.03); }

.post-body { display: flex; flex-direction: column; gap: 10px; padding: 20px; flex: 1; }

.post-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.post-tag {
  background: color-mix(in srgb, var(--accent, #6366f1) 18%, transparent);
  color: var(--accent, #6366f1);
  border-radius: 4px; padding: 2px 8px; font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .04em;
}

.post-title {
  font-size: 18px; font-weight: 700; color: #f0ece6; line-height: 1.35;
  margin: 0;
}
.post-card:hover .post-title { color: var(--accent, #6366f1); }

.post-excerpt { font-size: 14px; color: #9996a8; line-height: 1.6; margin: 0; flex: 1; }

.post-meta {
  display: flex; gap: 10px; align-items: center;
  font-size: 12px; color: #666; margin-top: auto; padding-top: 4px;
  border-top: 1px solid #1e1e28;
}
.post-author { font-weight: 600; color: #888; }
</style>
