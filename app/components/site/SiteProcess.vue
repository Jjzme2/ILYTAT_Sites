<script setup lang="ts">
import { siteConfig } from '~/config/site.config'

const { steps } = siteConfig
</script>

<template>
  <section id="how-it-works" class="bg-[var(--theme-surface)] section-layer relative section-crack py-[100px] sm:py-16">
    <div class="max-w-[1080px] mx-auto px-12 md:px-6 sm:px-4">

      <header class="mb-20" data-reveal>
        <p class="eyebrow">How It Works</p>
        <h2 class="font-display text-[clamp(28px,3.8vw,46px)] font-extrabold tracking-[-2px] text-[var(--theme-text)] leading-[1.05] mt-2">
          Simple from day one.
        </h2>
        <p class="text-[14px] text-[var(--theme-text-body)] mt-4 leading-[1.85] max-w-[400px]">
          No mystery timelines. No confusing agency process.
        </p>
      </header>

      <div class="relative">
        <!-- Crack-line connecting the step cards -->
        <div
          class="hidden lg:block absolute top-[28px] left-[calc(16.6%+22px)] right-[calc(16.6%+22px)]"
          aria-hidden="true">
          <div class="crack-line" />
        </div>

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div
            v-for="(step, i) in steps"
            :key="step.n"
            class="crack-wrap"
            data-reveal
            :data-reveal-delay="i * 120">
            <LumenSurface
              palette="copper-sky"
              class="crack-inner crack-inner-lift glass-card group flex flex-col h-full">

              <div class="px-7 py-8 flex flex-col gap-4 flex-1 relative">
                <!-- Phase indicator — diamond shape -->
                <div class="flex items-center gap-3">
                  <div
                    class="w-[36px] h-[36px] relative z-10 flex items-center justify-center flex-shrink-0 border border-[var(--glass-card-border)] bg-[var(--glass-deep-bg)] transition-all duration-400"
                    style="clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%); box-shadow: 0 0 12px color-mix(in srgb, var(--theme-accent) 20%, transparent)">
                    <div
                      class="w-1.5 h-1.5 transition-colors duration-400"
                      style="background: color-mix(in srgb, var(--theme-accent) 55%, transparent); clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" />
                  </div>
                  <span class="font-mono text-[9px] tracking-[2.5px] uppercase text-[var(--theme-accent)] opacity-60">
                    Phase {{ step.n }}
                  </span>
                </div>

                <h3 class="font-display text-[18px] font-bold tracking-[-0.3px] text-[var(--theme-text)]">
                  {{ step.title }}
                </h3>
                <p class="text-[13.5px] leading-[1.9] text-[var(--theme-text-body)]">
                  {{ step.body }}
                </p>

                <!-- Bottom crack-line accent -->
                <div class="crack-line mt-2 opacity-0 group-hover:opacity-60 transition-opacity duration-400" aria-hidden="true" />
              </div>
            </LumenSurface>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>
