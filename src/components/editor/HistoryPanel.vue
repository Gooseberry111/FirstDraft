<script setup>
import { ref, watch } from "vue";
import { History, Loader2, RotateCcw, Save } from "lucide-vue-next";
import BaseModal from "@/components/BaseModal.vue";
import DocumentThumb from "@/components/templates/DocumentThumb.vue";
import ScoreRing from "@/components/quality/ScoreRing.vue";
import { useDraftStore } from "@/stores/draft";
import { normalizeDocument } from "@/services/documentBuilder";
import { analyzeDocument } from "@/services/quality";
import { relativeTime } from "@/utils/format";

// Version history: automatic snapshots (taken as the document changes) plus
// manual saves. Restoring keeps a copy of the current version first.
const props = defineProps({
  open: { type: Boolean, default: false },
  draftId: { type: String, default: "" },
});
const emit = defineEmits(["close", "restore", "save-now"]);

const draftStore = useDraftStore();
const versions = ref([]);
const loading = ref(false);
const error = ref("");
const saving = ref(false);

async function load() {
  loading.value = true;
  error.value = "";
  try {
    versions.value = (await draftStore.listVersions(props.draftId)).map((v) => {
      const doc = normalizeDocument(v.document_data);
      return { ...v, doc, score: analyzeDocument(doc).score };
    });
  } catch (e) {
    error.value = e?.message || "Couldn't load the history.";
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.open,
  (open) => open && load(),
);

async function saveNow() {
  saving.value = true;
  try {
    await new Promise((resolve, reject) => emit("save-now", { resolve, reject }));
    await load();
  } catch (e) {
    error.value = e?.message || "Couldn't save a version.";
  } finally {
    saving.value = false;
  }
}

function restore(version) {
  if (!confirm(`Restore the version from ${new Date(version.created_at).toLocaleString()}? Your current version will be saved in history first.`)) return;
  emit("restore", version);
}
</script>

<template>
  <BaseModal :open="open" title="Version history" subtitle="Snapshots are saved automatically as you work" :icon="History" wide @close="emit('close')">
    <button class="btn-secondary mb-4 w-full" :disabled="saving" @click="saveNow">
      <Loader2 v-if="saving" :size="16" class="animate-spin" />
      <Save v-else :size="16" />
      Save a version now
    </button>

    <div v-if="loading" class="grid place-items-center py-12 text-muted"><Loader2 :size="22" class="animate-spin" /></div>
    <p v-else-if="error" class="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">{{ error }}</p>
    <p v-else-if="!versions.length" class="py-10 text-center text-sm text-muted">
      No versions yet — they're saved automatically as your document changes.
    </p>

    <ul v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <li v-for="(v, i) in versions" :key="v.id" class="card group overflow-hidden">
        <div class="desk relative flex justify-center px-3 pt-3">
          <span class="absolute right-2 top-2 z-10 rounded-full bg-white p-0.5 shadow-card">
            <ScoreRing :score="v.score" :size="30" :stroke="3" />
          </span>
          <div class="overflow-hidden rounded-t shadow-paper ring-1 ring-black/5">
            <DocumentThumb :document="v.doc" :design="v.template || ''" :width="120" />
          </div>
        </div>
        <div class="border-t border-line p-3">
          <p class="truncate text-sm font-semibold text-ink">{{ v.label || "Snapshot" }}</p>
          <p class="text-xs text-muted" :title="new Date(v.created_at).toLocaleString()">
            {{ i === 0 ? "Latest · " : "" }}{{ relativeTime(v.created_at) }}
          </p>
          <button class="btn-ghost mt-2 w-full py-1.5 text-xs text-brand-700" @click="restore(v)">
            <RotateCcw :size="13" /> Restore
          </button>
        </div>
      </li>
    </ul>
  </BaseModal>
</template>
