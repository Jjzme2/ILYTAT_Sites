<template>
  <div class="min-h-screen bg-slate-950 text-white flex">
    <DashboardSidebar />
    <div class="flex-1 flex flex-col min-w-0">
      <DashboardTopbar />
      <main class="flex-1 p-6 overflow-auto">
        <slot />
      </main>
    </div>
  </div>
</template>
