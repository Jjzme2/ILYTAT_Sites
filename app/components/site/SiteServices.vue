<script setup lang="ts">
import { siteConfig } from '~/config/site.config'

const { services } = siteConfig
const emit = defineEmits<{ 'select-service': [name: string] }>()

// Each card gets a random explosion color assigned on mount (client-only to avoid hydration mismatch)
const glowClasses = useExplosionColors(services.length)
</script>

<template>
  <section id="services" class="max-w-[1080px] mx-auto px-12 py-[100px] md:px-6 md:py-20 sm:px-4 sm:py-16">

    <header class="mb-16" data-reveal>
      <p class="eyebrow">What We Build</p>
      <h2 class="font-display text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-2px] text-[var(--theme-text)] leading-[1.05]">
        Sites that work as hard
        <br>
        <em class="font-headline italic text-[var(--theme-accent)]">as you do</em>
      </h2>
    </header>

    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div
        v-for="(svc, i) in services"
        :key="svc.title"
        class="crack-wrap"
        data-reveal
        :data-reveal-delay="i * 80">
        <LumenSurface
          as="a"
          palette="amber-plum"
          :class="['crack-inner crack-inner-lift glass-card no-underline text-inherit group flex flex-col h-full', glowClasses[i]]"
          href="#contact"
          @click="emit('select-service', svc.title)">

          <div class="flex flex-col gap-5 p-8 md:p-10 flex-1 relative">
            <span
              class="absolute top-4 right-6 font-display text-[80px] font-extrabold leading-none select-none pointer-events-none text-[var(--theme-text)] opacity-[0.07] group-hover:opacity-[0.15] transition-opacity duration-500">
              0{{ i + 1 }}
            </span>

            <span class="font-mono text-[9px] tracking-[2.5px] uppercase text-[var(--theme-accent)] opacity-70">
              {{ svc.tag }}
            </span>

            <div class="flex flex-col gap-2 flex-1">
              <h3 class="font-display text-[22px] font-bold tracking-[-0.5px] leading-tight text-[var(--theme-text)]">
                {{ svc.title }}
              </h3>
              <p class="text-[14px] leading-[1.88] max-w-[320px] text-[var(--theme-text-body)]">
                {{ svc.body }}
              </p>
            </div>

            <div class="flex items-center gap-3 mt-2">
              <div class="crack-line w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span
                class="font-mono text-[10px] tracking-[2.5px] uppercase text-[var(--theme-accent)] opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                Start &rarr;
              </span>
            </div>
          </div>
        </LumenSurface>
      </div>
    </div>
  </section>
</template>
