<script setup lang="ts">
import { siteContent } from '~/utils/siteContent'

const { founder } = siteContent
const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-[#1a1612] bg-[#090705]">
    <div class="max-w-[1080px] mx-auto px-12 py-16 md:px-6 sm:px-4 grid grid-cols-1 gap-10 sm:grid-cols-[1fr_auto_auto] sm:gap-16">
      <div>
        <img
          src="https://media.ilytat.com/logo.png"
          alt="ILYTAT"
          class="h-7 w-auto object-contain mb-5 block opacity-50 hover:opacity-80 transition-opacity duration-300">
        <p class="text-[12px] text-[#353230] leading-[1.8] max-w-[200px]">Websites for local businesses.<br />Manteno, IL.</p>
      </div>
      <div>
        <p class="font-mono text-[9px] tracking-[2.5px] uppercase text-[#3d3a35] mb-5">Navigate</p>
        <ul class="flex flex-col gap-3.5">
          <li><a href="#services" class="text-[12.5px] text-[#4a4742] no-underline transition-colors duration-200 hover:text-[#9e9b95]">Services</a></li>
          <li><a href="#how-it-works" class="text-[12.5px] text-[#4a4742] no-underline transition-colors duration-200 hover:text-[#9e9b95]">How It Works</a></li>
          <li><a href="#pricing" class="text-[12.5px] text-[#4a4742] no-underline transition-colors duration-200 hover:text-[#9e9b95]">Pricing</a></li>
          <li><a href="#portfolio" class="text-[12.5px] text-[#4a4742] no-underline transition-colors duration-200 hover:text-[#9e9b95]">Portfolio</a></li>
          <li>
            <NuxtLink to="/blog" class="text-[12.5px] text-[#4a4742] no-underline transition-colors duration-200 hover:text-[#9e9b95]">Blog</NuxtLink>
          </li>
        </ul>
      </div>
      <div>
        <p class="font-mono text-[9px] tracking-[2.5px] uppercase text-[#3d3a35] mb-5">Legal</p>
        <ul class="flex flex-col gap-3.5">
          <li>
            <NuxtLink to="/privacy" class="text-[12.5px] text-[#4a4742] no-underline transition-colors duration-200 hover:text-[#9e9b95]">Privacy Policy</NuxtLink>
          </li>
        </ul>
      </div>
    </div>
    <div class="border-t border-[#13100d] py-5">
      <div class="max-w-[1080px] mx-auto px-12 md:px-6 sm:px-4 flex items-center justify-between flex-wrap gap-2">
        <span class="font-mono text-[9.5px] text-[#2d2b27] uppercase tracking-[1.5px]">© {{ year }} ILYTAT LLC</span>
        <span class="font-mono text-[9.5px] text-[#2d2b27] uppercase tracking-[1.5px]">Built by {{ founder.name }}</span>
      </div>
    </div>
  </footer>
</template>
