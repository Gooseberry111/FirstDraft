<script setup>
import { computed, onMounted, ref } from "vue";
import {
  Plus,
  FileText,
  GraduationCap,
  Mail,
  PenLine,
  Trash2,
  Loader2,
  AlertCircle,
  ArrowRight,
} from "lucide-vue-next";
import { useDraftStore } from "@/stores/draft";
import { DOCUMENT_TYPES } from "@/services/documentBuilder";
import { relativeTime } from "@/utils/format";

const draftStore = useDraftStore();

const loading = ref(!draftStore.draftsLoaded);
const loadError = ref("");
const deletingId = ref(null);

const STARTERS = [
  { type: "resume", icon: FileText, text: "1–2 pages, tailored to a job" },
  { type: "cv", icon: GraduationCap, text: "Full academic & career history" },
  { type: "cover_letter", icon: Mail, text: "To go with an application" },
  { type: "essay", icon: PenLine, text: "Personal statement, scholarship…" },
];
const typeIcons = Object.fromEntries(STARTERS.map((s) => [s.type, s.icon]));

const typeOf = (draft) => draft.document_data?.documentType || "resume";

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
});

onMounted(async () => {
  try {
    await draftStore.fetchDrafts();
  } catch (error) {
    loadError.value = error?.message || "Couldn't load your drafts.";
  } finally {
    loading.value = false;
  }
});

async function removeDraft(draft) {
  if (!confirm(`Delete "${draft.title}"? This can't be undone.`)) return;

  deletingId.value = draft.id;
  try {
    await draftStore.deleteDraft(draft.id);
  } catch (error) {
    alert(error?.message || "Couldn't delete the draft.");
  } finally {
    deletingId.value = null;
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:px-10 md:py-12">
    <header>
      <p class="text-sm font-medium text-brand-600">{{ greeting }}</p>
      <h1 class="mt-1 text-3xl font-semibold tracking-tight text-ink">What are we writing today?</h1>
    </header>

    <!-- One-click starters -->
    <div class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <RouterLink
        v-for="starter in STARTERS"
        :key="starter.type"
        :to="{ path: '/app/draft/new', query: { start: starter.type } }"
        class="card group flex flex-col p-4 transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-pop sm:p-5"
      >
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
          <component :is="starter.icon" :size="20" />
        </span>
        <span class="mt-4 flex items-center gap-1 font-semibold text-ink">
          {{ DOCUMENT_TYPES[starter.type] }}
          <ArrowRight :size="15" class="-translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
        </span>
        <span class="mt-0.5 text-sm text-muted">{{ starter.text }}</span>
      </RouterLink>
    </div>

    <!-- Drafts -->
    <section class="mt-12">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-ink">
          Your drafts
          <span v-if="!loading && draftStore.drafts.length" class="ml-1 text-sm font-normal text-muted">
            {{ draftStore.drafts.length }}
          </span>
        </h2>
      </div>

      <div v-if="loading" class="card divide-y divide-line">
        <div v-for="i in 3" :key="i" class="flex items-center gap-4 p-4">
          <div class="h-10 w-10 animate-pulse rounded-lg bg-subtle" />
          <div class="flex-1 space-y-2">
            <div class="h-3 w-1/3 animate-pulse rounded bg-subtle" />
            <div class="h-2.5 w-1/5 animate-pulse rounded bg-subtle" />
          </div>
        </div>
      </div>

      <div v-else-if="loadError" class="card flex items-center gap-3 border-red-200 bg-red-50 p-5 text-red-700">
        <AlertCircle :size="20" />
        {{ loadError }}
      </div>

      <div
        v-else-if="!draftStore.drafts.length"
        class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center"
      >
        <span class="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <FileText :size="22" />
        </span>
        <h3 class="mt-4 font-semibold text-ink">No drafts yet</h3>
        <p class="mt-1 max-w-sm text-sm text-muted">Pick a document above — FirstDraft will guide you through it.</p>
      </div>

      <ul v-else class="card divide-y divide-line overflow-hidden">
        <li v-for="draft in draftStore.drafts" :key="draft.id" class="group relative">
          <RouterLink :to="`/app/draft/${draft.id}`" class="flex items-center gap-4 p-4 pr-14 transition hover:bg-subtle/70">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-subtle text-ink-2 group-hover:bg-brand-50 group-hover:text-brand-600">
              <component :is="typeIcons[typeOf(draft)] || FileText" :size="18" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium text-ink">{{ draft.title || "Untitled Draft" }}</span>
              <span class="block text-sm text-muted">
                {{ DOCUMENT_TYPES[typeOf(draft)] }} · Edited {{ relativeTime(draft.updated_at || draft.created_at) }}
              </span>
            </span>
          </RouterLink>

          <button
            class="icon-btn absolute right-3 top-1/2 -translate-y-1/2 hover:!bg-red-50 hover:!text-red-600 sm:opacity-0 sm:focus:opacity-100 sm:group-hover:opacity-100"
            :aria-label="`Delete ${draft.title}`"
            :disabled="deletingId === draft.id"
            @click="removeDraft(draft)"
          >
            <Loader2 v-if="deletingId === draft.id" :size="16" class="animate-spin" />
            <Trash2 v-else :size="16" />
          </button>
        </li>
      </ul>
    </section>

    <RouterLink to="/app/draft/new" class="btn-secondary mt-6 md:hidden">
      <Plus :size="17" /> New draft
    </RouterLink>
  </div>
</template>
