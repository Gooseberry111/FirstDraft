<script setup>
import { computed, nextTick, onBeforeUnmount, ref, toRaw, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  AlertCircle,
  ArrowUp,
  Check,
  FileDown,
  FileText,
  Loader2,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  RotateCcw,
} from "lucide-vue-next";

import EditorSidebar from "@/components/editor/EditorSidebar.vue";
import DocumentRenderer from "@/components/templates/DocumentRenderer.vue";
import { useDraftStore } from "@/stores/draft";
import { sendToAI, extractDocument } from "@/services/ai";
import {
  DOCUMENT_TYPES,
  createEmptyDocument,
  isDocumentEmpty,
  isProseDocument,
  normalizeDocument,
} from "@/services/documentBuilder";
import { useDocumentProgress } from "@/composables/useDocumentProgress";
import { formatMessage, safeFileName } from "@/utils/format";

const PAGE_WIDTH = 794; // A4 at 96dpi
const PAGE_HEIGHT = 1123;
const UNTITLED = "Untitled Draft";

const TEMPLATES = [
  { id: "modern", label: "Modern" },
  { id: "corporate", label: "Corporate" },
  { id: "academic", label: "Academic" },
];

const route = useRoute();
const router = useRouter();
const draftStore = useDraftStore();

// ---------- State ----------
const draftId = ref("");
const loading = ref(true);
const loadError = ref("");

const messages = ref([]);
const message = ref("");
const isSending = ref(false);

// `latestDocument` is the real data (saved + exported); `documentContent` is the
// on-screen copy that types itself in.
const latestDocument = ref(createEmptyDocument());
const documentContent = ref(createEmptyDocument());
const isUpdatingPreview = ref(false);
const previewError = ref("");

const selectedTemplate = ref("modern");
const templateChosenByUser = ref(false);

const mobileTab = ref("chat");
const mobileMenuOpen = ref(false);
const sidebarOpen = ref(readPref("fd.sidebarOpen", true));
const sidebarWidth = ref(readPref("fd.sidebarWidth", 264));
const isDragging = ref(false);

const editingTitle = ref(false);
const titleDraft = ref("");
const exportingWord = ref(false);

const messagesContainer = ref(null);
const textareaRef = ref(null);
const titleInput = ref(null);
const pageContainer = ref(null);
const pageRef = ref(null);
const pageScale = ref(1);
const pageHeight = ref(PAGE_HEIGHT);

const draft = computed(() => draftStore.currentDraft);
const title = computed(() => draft.value?.title || UNTITLED);
const docType = computed(() => latestDocument.value.documentType);
const isProse = computed(() => isProseDocument(docType.value));
const progress = computed(() => useDocumentProgress(latestDocument.value));
const isEmpty = computed(() => isDocumentEmpty(documentContent.value));
const canSend = computed(() => !!message.value.trim() && !isSending.value && !loading.value);

// ---------- Preferences (per browser, best effort) ----------
function readPref(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value == null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}
function writePref(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}
watch(sidebarOpen, (v) => writePref("fd.sidebarOpen", v));

// ---------- Loading ----------
watch(
  () => route.params.id,
  (id) => {
    if (id === "new") createAndOpen();
    else if (id) loadDraft(String(id));
  },
  { immediate: true },
);

async function createAndOpen() {
  loading.value = true;
  loadError.value = "";
  try {
    const created = await draftStore.createDraft();
    router.replace(`/app/draft/${created.id}`);
  } catch (error) {
    loadError.value = error?.message || "Couldn't create a new draft.";
    loading.value = false;
  }
}

async function loadDraft(id) {
  stopAnimation(false);
  draftId.value = id;
  loading.value = true;
  loadError.value = "";
  previewError.value = "";
  isSending.value = false;
  isUpdatingPreview.value = false;
  editingTitle.value = false;
  mobileTab.value = "chat";
  messages.value = [];

  if (!draftStore.draftsLoaded) draftStore.fetchDrafts().catch(() => {});

  try {
    const [loaded, history] = await Promise.all([
      draftStore.getDraft(id),
      draftStore.getMessages(id),
    ]);
    if (draftId.value !== id) return;

    const doc = normalizeDocument(loaded.document_data, loaded.document_type);
    latestDocument.value = doc;
    documentContent.value = structuredClone(doc);
    messages.value = history.map(({ role, content }) => ({ role, content }));

    templateChosenByUser.value = !!loaded.template;
    selectedTemplate.value = loaded.template || recommendTemplate(doc);
  } catch (error) {
    if (draftId.value !== id) return;
    loadError.value =
      error?.code === "PGRST116"
        ? "This draft doesn't exist or you don't have access to it."
        : error?.message || "Couldn't load this draft.";
  } finally {
    if (draftId.value === id) loading.value = false;
  }

  await scrollToBottom();
  focusInput();
}

// ---------- Chat ----------
async function sendMessage() {
  const text = message.value.trim();
  if (!text || isSending.value || !draft.value) return;

  message.value = "";
  resizeTextarea();
  messages.value.push({ role: "user", content: text, unsaved: true });

  await requestReply();
}

async function retry() {
  const last = messages.value[messages.value.length - 1];
  if (last?.failed) messages.value.pop();
  await requestReply();
}

async function requestReply() {
  const id = draftId.value;
  isSending.value = true;

  const index = messages.value.push({ role: "assistant", content: "", pending: true }) - 1;
  const pending = messages.value[index];
  await scrollToBottom();

  try {
    for (const msg of messages.value.filter((m) => m.unsaved)) {
      await draftStore.addMessage(id, msg.role, msg.content);
      delete msg.unsaved;
    }

    const reply = await sendToAI(messages.value);
    await draftStore.addMessage(id, "assistant", reply.content);
    if (draftId.value !== id) return;

    pending.content = reply.content;
    delete pending.pending;
  } catch (error) {
    if (draftId.value !== id) return;
    pending.content = error?.message || "Something went wrong. Please try again.";
    pending.failed = true;
    delete pending.pending;
    return;
  } finally {
    if (draftId.value === id) {
      isSending.value = false;
      scrollToBottom();
      focusInput();
    }
  }

  refreshDocument(id);
}

function handleEnter(event) {
  if (event.shiftKey || event.isComposing) return;
  event.preventDefault();
  sendMessage();
}

function resizeTextarea() {
  nextTick(() => {
    const el = textareaRef.value;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  });
}

function focusInput() {
  if (window.matchMedia("(pointer: fine)").matches) {
    nextTick(() => textareaRef.value?.focus());
  }
}

async function scrollToBottom() {
  await nextTick();
  const el = messagesContainer.value;
  if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
}

// ---------- Document ----------
let extractSeq = 0;

async function refreshDocument(id) {
  const seq = ++extractSeq;
  isUpdatingPreview.value = true;
  previewError.value = "";

  try {
    const previous = latestDocument.value;
    const doc = await extractDocument(messages.value, previous.documentType);
    if (seq !== extractSeq || draftId.value !== id) return;

    latestDocument.value = doc;
    animateDocument(doc);

    if (!templateChosenByUser.value) selectedTemplate.value = recommendTemplate(doc);

    const fields = { document_data: doc };
    const currentTitle = draft.value?.title;
    if (!currentTitle || currentTitle === UNTITLED || currentTitle === autoTitle(previous)) {
      const next = autoTitle(doc);
      if (next) fields.title = next;
    }

    await draftStore.updateDraft(id, fields);
  } catch (error) {
    if (seq === extractSeq && draftId.value === id) {
      previewError.value = error?.message || "Couldn't update the preview.";
    }
  } finally {
    if (seq === extractSeq && draftId.value === id) isUpdatingPreview.value = false;
  }
}

function autoTitle(doc) {
  if (!doc) return "";
  const type = DOCUMENT_TYPES[doc.documentType] || "Draft";
  if (isProseDocument(doc.documentType) && doc.title) return doc.title.slice(0, 80);
  const name = doc.personalInfo?.name;
  return name ? `${name} — ${type}` : "";
}

function recommendTemplate(doc) {
  if (doc.documentType === "cv" || doc.publications?.length || doc.research?.length) {
    return "academic";
  }
  if (doc.experience?.length >= 3) return "corporate";
  return "modern";
}

async function selectTemplate(id) {
  selectedTemplate.value = id;
  templateChosenByUser.value = true;
  try {
    await draftStore.updateTemplate(draftId.value, id);
  } catch {
    /* non-critical; the choice still applies this session */
  }
}

// ---------- Typing animation ----------
// Changed text fields are typed in together over ~1s using a single timer.
// A new update finishes the previous animation instantly, so nothing overlaps.
let animationTimer = null;
let animationJobs = [];

function stopAnimation(finish = true) {
  clearInterval(animationTimer);
  animationTimer = null;
  if (finish) for (const job of animationJobs) job.target[job.key] = job.value;
  animationJobs = [];
}

function animateDocument(next) {
  stopAnimation(true);
  const previous = structuredClone(toRaw(documentContent.value));
  documentContent.value = structuredClone(next);

  const jobs = [];
  const collect = (target, before) => {
    for (const key of Object.keys(target)) {
      const value = target[key];
      const old = before?.[key];
      if (typeof value === "string") {
        if (!value || value === old) continue;
        const start = typeof old === "string" && value.startsWith(old) ? old.length : 0;
        jobs.push({ target, key, value, pos: start });
        target[key] = value.slice(0, start);
      } else if (value && typeof value === "object") {
        collect(value, old && typeof old === "object" ? old : undefined);
      }
    }
  };
  collect(documentContent.value, previous);

  if (!jobs.length) return;
  animationJobs = jobs;

  const TICK = 25;
  const STEPS = 40;
  animationTimer = setInterval(() => {
    let active = false;
    for (const job of animationJobs) {
      if (job.pos >= job.value.length) continue;
      job.pos = Math.min(job.value.length, job.pos + Math.max(1, Math.ceil(job.value.length / STEPS)));
      job.target[job.key] = job.value.slice(0, job.pos);
      active = true;
    }
    if (!active) stopAnimation(false);
  }, TICK);
}

// ---------- Title ----------
function startRename() {
  titleDraft.value = title.value;
  editingTitle.value = true;
  nextTick(() => titleInput.value?.select());
}

async function saveTitle() {
  if (!editingTitle.value) return;
  editingTitle.value = false;
  const next = titleDraft.value.trim().slice(0, 120);
  if (!next || next === title.value) return;
  try {
    await draftStore.updateDraftTitle(draftId.value, next);
  } catch (error) {
    alert(error?.message || "Couldn't rename the draft.");
  }
}

// ---------- Export ----------
const exportName = computed(() => safeFileName(title.value === UNTITLED ? "" : title.value));

function exportPDF() {
  stopAnimation(true);
  const original = document.title;
  document.title = exportName.value; // becomes the default PDF file name
  const restore = () => {
    document.title = original;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}

async function downloadWord() {
  if (exportingWord.value) return;
  exportingWord.value = true;
  try {
    const { exportWord } = await import("@/services/exportWord");
    await exportWord(latestDocument.value, exportName.value);
  } catch (error) {
    console.error(error);
    alert("Couldn't create the Word document. Please try again.");
  } finally {
    exportingWord.value = false;
  }
}

// ---------- Sidebar resize ----------
function startDrag(event) {
  isDragging.value = true;
  event.preventDefault();
  window.addEventListener("pointermove", onDrag);
  window.addEventListener("pointerup", stopDrag);
}
function onDrag(event) {
  sidebarWidth.value = Math.max(220, Math.min(420, event.clientX));
}
function stopDrag() {
  isDragging.value = false;
  writePref("fd.sidebarWidth", sidebarWidth.value);
  window.removeEventListener("pointermove", onDrag);
  window.removeEventListener("pointerup", stopDrag);
}

// ---------- Page scaling (fit the A4 page to the available width) ----------
const resizeObserver = new ResizeObserver(() => {
  const width = pageContainer.value?.clientWidth || PAGE_WIDTH;
  pageScale.value = Math.min(1, width / PAGE_WIDTH);
  pageHeight.value = Math.max(PAGE_HEIGHT, pageRef.value?.offsetHeight || PAGE_HEIGHT);
});

watch([pageContainer, pageRef], ([container, page]) => {
  resizeObserver.disconnect();
  if (container) resizeObserver.observe(container);
  if (page) resizeObserver.observe(page);
});

onBeforeUnmount(() => {
  stopAnimation(false);
  stopDrag();
  resizeObserver?.disconnect();
});
</script>

<template>
  <div class="flex h-dvh overflow-hidden bg-canvas text-zinc-100" :class="isDragging && 'cursor-col-resize select-none'">
    <!-- Desktop sidebar -->
    <aside
      :style="{ width: sidebarOpen ? `${sidebarWidth}px` : '0px' }"
      :class="isDragging ? '' : 'transition-[width] duration-200'"
      class="relative hidden shrink-0 overflow-hidden border-r border-line lg:block"
    >
      <div :style="{ width: `${sidebarWidth}px` }" class="h-full">
        <EditorSidebar :drafts="draftStore.drafts" :active-id="draftId" />
      </div>
      <div
        v-if="sidebarOpen"
        class="absolute inset-y-0 right-0 w-1.5 cursor-col-resize transition hover:bg-violet-500/60"
        :class="isDragging && 'bg-violet-500/60'"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        @pointerdown="startDrag"
      />
    </aside>

    <!-- Mobile drawer -->
    <Transition name="fade">
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-0 z-40 bg-black/60 lg:hidden"
        @click="mobileMenuOpen = false"
      />
    </Transition>
    <Transition name="drawer">
      <aside v-if="mobileMenuOpen" class="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] shadow-2xl lg:hidden">
        <EditorSidebar
          :drafts="draftStore.drafts"
          :active-id="draftId"
          closable
          @close="mobileMenuOpen = false"
        />
      </aside>
    </Transition>

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Top bar -->
      <header class="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-canvas px-3 sm:px-4">
        <button
          class="icon-btn hidden lg:inline-flex"
          :aria-label="sidebarOpen ? 'Hide drafts' : 'Show drafts'"
          @click="sidebarOpen = !sidebarOpen"
        >
          <component :is="sidebarOpen ? PanelLeftClose : PanelLeftOpen" :size="19" />
        </button>
        <button class="icon-btn lg:hidden" aria-label="Show drafts" @click="mobileMenuOpen = true">
          <Menu :size="19" />
        </button>

        <div class="min-w-0 flex-1">
          <input
            v-if="editingTitle"
            ref="titleInput"
            v-model="titleDraft"
            maxlength="120"
            aria-label="Draft title"
            class="w-full max-w-md rounded-lg border border-violet-500 bg-surface px-2.5 py-1 text-sm font-medium text-white focus:outline-none"
            @keydown.enter.prevent="saveTitle"
            @keydown.esc="editingTitle = false"
            @blur="saveTitle"
          />
          <button
            v-else
            class="group flex max-w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-raised"
            :disabled="loading || !!loadError"
            title="Rename draft"
            @click="startRename"
          >
            <span class="truncate text-sm font-medium text-white">
              {{ loading ? "Loading…" : title }}
            </span>
            <Pencil v-if="!loading" :size="13" class="shrink-0 text-faint opacity-0 transition group-hover:opacity-100" />
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="btn-secondary px-3"
            :disabled="loading || !!loadError"
            title="Save as PDF (choose “Save as PDF” in the print dialog)"
            @click="exportPDF"
          >
            <FileDown :size="16" />
            <span class="hidden sm:inline">PDF</span>
          </button>
          <button
            class="btn-secondary px-3"
            :disabled="loading || !!loadError || exportingWord"
            title="Download as Word (.docx)"
            @click="downloadWord"
          >
            <Loader2 v-if="exportingWord" :size="16" class="animate-spin" />
            <FileText v-else :size="16" />
            <span class="hidden sm:inline">Word</span>
          </button>
        </div>
      </header>

      <!-- Load error -->
      <div v-if="loadError" class="flex flex-1 items-center justify-center p-6">
        <div class="card max-w-sm p-6 text-center">
          <AlertCircle :size="28" class="mx-auto text-red-400" />
          <p class="mt-3 text-zinc-200">{{ loadError }}</p>
          <RouterLink to="/app/dashboard" class="btn-primary mt-5">Back to dashboard</RouterLink>
        </div>
      </div>

      <template v-else>
        <!-- Mobile tabs -->
        <div class="flex shrink-0 border-b border-line lg:hidden" role="tablist">
          <button
            v-for="tab in ['chat', 'preview']"
            :key="tab"
            role="tab"
            :aria-selected="mobileTab === tab"
            :class="mobileTab === tab ? 'border-violet-500 text-white' : 'border-transparent text-muted'"
            class="flex flex-1 items-center justify-center gap-2 border-b-2 py-2.5 text-sm font-medium capitalize transition"
            @click="mobileTab = tab"
          >
            {{ tab }}
            <span
              v-if="tab === 'preview' && isUpdatingPreview"
              class="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400"
            />
          </button>
        </div>

        <div class="flex min-h-0 flex-1">
          <!-- Chat -->
          <section
            :class="mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'"
            class="min-h-0 w-full shrink-0 flex-col border-line bg-surface/40 lg:w-[420px] lg:border-r xl:w-[460px]"
            aria-label="Chat"
          >
            <div ref="messagesContainer" class="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-5">
              <div v-if="loading" class="space-y-4">
                <div v-for="i in 4" :key="i" :class="i % 2 ? '' : 'ml-auto'" class="h-16 w-3/4 animate-pulse rounded-2xl bg-raised" />
              </div>

              <ul v-else class="space-y-4">
                <li
                  v-for="(msg, index) in messages"
                  :key="index"
                  :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
                  class="flex animate-fade-up"
                >
                  <div
                    v-if="msg.role === 'user'"
                    class="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-violet-600 px-4 py-2.5 text-[15px] leading-relaxed text-white"
                  >{{ msg.content }}</div>

                  <div
                    v-else-if="msg.pending"
                    class="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-line bg-raised px-4 py-3.5"
                    aria-label="FirstDraft is typing"
                  >
                    <span class="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
                    <span class="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
                    <span class="h-2 w-2 animate-bounce rounded-full bg-muted" />
                  </div>

                  <div
                    v-else-if="msg.failed"
                    class="max-w-[85%] rounded-2xl rounded-tl-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-[15px] text-red-200"
                  >
                    <p class="flex items-start gap-2">
                      <AlertCircle :size="17" class="mt-0.5 shrink-0" />
                      {{ msg.content }}
                    </p>
                    <button
                      v-if="index === messages.length - 1"
                      class="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-red-100 underline-offset-2 hover:underline"
                      @click="retry"
                    >
                      <RotateCcw :size="14" /> Try again
                    </button>
                  </div>

                  <div
                    v-else
                    class="message-body max-w-[90%] break-words rounded-2xl rounded-tl-md border border-line bg-raised px-4 py-3 text-[15px] leading-relaxed text-zinc-200"
                    v-html="formatMessage(msg.content)"
                  />
                </li>
              </ul>
            </div>

            <form class="shrink-0 p-3 sm:p-4" @submit.prevent="sendMessage">
              <div
                class="flex items-end gap-2 rounded-2xl border border-line bg-raised p-2 pl-4 transition focus-within:border-violet-500/70"
              >
                <textarea
                  ref="textareaRef"
                  v-model="message"
                  rows="1"
                  placeholder="Reply to FirstDraft…"
                  aria-label="Message"
                  :disabled="loading"
                  class="scrollbar-thin max-h-[180px] min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-zinc-100 placeholder:text-faint focus:outline-none"
                  @input="resizeTextarea"
                  @keydown.enter="handleEnter"
                />
                <button
                  type="submit"
                  :disabled="!canSend"
                  aria-label="Send message"
                  class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:bg-line disabled:text-faint"
                >
                  <Loader2 v-if="isSending" :size="18" class="animate-spin" />
                  <ArrowUp v-else :size="18" />
                </button>
              </div>
              <p class="mt-2 hidden text-center text-xs text-faint sm:block">
                Enter to send · Shift + Enter for a new line
              </p>
            </form>
          </section>

          <!-- Preview -->
          <section
            :class="mobileTab === 'preview' ? 'block' : 'hidden lg:block'"
            class="scrollbar-thin min-h-0 min-w-0 flex-1 overflow-y-auto"
            aria-label="Document preview"
          >
            <div class="mx-auto max-w-[842px] px-4 py-5 sm:px-6 lg:py-8">
              <!-- Toolbar -->
              <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div v-if="!isProse" class="inline-flex rounded-xl border border-line bg-surface p-1" role="radiogroup" aria-label="Template">
                  <button
                    v-for="t in TEMPLATES"
                    :key="t.id"
                    role="radio"
                    :aria-checked="selectedTemplate === t.id"
                    :class="selectedTemplate === t.id ? 'bg-raised text-white shadow-sm' : 'text-muted hover:text-zinc-200'"
                    class="rounded-lg px-3 py-1.5 text-sm font-medium transition"
                    @click="selectTemplate(t.id)"
                  >
                    {{ t.label }}
                  </button>
                </div>
                <span v-else class="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-zinc-300">
                  {{ DOCUMENT_TYPES[docType] }}
                </span>

                <span v-if="isUpdatingPreview" class="flex items-center gap-2 text-sm text-muted">
                  <Loader2 :size="15" class="animate-spin" /> Updating preview…
                </span>
                <span v-else-if="previewError" class="flex items-center gap-2 text-sm text-amber-400" :title="previewError">
                  <AlertCircle :size="15" /> Preview not updated
                </span>
              </div>

              <!-- Progress -->
              <div class="card mb-6 p-4">
                <div class="flex items-center justify-between text-sm">
                  <span class="font-medium text-zinc-200">
                    {{ DOCUMENT_TYPES[docType] }} progress
                  </span>
                  <span class="font-semibold tabular-nums text-violet-400">{{ progress.percentage }}%</span>
                </div>
                <div class="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    class="h-full rounded-full bg-violet-500 transition-[width] duration-500"
                    :style="{ width: `${progress.percentage}%` }"
                  />
                </div>
                <ul class="mt-3 flex flex-wrap gap-1.5">
                  <li
                    v-for="section in progress.sections"
                    :key="section.label"
                    :class="section.done ? 'border-violet-500/30 bg-violet-500/10 text-violet-200' : 'border-line text-faint'"
                    class="flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs"
                  >
                    <Check v-if="section.done" :size="12" />
                    {{ section.label }}
                  </li>
                </ul>
              </div>

              <!-- A4 page, scaled to fit -->
              <div ref="pageContainer" class="w-full">
                <div :style="{ height: `${pageHeight * pageScale}px` }" class="relative mx-auto" :class="pageScale === 1 && 'w-[794px]'">
                  <div
                    ref="pageRef"
                    :style="{ width: `${PAGE_WIDTH}px`, minHeight: `${PAGE_HEIGHT}px`, transform: `scale(${pageScale})` }"
                    class="absolute left-0 top-0 origin-top-left rounded-sm bg-white px-[60px] py-[56px] text-gray-900 shadow-paper"
                  >
                    <div v-if="loading" class="space-y-4">
                      <div class="h-8 w-1/2 animate-pulse rounded bg-gray-100" />
                      <div class="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
                      <div class="h-32 animate-pulse rounded bg-gray-100" />
                    </div>
                    <div
                      v-else-if="isEmpty"
                      class="flex flex-col items-center justify-center text-center"
                      :style="{ minHeight: `${PAGE_HEIGHT - 112}px` }"
                    >
                      <span class="grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-violet-600">
                        <FileText :size="26" />
                      </span>
                      <h2 class="mt-5 text-xl font-semibold text-gray-900">Your document will appear here</h2>
                      <p class="mt-2 max-w-xs text-sm text-gray-500">
                        Answer FirstDraft's questions in the chat and watch it build itself.
                      </p>
                    </div>
                    <DocumentRenderer v-else :document="documentContent" :template="selectedTemplate" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </template>
    </div>

    <!-- Print-only copy used for PDF export -->
    <Teleport to="body">
      <div id="print-root" class="hidden bg-white text-gray-900">
        <DocumentRenderer :document="latestDocument" :template="selectedTemplate" />
      </div>
    </Teleport>
  </div>
</template>
