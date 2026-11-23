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
} from "lucide-vue-next";
import { useDraftStore } from "@/stores/draft";
import { DOCUMENT_TYPES } from "@/services/documentBuilder";
import { relativeTime } from "@/utils/format";

const draftStore = useDraftStore();

const loading = ref(!draftStore.draftsLoaded);
const loadError = ref("");
const deletingId = ref(null);

const typeIcons = {
  resume: FileText,
  cv: GraduationCap,
  cover_letter: Mail,
  essay: PenLine,
};

const typeOf = (draft) => draft.document_data?.documentType || "resume";

const stats = computed(() => {
  const counts = { resume: 0, cv: 0, cover_letter: 0, essay: 0 };
  for (const draft of draftStore.drafts) counts[typeOf(draft)] = (counts[typeOf(draft)] || 0) + 1;

  return [
    { label: "Total drafts", value: draftStore.drafts.length },
    { label: "Resumes & CVs", value: counts.resume + counts.cv },
    { label: "Cover letters", value: counts.cover_letter },
    { label: "Essays", value: counts.essay },
  ];
});

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
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:px-10 md:py-12">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-sm font-medium text-violet-400">{{ greeting }}</p>
        <h1 class="mt-1 text-3xl font-semibold tracking-tight text-white md:text-4xl">
          Your drafts
        </h1>
        <p class="mt-2 text-muted">
          Continue where you left off, or start something new.
        </p>
      </div>

      <RouterLink to="/app/draft/new" class="btn-primary self-start py-3 sm:self-auto">
        <Plus :size="18" />
        New draft
      </RouterLink>
    </header>

    <!-- Stats -->
    <div class="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div v-for="stat in stats" :key="stat.label" class="card p-5">
        <p class="text-sm text-muted">{{ stat.label }}</p>
        <p class="mt-2 text-3xl font-semibold tabular-nums text-white">
          <span v-if="loading" class="inline-block h-8 w-10 animate-pulse rounded bg-raised" />
          <template v-else>{{ stat.value }}</template>
        </p>
      </div>
    </div>

    <!-- Drafts -->
    <section class="mt-12">
      <h2 class="mb-4 text-lg font-semibold text-white">Recent</h2>

      <div v-if="loading" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="i in 3" :key="i" class="card h-36 animate-pulse" />
      </div>

      <div
        v-else-if="loadError"
        class="card flex items-center gap-3 border-red-500/30 p-5 text-red-300"
      >
        <AlertCircle :size="20" />
        {{ loadError }}
      </div>

      <div
        v-else-if="!draftStore.drafts.length"
        class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center"
      >
        <span class="grid h-12 w-12 place-items-center rounded-xl bg-violet-600/15 text-violet-400">
          <FileText :size="22" />
        </span>
        <h3 class="mt-4 text-lg font-medium text-white">No drafts yet</h3>
        <p class="mt-1 max-w-sm text-muted">
          Create your first CV, resume, cover letter or essay — just by chatting.
        </p>
        <RouterLink to="/app/draft/new" class="btn-primary mt-6">
          <Plus :size="18" />
          Start your first draft
        </RouterLink>
      </div>

      <ul v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="draft in draftStore.drafts" :key="draft.id" class="group relative">
          <RouterLink
            :to="`/app/draft/${draft.id}`"
            class="card flex h-full flex-col p-5 transition hover:border-violet-500/60 hover:bg-raised"
          >
            <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted">
              <component :is="typeIcons[typeOf(draft)] || FileText" :size="15" class="text-violet-400" />
              {{ DOCUMENT_TYPES[typeOf(draft)] || "Draft" }}
            </div>
            <h3 class="mt-3 line-clamp-2 pr-8 font-medium text-white">
              {{ draft.title || "Untitled Draft" }}
            </h3>
            <p class="mt-auto pt-4 text-sm text-faint">
              Edited {{ relativeTime(draft.updated_at || draft.created_at) }}
            </p>
          </RouterLink>

          <button
            class="icon-btn absolute right-3 top-3 opacity-100 hover:!text-red-400 sm:opacity-0 sm:focus:opacity-100 sm:group-hover:opacity-100"
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

  </div>
</template>
