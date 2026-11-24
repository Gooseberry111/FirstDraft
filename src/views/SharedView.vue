<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { FileDown, Loader2, Lock, Sparkles } from "lucide-vue-next";
import BrandMark from "@/components/BrandMark.vue";
import ThemeToggle from "@/components/ThemeToggle.vue";
import DocumentRenderer from "@/components/templates/DocumentRenderer.vue";
import { useDraftStore } from "@/stores/draft";
import { DOCUMENT_TYPES, normalizeDocument } from "@/services/documentBuilder";
import { safeFileName } from "@/utils/format";

// Public, read-only view of a shared draft (/s/:shareId).
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

const route = useRoute();
const draftStore = useDraftStore();

const loading = ref(true);
const shared = ref(null);
const doc = computed(() => (shared.value ? normalizeDocument(shared.value.document_data) : null));

const container = ref(null);
const page = ref(null);
const scale = ref(1);
const height = ref(PAGE_HEIGHT);
const observer = new ResizeObserver(() => {
  scale.value = Math.min(1, (container.value?.clientWidth || PAGE_WIDTH) / PAGE_WIDTH);
  height.value = Math.max(PAGE_HEIGHT, page.value?.offsetHeight || PAGE_HEIGHT);
});
watch([container, page], ([c, p]) => {
  observer.disconnect();
  if (c) observer.observe(c);
  if (p) observer.observe(p);
});

onMounted(async () => {
  try {
    shared.value = await draftStore.getSharedDraft(String(route.params.shareId));
    if (shared.value) {
      const name = doc.value.personalInfo?.name;
      document.title = `${name || shared.value.title} · ${DOCUMENT_TYPES[doc.value.documentType] || "Document"}`;
    }
  } catch {
    shared.value = null;
  } finally {
    loading.value = false;
  }
});
onBeforeUnmount(() => observer.disconnect());

function downloadPdf() {
  const original = document.title;
  document.title = safeFileName(shared.value?.title);
  const restore = () => {
    document.title = original;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}
</script>

<template>
  <div class="min-h-full">
    <header class="sticky top-0 z-20 border-b border-line/80 bg-surface/80 backdrop-blur-xl">
      <div class="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <RouterLink to="/" aria-label="FirstDraft"><BrandMark /></RouterLink>
        <div class="flex items-center gap-2">
          <ThemeToggle />
          <button v-if="doc" class="btn-secondary px-3" @click="downloadPdf">
            <FileDown :size="16" /> <span class="hidden sm:inline">Download PDF</span>
          </button>
          <RouterLink to="/signup" class="btn-primary px-3">
            <Sparkles :size="15" /> <span class="hidden sm:inline">Make your own</span><span class="sm:hidden">Create</span>
          </RouterLink>
        </div>
      </div>
    </header>

    <main class="desk min-h-[calc(100dvh-3.5rem)] px-4 py-6 sm:py-10">
      <div v-if="loading" class="grid place-items-center py-24 text-muted"><Loader2 :size="26" class="animate-spin" /></div>

      <div v-else-if="!doc" class="mx-auto mt-10 max-w-md text-center">
        <span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface text-muted shadow-card"><Lock :size="24" /></span>
        <h1 class="mt-5 text-2xl font-bold text-ink">This link isn't available</h1>
        <p class="mt-2 text-muted">The owner may have turned off sharing, or the link might be wrong.</p>
        <RouterLink to="/" class="btn-primary mt-6">Go to FirstDraft</RouterLink>
      </div>

      <div v-else ref="container" class="mx-auto w-full max-w-[794px]">
        <div :style="{ height: `${height * scale}px` }" class="relative">
          <div
            ref="page"
            class="absolute left-0 top-0 origin-top-left overflow-hidden rounded-md bg-white px-[60px] py-[56px] text-gray-900 shadow-paper ring-1 ring-black/5"
            :style="{
              width: `${PAGE_WIDTH}px`,
              minHeight: `${PAGE_HEIGHT}px`,
              transform: `scale(${scale})`,
              '--page-px': '60px',
              '--page-py': '56px',
              '--page-h': `${PAGE_HEIGHT}px`,
              '--band-px': '60px',
              '--band-py': '48px',
              '--band-radius': '0px',
            }"
          >
            <DocumentRenderer :document="doc" :design="shared.template || ''" />
          </div>
        </div>
        <p class="mt-6 text-center text-sm text-muted">
          Made with <RouterLink to="/" class="font-semibold text-brand-700 hover:underline">FirstDraft</RouterLink>. You can make your own for free.
        </p>
      </div>
    </main>

    <Teleport to="body">
      <div v-if="doc" id="print-root" class="hidden bg-white text-gray-900">
        <DocumentRenderer :document="doc" :design="shared.template || ''" />
      </div>
    </Teleport>
  </div>
</template>
