<template>
  <div class="min-h-screen bg-slate-950 text-white flex flex-col">
    <LayoutAppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <LayoutAppFooter />
  </div>
</template>
