<script setup lang="ts">
import { siteContent } from '~/utils/siteContent'

const { founder } = siteContent
const year = new Date().getFullYear()
</script>

<template>
  <footer class="bg-[var(--theme-surface-deep)] relative overflow-hidden">
    <!-- Crack-light top border -->
    <div class="crack-line absolute top-0 left-0 right-0" aria-hidden="true" />

    <div class="max-w-[1080px] mx-auto px-12 py-16 md:px-6 sm:px-4 grid grid-cols-1 gap-10 sm:grid-cols-[1fr_auto_auto] sm:gap-16">
      <div>
        <img
          src="https://media.ilytat.com/logo.png"
          alt="ILYTAT"
          class="h-7 w-auto object-contain mb-5 block opacity-50 hover:opacity-80 transition-opacity duration-300">
        <p class="text-[12px] leading-[1.8] max-w-[200px] text-[var(--theme-text-faint)]">
          Websites for local businesses.<br />Manteno, IL.
        </p>
      </div>
      <div>
        <p class="font-mono text-[9px] tracking-[2.5px] uppercase mb-5 text-[var(--theme-text-ghost)]">Navigate</p>
        <ul class="flex flex-col gap-3.5">
          <li><a href="#services"     class="text-[12.5px] no-underline transition-colors duration-200 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-hi)]">Services</a></li>
          <li><a href="#how-it-works" class="text-[12.5px] no-underline transition-colors duration-200 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-hi)]">How It Works</a></li>
          <li><a href="#pricing"      class="text-[12.5px] no-underline transition-colors duration-200 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-hi)]">Pricing</a></li>
          <li><a href="#portfolio"    class="text-[12.5px] no-underline transition-colors duration-200 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-hi)]">Portfolio</a></li>
          <li>
            <NuxtLink to="/blog" class="text-[12.5px] no-underline transition-colors duration-200 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-hi)]">Blog</NuxtLink>
          </li>
        </ul>
      </div>
      <div>
        <p class="font-mono text-[9px] tracking-[2.5px] uppercase mb-5 text-[var(--theme-text-ghost)]">Legal</p>
        <ul class="flex flex-col gap-3.5">
          <li>
            <NuxtLink to="/privacy" class="text-[12.5px] no-underline transition-colors duration-200 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-hi)]">Privacy Policy</NuxtLink>
          </li>
        </ul>
      </div>
    </div>

    <div class="border-t border-[var(--glass-card-border)] py-5">
      <div class="max-w-[1080px] mx-auto px-12 md:px-6 sm:px-4 flex items-center justify-between flex-wrap gap-2">
        <span class="font-mono text-[9.5px] uppercase tracking-[1.5px] text-[var(--theme-text-faint)]">© {{ year }} ILYTAT LLC</span>
        <span class="font-mono text-[9.5px] uppercase tracking-[1.5px] text-[var(--theme-text-faint)]">Built by {{ founder.name }}</span>
      </div>
    </div>
  </footer>
</template>
