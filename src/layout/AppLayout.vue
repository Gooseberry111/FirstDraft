<script setup>
import {
  LayoutDashboard,
  FileText,
  User,
  Settings,
  Plus,
} from "lucide-vue-next";

import { RouterLink, RouterView } from "vue-router";
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-white">
    <div class="flex">
      <!-- Sidebar -->
      <aside
        class="hidden md:flex w-72 flex-col border-r border-zinc-800 h-screen sticky top-0"
      >
        <div class="p-6">
          <h1 class="text-2xl font-semibold tracking-tight">FirstDraft</h1>
        </div>

        <div class="px-4">
          <RouterLink
            to="/app/draft/new"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-black font-medium transition hover:scale-[1.02]"
          >
            <Plus :size="18" />
            New Draft
          </RouterLink>
        </div>

        <nav class="mt-8 flex-1 px-3">
          <RouterLink
            to="/app/dashboard"
            class="mb-2 flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-zinc-900"
          >
            <LayoutDashboard :size="18" />
            Dashboard
          </RouterLink>

          <RouterLink
            to="/app/profile"
            class="mb-2 flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-zinc-900"
          >
            <User :size="18" />
            Profile
          </RouterLink>

          <RouterLink
            to="/app/settings"
            class="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-zinc-900"
          >
            <Settings :size="18" />
            Settings
          </RouterLink>
        </nav>
      </aside>

      <!-- Main -->
      <main class="flex-1 min-h-screen">
        <RouterView />
      </main>
    </div>
  </div>
</template>
