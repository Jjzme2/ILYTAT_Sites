<script setup lang="ts">
import { siteContent } from '~/utils/siteContent'

const { founder } = siteContent
const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-[#181410] bg-[#090705]">
    <div class="max-w-[1080px] mx-auto px-12 py-14 md:px-6 sm:px-4 grid grid-cols-1 gap-10 sm:grid-cols-[1fr_auto_auto] sm:gap-16">
      <div>
        <img
          src="https://media.ilytat.com/logo.png"
          alt="ILYTAT"
          class="h-7 w-auto object-contain mb-4 block opacity-60 hover:opacity-100 transition-opacity duration-200">
        <p class="text-[12px] text-[#222028] leading-[1.75] max-w-[200px]">Websites for local businesses.<br />Manteno, IL.</p>
      </div>
      <div>
        <p class="font-mono text-[9px] tracking-[2px] uppercase text-[#222028] mb-5">Navigate</p>
        <ul class="flex flex-col gap-3">
          <li><a href="#services" class="text-[12.5px] text-[#2d2d38] no-underline transition-colors duration-200 hover:text-[#6e6b7b]">Services</a></li>
          <li><a href="#how-it-works" class="text-[12.5px] text-[#2d2d38] no-underline transition-colors duration-200 hover:text-[#6e6b7b]">How It Works</a></li>
          <li><a href="#pricing" class="text-[12.5px] text-[#2d2d38] no-underline transition-colors duration-200 hover:text-[#6e6b7b]">Pricing</a></li>
          <li><a href="#portfolio" class="text-[12.5px] text-[#2d2d38] no-underline transition-colors duration-200 hover:text-[#6e6b7b]">Portfolio</a></li>
          <li>
            <NuxtLink to="/blog" class="text-[12.5px] text-[#2d2d38] no-underline transition-colors duration-200 hover:text-[#6e6b7b]">Blog</NuxtLink>
          </li>
        </ul>
      </div>
      <div>
        <p class="font-mono text-[9px] tracking-[2px] uppercase text-[#222028] mb-5">Legal</p>
        <ul class="flex flex-col gap-3">
          <li>
            <NuxtLink to="/privacy" class="text-[12.5px] text-[#2d2d38] no-underline transition-colors duration-200 hover:text-[#6e6b7b]">Privacy Policy</NuxtLink>
          </li>
        </ul>
      </div>
    </div>
    <div class="border-t border-[#100e0b] py-4">
      <div class="max-w-[1080px] mx-auto px-12 md:px-6 sm:px-4 flex items-center justify-between flex-wrap gap-2">
        <span class="font-mono text-[9.5px] text-[#1a1a20] uppercase tracking-[1px]">© {{ year }} ILYTAT LLC</span>
        <span class="font-mono text-[9.5px] text-[#1a1a20] uppercase tracking-[1px]">Built by {{ founder.name }}</span>
      </div>
    </div>
  </footer>
</template>
