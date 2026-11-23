<script setup>
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { LogOut, Mail, CalendarDays, FileText } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { useDraftStore } from "@/stores/draft";

const auth = useAuthStore();
const draftStore = useDraftStore();
const router = useRouter();

const memberSince = computed(() =>
  auth.user?.created_at
    ? new Date(auth.user.created_at).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : "—",
);

onMounted(() => {
  if (!draftStore.draftsLoaded) draftStore.fetchDrafts().catch(() => {});
});

async function signOut() {
  await auth.signOut();
  router.replace("/login");
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:px-10 md:py-12">
    <h1 class="text-3xl font-semibold tracking-tight text-white">Profile</h1>
    <p class="mt-2 text-muted">Your FirstDraft account.</p>

    <section class="card mt-8 p-6">
      <div class="flex items-center gap-4">
        <span
          class="grid h-14 w-14 place-items-center rounded-full bg-violet-600/20 text-xl font-semibold uppercase text-violet-300"
        >
          {{ auth.user?.email?.[0] || "?" }}
        </span>
        <div class="min-w-0">
          <p class="truncate text-lg font-medium text-white">{{ auth.user?.email }}</p>
          <p class="text-sm text-muted">Signed in</p>
        </div>
      </div>

      <dl class="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
        <div class="flex items-start gap-3">
          <Mail :size="18" class="mt-0.5 text-faint" />
          <div class="min-w-0">
            <dt class="text-sm text-muted">Email</dt>
            <dd class="truncate text-zinc-100">{{ auth.user?.email }}</dd>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <CalendarDays :size="18" class="mt-0.5 text-faint" />
          <div>
            <dt class="text-sm text-muted">Member since</dt>
            <dd class="text-zinc-100">{{ memberSince }}</dd>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <FileText :size="18" class="mt-0.5 text-faint" />
          <div>
            <dt class="text-sm text-muted">Drafts</dt>
            <dd class="text-zinc-100">{{ draftStore.drafts.length }}</dd>
          </div>
        </div>
      </dl>
    </section>

    <button class="btn-secondary mt-6" @click="signOut">
      <LogOut :size="17" />
      Sign out
    </button>
  </div>
</template>
