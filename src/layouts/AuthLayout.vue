<template>
  <div class="min-h-screen bg-bg flex flex-col items-center justify-center p-4">
    <!-- Logo -->
    <div class="mb-8 text-center">
      <span class="text-3xl font-bold text-primary tracking-widest">ЛОГІСТ</span>
      <p class="text-muted text-sm mt-1">Система управління вантажоперевезеннями</p>
    </div>

    <!-- Card -->
    <div class="w-full max-w-sm bg-surface rounded-2xl shadow-lg border border-border p-8">
      <slot />
    </div>
  </div>
</template>
