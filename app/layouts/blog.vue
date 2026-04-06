<script setup lang="ts">
const scrolled = ref(false)

onMounted(() => {
  const onScroll = () => { scrolled.value = window.scrollY > 20 }
  window.addEventListener('scroll', onScroll, { passive: true })
  onUnmounted(() => window.removeEventListener('scroll', onScroll))
})

const route = useRoute()
const onPostPage = computed(() => route.name !== 'blog')
</script>

<template>
  <div class="blog-layout">
    <nav class="blog-nav" :class="{ 'blog-nav--scrolled': scrolled }">
      <div class="blog-nav-inner">
        <!-- Logo -->
        <NuxtLink to="/" class="blog-nav-logo">
          <img src="https://media.ilytat.com/logo.png" alt="ILYTAT" class="blog-nav-logo-img" />
        </NuxtLink>

        <!-- Breadcrumb / Links -->
        <div class="blog-nav-links">
          <NuxtLink to="/" class="blog-nav-link">Home</NuxtLink>
          <span class="blog-nav-sep">/</span>
          <NuxtLink to="/blog" class="blog-nav-link" :class="{ 'blog-nav-link--active': !onPostPage }">Blog</NuxtLink>
          <template v-if="onPostPage">
            <span class="blog-nav-sep">/</span>
            <span class="blog-nav-current">Post</span>
          </template>
        </div>

        <!-- CTA -->
        <a href="/#contact" class="blog-nav-cta">Get a Free Quote</a>
      </div>
    </nav>

    <!-- Page content offset for fixed nav -->
    <div class="blog-layout-body">
      <slot />
    </div>

    <!-- Footer -->
    <footer class="blog-footer">
      <div class="blog-footer-inner">
        <NuxtLink to="/" class="blog-footer-logo">
          <img src="https://media.ilytat.com/logo.png" alt="ILYTAT" class="blog-footer-logo-img" />
        </NuxtLink>
        <p class="blog-footer-text">
          Professional websites for local business. &copy; {{ new Date().getFullYear() }} ILYTAT.
        </p>
        <div class="blog-footer-links">
          <NuxtLink to="/" class="blog-footer-link">Home</NuxtLink>
          <NuxtLink to="/blog" class="blog-footer-link">Blog</NuxtLink>
          <NuxtLink to="/privacy" class="blog-footer-link">Privacy</NuxtLink>
          <a href="/#contact" class="blog-footer-link">Contact</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.blog-layout { min-height: 100vh; display: flex; flex-direction: column; background: #0f0f11; }
.blog-layout-body { flex: 1; padding-top: 64px; }

/* ── Nav ──────────────────────────────────────────────────────────────────── */
.blog-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 90;
  border-bottom: 1px solid transparent;
  transition: background .3s, border-color .3s, backdrop-filter .3s;
}
.blog-nav--scrolled {
  background: rgba(15,15,17,.85);
  border-color: rgba(255,255,255,.06);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.blog-nav-inner {
  max-width: 1200px; margin: 0 auto;
  display: flex; align-items: center; gap: 0;
  padding: 0 24px; height: 64px;
}

.blog-nav-logo { display: flex; align-items: center; text-decoration: none; margin-right: 24px; }
.blog-nav-logo-img { height: 28px; width: auto; object-fit: contain; }

/* Breadcrumb */
.blog-nav-links {
  display: flex; align-items: center; gap: 6px;
  flex: 1;
}
.blog-nav-link {
  font-size: 13px; color: #888; text-decoration: none;
  transition: color .15s;
}
.blog-nav-link:hover, .blog-nav-link--active { color: #c0bdb8; }
.blog-nav-sep { color: #444; font-size: 13px; }
.blog-nav-current { font-size: 13px; color: #c0bdb8; }

/* CTA */
.blog-nav-cta {
  font-size: 13px; font-weight: 600; letter-spacing: .01em;
  background: #f5c518; color: #0f0f11;
  padding: 8px 18px; border-radius: 5px;
  text-decoration: none; white-space: nowrap;
  transition: background .2s, transform .2s;
  margin-left: auto;
}
.blog-nav-cta:hover { background: #d4a912; transform: translateY(-1px); }

/* ── Footer ───────────────────────────────────────────────────────────────── */
.blog-footer {
  border-top: 1px solid #1e1e28;
  padding: 32px 24px;
  background: #0a0a0d;
}
.blog-footer-inner {
  max-width: 1200px; margin: 0 auto;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
}
.blog-footer-logo { display: flex; align-items: center; }
.blog-footer-logo-img { height: 24px; width: auto; opacity: .6; }
.blog-footer-text { font-size: 13px; color: #555; text-align: center; margin: 0; }
.blog-footer-links { display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; }
.blog-footer-link { font-size: 13px; color: #555; text-decoration: none; transition: color .15s; }
.blog-footer-link:hover { color: #c0bdb8; }

@media (max-width: 600px) {
  .blog-nav-inner { padding: 0 16px; gap: 0; }
  .blog-nav-logo { margin-right: 12px; }
  .blog-nav-logo-img { height: 24px; }
  /* Breadcrumb: visible but compact — hide "Home /" on small screens */
  .blog-nav-links { gap: 4px; flex: 1; overflow: hidden; }
  .blog-nav-link:first-child,
  .blog-nav-sep:first-child { display: none; }
  .blog-nav-link, .blog-nav-current { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* Shrink CTA on mobile */
  .blog-nav-cta { font-size: 12px; padding: 7px 12px; }
  .blog-layout-body { padding-top: 56px; }
}
</style>
