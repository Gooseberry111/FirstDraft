<script setup>
import { computed, onMounted, ref } from "vue";
import { Plus, FileText, Trash2, Loader2, AlertCircle, ArrowRight, Sparkles, FileUp } from "lucide-vue-next";
import ImportProgress from "@/components/ImportProgress.vue";
import { useImportCv } from "@/composables/useImportCv";
import { useBillingStore } from "@/stores/billing";
import { Crown } from "lucide-vue-next";
import { useDraftStore } from "@/stores/draft";
import { DOCUMENT_TYPES, isDocumentEmpty, normalizeDocument } from "@/services/documentBuilder";
import DocumentThumb from "@/components/templates/DocumentThumb.vue";
import ScoreRing from "@/components/quality/ScoreRing.vue";
import { analyzeDocument } from "@/services/quality";
import { DOC_TYPE_STYLES, docTypeStyle } from "@/utils/docTypes";
import { relativeTime } from "@/utils/format";

const draftStore = useDraftStore();
const { importing, stage, importError, pickFile } = useImportCv();
const billing = useBillingStore();

const loading = ref(!draftStore.draftsLoaded);
const loadError = ref("");
const deletingId = ref(null);

const STARTERS = Object.entries(DOC_TYPE_STYLES).map(([type, style]) => ({ type, ...style }));

const typeOf = (draft) => draft.document_data?.documentType || "resume";

const drafts = computed(() =>
  draftStore.drafts.map((draft) => {
    const doc = normalizeDocument(draft.document_data, draft.document_type);
    const empty = isDocumentEmpty(doc);
    return { ...draft, doc, empty, score: empty ? null : analyzeDocument(doc).score };
  }),
);

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
  <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:px-10 md:py-10">
    <!-- Hero -->
    <section class="relative overflow-hidden rounded-3xl bg-brand-gradient px-6 py-8 text-white shadow-pop sm:px-10 sm:py-10">
      <div class="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/15 blur-2xl" aria-hidden="true" />
      <div class="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-sky-300/30 blur-3xl" aria-hidden="true" />

      <!-- Floating page decoration -->
      <div class="pointer-events-none absolute -bottom-10 right-8 hidden rotate-6 lg:block" aria-hidden="true">
        <div class="w-44 rounded-xl bg-white p-4 shadow-2xl">
          <div class="h-2.5 w-24 rounded bg-gray-900" />
          <div class="mt-1.5 h-1.5 w-32 rounded bg-gray-300" />
          <div class="mt-3 h-1 w-8 rounded bg-brand-500" />
          <div class="mt-3 space-y-1">
            <div class="h-1.5 rounded bg-gray-200" />
            <div class="h-1.5 w-10/12 rounded bg-gray-200" />
            <div class="h-1.5 w-8/12 rounded bg-gray-200" />
          </div>
          <div class="mt-3 flex gap-1">
            <span class="h-3 w-8 rounded bg-brand-100" />
            <span class="h-3 w-6 rounded bg-brand-100" />
            <span class="h-3 w-9 rounded bg-brand-100" />
          </div>
        </div>
      </div>

      <div class="relative max-w-xl">
        <p class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
          <Sparkles :size="13" /> {{ greeting }}
        </p>
        <h1 class="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">What are we writing today?</h1>
        <p class="mt-2 max-w-md text-white/80">
          Pick a document, answer a few questions, and you'll see it come together as you go.
        </p>
        <button
          class="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#5a2fd6] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#f4f1ff]"
          @click="pickFile"
        >
          <FileUp :size="17" /> Import an existing CV
        </button>
        <p class="mt-2 text-xs text-white/70">Works with PDF, Word and text files</p>
      </div>
    </section>
    <ImportProgress :importing="importing" :stage="stage" :error="importError" @dismiss="importError = ''" />

    <div
      v-if="billing.billingEnabled && !billing.isAdmin && !billing.isPro"
      class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface px-5 py-3.5 text-sm shadow-card ring-1 ring-line"
    >
      <span class="text-ink-2">
        <template v-if="billing.canCreate">Your first document is free.</template>
        <template v-else>You've used your free document.</template>
        A 30-day Pro pass unlocks unlimited documents, tailoring and imports.
      </span>
      <button class="btn-primary py-2" @click="billing.openPaywall()"><Crown :size="15" /> Get Pro</button>
    </div>

    <!-- One-click starters -->
    <div class="relative z-10 -mt-6 grid grid-cols-2 gap-3 px-2 sm:px-4 lg:grid-cols-4">
      <RouterLink
        v-for="starter in STARTERS"
        :key="starter.type"
        :to="{ path: '/app/draft/new', query: { start: starter.type } }"
        class="card group flex flex-col p-4 transition hover:-translate-y-1 hover:shadow-pop sm:p-5"
      >
        <span class="grid h-11 w-11 place-items-center rounded-xl text-white transition group-hover:scale-105" :class="starter.tile">
          <component :is="starter.icon" :size="20" />
        </span>
        <span class="mt-4 flex items-center gap-1 font-bold text-ink">
          {{ DOCUMENT_TYPES[starter.type] }}
          <ArrowRight :size="15" class="-translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
        </span>
        <span class="mt-0.5 text-sm text-muted">{{ starter.text }}</span>
      </RouterLink>
    </div>

    <!-- Drafts -->
    <section class="mt-12">
      <div class="mb-5 flex items-end justify-between">
        <h2 class="text-xl font-bold tracking-tight text-ink">
          Your drafts
          <span v-if="!loading && drafts.length" class="ml-1.5 rounded-full bg-brand-100 px-2 py-0.5 align-middle text-xs font-semibold text-brand-700">
            {{ drafts.length }}
          </span>
        </h2>
        <RouterLink to="/app/draft/new" class="btn-ghost -mr-2 py-1.5 text-brand-700">
          <Plus :size="16" /> New draft
        </RouterLink>
      </div>

      <div v-if="loading" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <div v-for="i in 4" :key="i" class="card overflow-hidden">
          <div class="aspect-[4/3] animate-pulse bg-subtle" />
          <div class="space-y-2 p-4">
            <div class="h-3 w-2/3 animate-pulse rounded bg-subtle" />
            <div class="h-2.5 w-1/3 animate-pulse rounded bg-subtle" />
          </div>
        </div>
      </div>

      <div v-else-if="loadError" class="card flex items-center gap-3 border-red-200 bg-red-50 p-5 text-red-700">
        <AlertCircle :size="20" />
        {{ loadError }}
      </div>

      <div
        v-else-if="!drafts.length"
        class="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-brand-200 bg-surface/60 px-6 py-16 text-center"
      >
        <span class="grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
          <FileText :size="24" />
        </span>
        <h3 class="mt-5 text-lg font-bold text-ink">No drafts yet</h3>
        <p class="mt-1 max-w-sm text-sm text-muted">Choose one of the options above to get started.</p>
      </div>

      <ul v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <li v-for="draft in drafts" :key="draft.id" class="group relative">
          <RouterLink
            :to="`/app/draft/${draft.id}`"
            class="card block overflow-hidden transition hover:-translate-y-1 hover:shadow-pop"
          >
            <!-- Mini preview -->
            <div class="desk relative flex aspect-[4/3] justify-center overflow-hidden px-4 pt-4">
              <span
                v-if="draft.score !== null"
                class="absolute right-2.5 top-2.5 z-10 rounded-full bg-surface p-0.5 shadow-card"
                :title="`Strength: ${draft.score}/100`"
              >
                <ScoreRing :score="draft.score" :size="34" :stroke="3.5" />
              </span>
              <div v-if="!draft.empty" class="overflow-hidden rounded-t-md shadow-paper ring-1 ring-black/5 transition group-hover:scale-[1.03]">
                <DocumentThumb :document="draft.doc" :design="draft.template" :width="150" />
              </div>
              <div v-else class="flex flex-col items-center justify-center text-center">
                <span class="grid h-12 w-12 place-items-center rounded-xl text-white" :class="docTypeStyle(typeOf(draft)).tile">
                  <component :is="docTypeStyle(typeOf(draft)).icon" :size="22" />
                </span>
                <span class="mt-2 text-xs font-medium text-muted">Just started</span>
              </div>
            </div>
            <div class="border-t border-line p-3.5">
              <span class="block truncate pr-6 text-sm font-bold text-ink">{{ draft.title || "Untitled Draft" }}</span>
              <span class="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <span class="rounded-full px-1.5 py-px text-[10.5px] font-semibold" :class="docTypeStyle(typeOf(draft)).soft">
                  {{ DOCUMENT_TYPES[typeOf(draft)] }}
                </span>
                {{ relativeTime(draft.updated_at || draft.created_at) }}
              </span>
            </div>
          </RouterLink>

          <button
            class="absolute bottom-3 right-2 grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:focus:opacity-100 sm:group-hover:opacity-100"
            :aria-label="`Delete ${draft.title}`"
            :disabled="deletingId === draft.id"
            @click="removeDraft(draft)"
          >
            <Loader2 v-if="deletingId === draft.id" :size="15" class="animate-spin" />
            <Trash2 v-else :size="15" />
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
