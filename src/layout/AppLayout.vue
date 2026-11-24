<script setup>
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { LayoutDashboard, User, Settings, Plus, LogOut, Menu, X } from "lucide-vue-next";
import BrandMark from "@/components/BrandMark.vue";
import ThemeToggle from "@/components/ThemeToggle.vue";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const mobileNavOpen = ref(false);

const nav = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/profile", label: "Profile", icon: User },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

watch(
  () => route.fullPath,
  () => (mobileNavOpen.value = false),
);

async function signOut() {
  await auth.signOut();
  router.replace("/login");
}
</script>

<template>
  <div class="flex min-h-full bg-canvas text-ink">
    <!-- Mobile top bar -->
    <header class="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur md:hidden">
      <RouterLink to="/app/dashboard" aria-label="FirstDraft home"><BrandMark /></RouterLink>
      <div class="flex items-center gap-1">
        <ThemeToggle />
        <button class="icon-btn" aria-label="Open menu" @click="mobileNavOpen = true">
          <Menu :size="20" />
        </button>
      </div>
    </header>

    <Transition name="fade">
      <div v-if="mobileNavOpen" class="fixed inset-0 z-40 bg-black/30 md:hidden" @click="mobileNavOpen = false" />
    </Transition>

    <!-- Sidebar -->
    <aside
      :class="mobileNavOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'"
      class="fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-line/80 bg-surface/80 backdrop-blur-xl transition-transform duration-200 md:sticky md:top-0 md:h-screen"
    >
      <div class="flex h-16 items-center justify-between px-5">
        <RouterLink to="/app/dashboard" aria-label="FirstDraft home"><BrandMark /></RouterLink>
        <button class="icon-btn md:hidden" aria-label="Close menu" @click="mobileNavOpen = false">
          <X :size="18" />
        </button>
      </div>

      <div class="px-3 pt-1">
        <RouterLink to="/app/draft/new" class="btn-primary w-full">
          <Plus :size="18" />
          New draft
        </RouterLink>
      </div>

      <nav class="mt-5 flex-1 space-y-0.5 px-3" aria-label="Main">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-2 transition hover:bg-subtle hover:text-ink"
          active-class="!bg-brand-gradient !text-white shadow-glow"
        >
          <component :is="item.icon" :size="18" />
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="border-t border-line p-3">
        <div class="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-bold uppercase text-white">
            {{ auth.user?.email?.[0] || "?" }}
          </span>
          <span class="min-w-0 flex-1 truncate text-sm text-ink-2">{{ auth.user?.email }}</span>
          <ThemeToggle class="hidden md:inline-flex" />
          <button class="icon-btn" aria-label="Sign out" title="Sign out" @click="signOut">
            <LogOut :size="17" />
          </button>
        </div>
      </div>
    </aside>

    <main class="min-w-0 flex-1 pt-14 md:pt-0">
      <RouterView />
    </main>
  </div>
</template>
