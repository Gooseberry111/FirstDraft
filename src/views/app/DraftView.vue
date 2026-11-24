<script setup>
import { computed, nextTick, onBeforeUnmount, ref, toRaw, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  AlertCircle,
  ArrowUp,
  Check,
  ChevronDown,
  Palette,
  X,
  CloudOff,
  FileDown,
  FileText,
  GraduationCap,
  Loader2,
  Mail,
  Menu,
  MousePointerClick,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-vue-next";

import EditorSidebar from "@/components/editor/EditorSidebar.vue";
import DocumentRenderer from "@/components/templates/DocumentRenderer.vue";
import { provideEditApi } from "@/components/templates/editing";
import DocumentThumb from "@/components/templates/DocumentThumb.vue";
import {
  ACCENTS,
  accentHex,
  defaultStyle,
  formatDesign,
  parseDesign,
  sampleFor,
  stylesFor,
} from "@/components/templates/themes";
import { useDraftStore } from "@/stores/draft";
import { chatTurn } from "@/services/ai";
import {
  DOCUMENT_TYPES,
  createEmptyDocument,
  isDocumentEmpty,
  applyDocumentPatch,
  isProseDocument,
  normalizeDocument,
} from "@/services/documentBuilder";
import { formatMessage, safeFileName } from "@/utils/format";
import { docTypeStyle } from "@/utils/docTypes";
import QualityPanel from "@/components/quality/QualityPanel.vue";
import ScoreRing from "@/components/quality/ScoreRing.vue";
import { analyzeDocument } from "@/services/quality";

const PAGE_WIDTH = 794; // A4 at 96dpi
const PAGE_HEIGHT = 1123;
const UNTITLED = "Untitled Draft";


// Choosing a document type is answered locally — no AI request needed.
const STARTERS = [
  {
    type: "resume",
    icon: FileText,
    description: "1–2 pages, tailored to a job",
    question: "Great, let's build your resume. What kind of role are you going for?\n\nExample: Junior frontend developer",
    suggestions: ["Software / tech", "Marketing", "Finance", "I'm a student or recent grad"],
  },
  {
    type: "cv",
    icon: GraduationCap,
    description: "Full academic & career history",
    question: "Great, let's build your CV. What field is it for?",
    suggestions: ["Academic / research", "Medical", "General professional"],
  },
  {
    type: "cover_letter",
    icon: Mail,
    description: "To go with a job application",
    question: "Let's write your cover letter. Which role and company are you applying to?\n\nExample: Product Designer at Spotify",
    suggestions: [],
  },
  {
    type: "essay",
    icon: PenLine,
    description: "Personal statement, scholarship…",
    question: "Let's write your essay. What is it for?",
    suggestions: ["College admission", "Scholarship", "Personal statement", "Something else"],
  },
];

const ADDABLE_SECTIONS = [
  { key: "summary", label: "Summary" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
  { key: "skills", label: "Skills" },
  { key: "projects", label: "Projects" },
  { key: "certifications", label: "Certifications" },
  { key: "achievements", label: "Achievements" },
  { key: "research", label: "Research" },
  { key: "publications", label: "Publications" },
];

const BLANK_ITEMS = {
  experience: { position: "", company: "", date: "", description: "" },
  education: { degree: "", school: "", date: "", details: "" },
  research: { title: "", institution: "", date: "", description: "" },
  projects: { name: "", description: "" },
  publications: { title: "", publisher: "", date: "" },
};

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
const suggestions = ref([]);
const usage = ref(null);

// `latestDocument` is the real data (saved, exported, sent to the AI);
// `documentContent` is the on-screen copy that types itself in.
const latestDocument = ref(createEmptyDocument());
const documentContent = ref(createEmptyDocument());
const shownSections = ref(new Set());
const saveState = ref("saved"); // saved | pending | saving | error

const design = ref(""); // "style:accent" — see components/templates/themes.js
const designOpen = ref(false);
const qualityOpen = ref(false);
const templateChosenByUser = ref(false);

const mobileTab = ref("chat");
const mobileMenuOpen = ref(false);
const sidebarOpen = ref(readPref("fd.sidebarOpen", false));

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
const isEmpty = computed(() => isDocumentEmpty(documentContent.value));
const hasStarted = computed(() => messages.value.some((m) => m.role === "user"));
const canSend = computed(() => !!message.value.trim() && !isSending.value && !loading.value);
const usageLeft = computed(() =>
  usage.value?.limit > 0 ? Math.max(0, usage.value.limit - usage.value.used) : null,
);
const missingSections = computed(() =>
  isProse.value
    ? []
    : ADDABLE_SECTIONS.filter(({ key }) =>
        key === "summary"
          ? !latestDocument.value.summary && !shownSections.value.has("summary")
          : !latestDocument.value[key]?.length,
      ),
);

const cleanDocument = () =>
  normalizeDocument(latestDocument.value, latestDocument.value.documentType);

// ---------- Preferences (per browser, best effort) ----------
function readPref(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value == null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}
watch(sidebarOpen, (value) => {
  try {
    localStorage.setItem("fd.sidebarOpen", JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
});

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
  flushSave();
  loading.value = true;
  loadError.value = "";
  try {
    const created = await draftStore.createDraft();
    router.replace({
      path: `/app/draft/${created.id}`,
      query: route.query.start ? { start: route.query.start } : {},
    });
  } catch (error) {
    loadError.value = error?.message || "Couldn't create a new draft.";
    loading.value = false;
  }
}

async function loadDraft(id) {
  flushSave();
  draftId.value = id;
  loading.value = true;
  loadError.value = "";
  isSending.value = false;
  suggestions.value = [];
  editingTitle.value = false;
  designOpen.value = false;
  qualityOpen.value = false;
  mobileTab.value = "chat";
  messages.value = [];
  shownSections.value = new Set();
  saveState.value = "saved";

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
    design.value = formatDesign(parseDesign(loaded.template || recommendStyle(doc), doc.documentType));
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

  // Started from a dashboard card: pick the document type straight away.
  const starter = STARTERS.find((st) => st.type === route.query.start);
  if (starter && draftId.value === id && !loadError.value) {
    router.replace({ query: {} });
    if (!hasStarted.value) chooseType(starter);
  }
}

// ---------- Starting a document (no AI request) ----------
async function chooseType(starter) {
  const id = draftId.value;
  const label = DOCUMENT_TYPES[starter.type];

  latestDocument.value.documentType = starter.type;
  documentContent.value.documentType = starter.type;
  if (!templateChosenByUser.value) {
    design.value = formatDesign({ style: defaultStyle(starter.type), accent: currentDesign.value.accent });
  }

  messages.value.push({ role: "user", content: label });
  messages.value.push({ role: "assistant", content: starter.question });
  suggestions.value = starter.suggestions;
  await scrollToBottom();
  focusInput();

  try {
    await draftStore.addMessage(id, "user", label);
    await draftStore.addMessage(id, "assistant", starter.question);
    const fields = { document_data: cleanDocument() };
    if (title.value === UNTITLED) fields.title = `New ${label}`;
    await draftStore.updateDraft(id, fields);
  } catch {
    /* the conversation still works; it will be saved with the next message */
  }
}

// ---------- Chat ----------
async function sendMessage(text = message.value) {
  const content = text.trim();
  if (!content || isSending.value || !draft.value) return;

  if (text === message.value) {
    message.value = "";
    resizeTextarea();
  }
  messages.value.push({ role: "user", content, unsaved: true });
  await requestReply();
}

async function retry() {
  const last = messages.value[messages.value.length - 1];
  if (last?.failed) messages.value.pop();
  await requestReply();
}

// Messages are saved in order, in the background, so replies never wait on the database.
let saveQueue = Promise.resolve();
function saveUnsavedMessages(id) {
  saveQueue = saveQueue
    .then(async () => {
      for (const msg of messages.value.filter((m) => m.unsaved)) {
        await draftStore.addMessage(id, msg.role, msg.content);
        delete msg.unsaved;
      }
    })
    .catch(() => {
      /* left marked unsaved; retried with the next message */
    });
  return saveQueue;
}

async function requestReply() {
  const id = draftId.value;
  isSending.value = true;
  suggestions.value = [];

  const index = messages.value.push({ role: "assistant", content: "", pending: true }) - 1;
  const pending = messages.value[index];
  scrollToBottom();
  saveUnsavedMessages(id);

  let result;
  try {
    result = await chatTurn(messages.value, cleanDocument(), (partial) => {
      if (draftId.value !== id) return;
      if (partial.reply) {
        pending.content = partial.reply;
        pending.pending = false;
      }
      if (partial.document) {
        documentContent.value = applyDocumentPatch(latestDocument.value, partial.document);
      }
      scrollToBottom(false);
    });
    if (draftId.value !== id) return;

    pending.content = result.reply;
    pending.pending = false;
    pending.unsaved = true;
    saveUnsavedMessages(id);
    suggestions.value = result.suggestions;
    if (result.usage) usage.value = result.usage;
  } catch (error) {
    if (draftId.value !== id) return;
    pending.content = error?.message || "Something went wrong. Please try again.";
    pending.failed = true;
    pending.pending = false;
    documentContent.value = structuredClone(toRaw(latestDocument.value));
    return;
  } finally {
    if (draftId.value === id) {
      isSending.value = false;
      scrollToBottom();
      focusInput();
    }
  }

  if (result.document) applyAiDocument(id, applyDocumentPatch(latestDocument.value, result.document));
  else documentContent.value = structuredClone(toRaw(latestDocument.value));
}

async function applyAiDocument(id, doc) {
  const previous = latestDocument.value;
  latestDocument.value = doc;
  documentContent.value = structuredClone(doc);
  shownSections.value = new Set();

  if (!templateChosenByUser.value) {
    design.value = formatDesign({ style: recommendStyle(doc), accent: currentDesign.value.accent });
  }

  const fields = { document_data: doc };
  const currentTitle = draft.value?.title;
  if (
    !currentTitle ||
    currentTitle === UNTITLED ||
    currentTitle === `New ${DOCUMENT_TYPES[previous.documentType]}` ||
    currentTitle === autoTitle(previous)
  ) {
    const next = autoTitle(doc);
    if (next) fields.title = next;
  }

  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    await draftStore.updateDraft(id, fields);
    if (draftId.value === id) saveState.value = "saved";
  } catch {
    if (draftId.value === id) saveState.value = "error";
  }
}

function useSuggestion(text) {
  sendMessage(text);
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

async function scrollToBottom(smooth = true) {
  await nextTick();
  const el = messagesContainer.value;
  if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
}

function autoTitle(doc) {
  if (!doc) return "";
  const type = DOCUMENT_TYPES[doc.documentType] || "Draft";
  if (isProseDocument(doc.documentType) && doc.title) return doc.title.slice(0, 80);
  const name = doc.personalInfo?.name;
  return name ? `${name} — ${type}` : "";
}

function recommendStyle(doc) {
  if (isProseDocument(doc.documentType)) return defaultStyle(doc.documentType);
  if (doc.documentType === "cv" || doc.publications?.length || doc.research?.length) return "academic";
  if (doc.experience?.length >= 3) return "executive";
  return "modern";
}

// ---------- Design (style + accent colour) ----------
const currentDesign = computed(() => parseDesign(design.value, docType.value));
const designStyles = computed(() => stylesFor(docType.value));
const currentStyleLabel = computed(
  () => designStyles.value.find((st) => st.id === currentDesign.value.style)?.label || "",
);
const thumbDocument = computed(() =>
  isDocumentEmpty(latestDocument.value) ? sampleFor(docType.value) : printDocument.value,
);

async function updateDesign(changes) {
  design.value = formatDesign({ ...currentDesign.value, ...changes });
  templateChosenByUser.value = true;
  try {
    await draftStore.updateTemplate(draftId.value, design.value);
  } catch {
    /* non-critical; the choice still applies this session */
  }
}

// ---------- Editing the document directly (no AI request) ----------
let saveTimer = null;
let saveTarget = null;

function scheduleSave() {
  saveState.value = "pending";
  saveTarget = draftId.value;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNow(saveTarget, cleanDocument()), 900);
}

async function saveNow(id, doc) {
  saveTimer = null;
  if (draftId.value === id) saveState.value = "saving";
  try {
    await draftStore.saveDocument(id, doc);
    if (draftId.value === id && !saveTimer) saveState.value = "saved";
  } catch {
    if (draftId.value === id) saveState.value = "error";
  }
}

function flushSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveNow(saveTarget, cleanDocument());
  }
}

function forEachDoc(fn) {
  for (const doc of [latestDocument.value, documentContent.value]) fn(doc);
}

const editApi = {
  focus: () => {},
  shown: (key) => shownSections.value.has(key),
  edit(path, value) {
    forEachDoc((doc) => {
      let target = doc;
      for (const key of path.slice(0, -1)) target = target?.[key];
      if (!target) return;
      const last = path[path.length - 1];
      if (Array.isArray(target) && !value) target.splice(last, 1);
      else target[last] = value;
    });
    scheduleSave();
  },
  remove(key, index) {
    forEachDoc((doc) => doc[key]?.splice(index, 1));
    scheduleSave();
  },
  add(key) {
    if (key !== "summary") {
      forEachDoc((doc) => {
        if (!Array.isArray(doc[key])) doc[key] = [];
        doc[key].push(BLANK_ITEMS[key] ? { ...BLANK_ITEMS[key] } : "");
      });
    }
    shownSections.value = new Set([...shownSections.value, key]);
  },
};
provideEditApi(editApi);

function addSection(key) {
  editApi.add(key);
  mobileTab.value = "preview";
}

function onBeforeUnload(event) {
  if (saveState.value === "pending" || saveState.value === "saving") {
    flushSave();
    event.preventDefault();
  }
}
window.addEventListener("beforeunload", onBeforeUnload);

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
const exportName = computed(() =>
  safeFileName(title.value === UNTITLED ? "" : title.value),
);
// Always up to date, so the browser's own Print shortcut works too.
const printDocument = computed(cleanDocument);

// ---------- Strength score ----------
const quality = computed(() => analyzeDocument(printDocument.value));

function fixWithAI(text) {
  qualityOpen.value = false;
  mobileTab.value = "chat";
  sendMessage(text);
}

function exportPDF() {
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
    await exportWord(cleanDocument(), exportName.value, { accent: accentHex(currentDesign.value.accent) });
  } catch (error) {
    console.error(error);
    alert("Couldn't create the Word document. Please try again.");
  } finally {
    exportingWord.value = false;
  }
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
  flushSave();
  resizeObserver.disconnect();
  window.removeEventListener("beforeunload", onBeforeUnload);
});
</script>

<template>
  <div class="flex h-dvh overflow-hidden bg-canvas text-ink">
    <!-- Desktop drafts sidebar -->
    <aside
      :class="sidebarOpen ? 'w-64' : 'w-0'"
      class="hidden shrink-0 overflow-hidden border-r border-line transition-[width] duration-200 lg:block"
    >
      <div class="h-full w-64">
        <EditorSidebar :drafts="draftStore.drafts" :active-id="draftId" />
      </div>
    </aside>

    <!-- Mobile drawer -->
    <Transition name="fade">
      <div v-if="mobileMenuOpen" class="fixed inset-0 z-40 bg-black/30 lg:hidden" @click="mobileMenuOpen = false" />
    </Transition>
    <Transition name="drawer">
      <aside v-if="mobileMenuOpen" class="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] shadow-2xl lg:hidden">
        <EditorSidebar :drafts="draftStore.drafts" :active-id="draftId" closable @close="mobileMenuOpen = false" />
      </aside>
    </Transition>

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Top bar -->
      <header class="flex h-14 shrink-0 items-center gap-1.5 border-b border-line bg-surface px-2 sm:gap-2 sm:px-3">
        <button
          class="icon-btn hidden lg:inline-flex"
          :aria-label="sidebarOpen ? 'Hide drafts' : 'Show drafts'"
          :title="sidebarOpen ? 'Hide drafts' : 'Show drafts'"
          @click="sidebarOpen = !sidebarOpen"
        >
          <component :is="sidebarOpen ? PanelLeftClose : PanelLeftOpen" :size="19" />
        </button>
        <button class="icon-btn lg:hidden" aria-label="Show drafts" @click="mobileMenuOpen = true">
          <Menu :size="19" />
        </button>

        <div class="flex min-w-0 flex-1 items-center gap-2">
          <input
            v-if="editingTitle"
            ref="titleInput"
            v-model="titleDraft"
            maxlength="120"
            aria-label="Draft title"
            class="w-full max-w-sm rounded-lg border border-brand-500 bg-surface px-2.5 py-1 text-sm font-semibold text-ink ring-4 ring-brand-100 focus:outline-none"
            @keydown.enter.prevent="saveTitle"
            @keydown.esc="editingTitle = false"
            @blur="saveTitle"
          />
          <button
            v-else
            class="group flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 text-left hover:bg-subtle"
            :disabled="loading || !!loadError"
            title="Rename draft"
            @click="startRename"
          >
            <span class="truncate text-sm font-semibold text-ink">{{ loading ? "Loading…" : title }}</span>
            <Pencil v-if="!loading" :size="13" class="shrink-0 text-faint opacity-0 transition group-hover:opacity-100" />
          </button>

          <span v-if="!loading && !loadError" class="hidden shrink-0 items-center gap-1 text-xs text-muted sm:flex" aria-live="polite">
            <template v-if="saveState === 'saving' || saveState === 'pending'">
              <Loader2 :size="12" class="animate-spin" /> Saving…
            </template>
            <template v-else-if="saveState === 'error'">
              <CloudOff :size="13" class="text-red-500" /> <span class="text-red-600">Not saved</span>
            </template>
            <template v-else><Check :size="13" /> Saved</template>
          </span>
        </div>

        <!-- Mobile chat / preview switch -->
        <div v-if="!loadError" class="flex rounded-lg bg-subtle p-0.5 lg:hidden" role="tablist">
          <button
            v-for="tab in ['chat', 'preview']"
            :key="tab"
            role="tab"
            :aria-selected="mobileTab === tab"
            :class="mobileTab === tab ? 'bg-surface text-ink shadow-sm' : 'text-muted'"
            class="rounded-md px-3 py-1 text-sm font-medium capitalize transition"
            @click="mobileTab = tab"
          >
            {{ tab }}
          </button>
        </div>

        <button
          class="btn-secondary px-2.5 sm:px-3"
          :disabled="loading || !!loadError"
          title="Save as PDF — choose “Save as PDF” in the print dialog"
          @click="exportPDF"
        >
          <FileDown :size="16" />
          <span class="hidden sm:inline">PDF</span>
        </button>
        <button
          class="btn-primary px-2.5 sm:px-3"
          :disabled="loading || !!loadError || exportingWord"
          title="Download as Word (.docx)"
          @click="downloadWord"
        >
          <Loader2 v-if="exportingWord" :size="16" class="animate-spin" />
          <FileText v-else :size="16" />
          <span class="hidden sm:inline">Word</span>
        </button>
      </header>

      <!-- Load error -->
      <div v-if="loadError" class="flex flex-1 items-center justify-center p-6">
        <div class="card max-w-sm p-6 text-center">
          <AlertCircle :size="28" class="mx-auto text-red-500" />
          <p class="mt-3 text-ink-2">{{ loadError }}</p>
          <RouterLink to="/app/dashboard" class="btn-primary mt-5">Back to dashboard</RouterLink>
        </div>
      </div>

      <div v-else class="flex min-h-0 flex-1">
        <!-- Chat -->
        <section
          :class="mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'"
          class="min-h-0 w-full shrink-0 flex-col border-line bg-surface lg:w-[420px] lg:border-r xl:w-[440px]"
          aria-label="Chat"
        >
          <div ref="messagesContainer" class="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-5">
            <div v-if="loading" class="space-y-4">
              <div v-for="i in 4" :key="i" :class="i % 2 ? '' : 'ml-auto'" class="h-14 w-3/4 animate-pulse rounded-2xl bg-subtle" />
            </div>

            <ul v-else class="space-y-5">
              <li
                v-for="(msg, index) in messages"
                :key="index"
                :class="msg.role === 'user' ? 'justify-end' : 'justify-start gap-2.5'"
                class="flex animate-fade-up"
              >
                <span
                  v-if="msg.role !== 'user'"
                  class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-gradient text-white shadow-glow"
                  aria-hidden="true"
                >
                  <Sparkles :size="14" />
                </span>

                <div
                  v-if="msg.role === 'user'"
                  class="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-brand-gradient px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-glow"
                >{{ msg.content }}</div>

                <div
                  v-else-if="msg.pending"
                  class="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-subtle px-4 py-3.5"
                  aria-label="FirstDraft is writing"
                >
                  <span class="h-2 w-2 animate-bounce rounded-full bg-faint [animation-delay:-0.3s]" />
                  <span class="h-2 w-2 animate-bounce rounded-full bg-faint [animation-delay:-0.15s]" />
                  <span class="h-2 w-2 animate-bounce rounded-full bg-faint" />
                </div>

                <div
                  v-else-if="msg.failed"
                  class="max-w-[85%] rounded-2xl rounded-tl-md border border-red-200 bg-red-50 px-4 py-3 text-[15px] text-red-700"
                >
                  <p class="flex items-start gap-2">
                    <AlertCircle :size="17" class="mt-0.5 shrink-0" />
                    {{ msg.content }}
                  </p>
                  <button
                    v-if="index === messages.length - 1"
                    class="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-red-700 underline-offset-2 hover:underline"
                    @click="retry"
                  >
                    <RotateCcw :size="14" /> Try again
                  </button>
                </div>

                <div
                  v-else
                  class="message-body max-w-[88%] break-words rounded-2xl rounded-tl-md bg-subtle px-4 py-3 text-[15px] leading-relaxed text-ink-2"
                  v-html="formatMessage(msg.content)"
                />
              </li>
            </ul>

            <!-- Document type cards -->
            <div v-if="!loading && !hasStarted" class="mt-5 grid grid-cols-2 gap-2.5 pl-9">
              <button
                v-for="starter in STARTERS"
                :key="starter.type"
                class="group flex flex-col items-start rounded-2xl border border-line bg-surface p-3.5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-pop"
                @click="chooseType(starter)"
              >
                <span
                  class="grid h-10 w-10 place-items-center rounded-xl text-white transition group-hover:scale-105"
                  :class="docTypeStyle(starter.type).tile"
                >
                  <component :is="starter.icon" :size="18" />
                </span>
                <span class="mt-3 text-sm font-semibold text-ink">{{ DOCUMENT_TYPES[starter.type] }}</span>
                <span class="mt-0.5 text-xs leading-snug text-muted">{{ starter.description }}</span>
              </button>
            </div>

            <!-- Quick replies -->
            <div v-if="!isSending && suggestions.length" class="mt-3 flex flex-wrap gap-2 pl-9">
              <button v-for="s in suggestions" :key="s" class="chip" @click="useSuggestion(s)">
                {{ s }}
              </button>
            </div>
          </div>

          <form class="shrink-0 border-t border-line bg-surface p-3 sm:p-4" @submit.prevent="sendMessage()">
            <div class="flex items-end gap-2 rounded-2xl border border-line bg-canvas p-1.5 pl-4 transition focus-within:border-brand-500 focus-within:bg-surface focus-within:ring-4 focus-within:ring-brand-100">
              <textarea
                ref="textareaRef"
                v-model="message"
                rows="1"
                :placeholder="hasStarted ? 'Type your answer…' : 'Or tell FirstDraft what you need…'"
                aria-label="Message"
                :disabled="loading"
                class="scrollbar-thin max-h-[180px] min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-ink placeholder:text-faint focus:outline-none"
                @input="resizeTextarea"
                @keydown.enter="handleEnter"
              />
              <button
                type="submit"
                :disabled="!canSend"
                aria-label="Send message"
                class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:bg-line disabled:text-faint"
              >
                <Loader2 v-if="isSending" :size="18" class="animate-spin" />
                <ArrowUp v-else :size="18" />
              </button>
            </div>
            <p class="mt-2 text-center text-xs text-faint">
              <template v-if="usageLeft !== null && usageLeft <= 10">
                {{ usageLeft }} message{{ usageLeft === 1 ? "" : "s" }} left today ·
              </template>
              <span class="hidden sm:inline">Enter to send · Shift + Enter for a new line</span>
            </p>
          </form>
        </section>

        <!-- Preview -->
        <section
          :class="mobileTab === 'preview' ? 'block' : 'hidden lg:block'"
          class="desk scrollbar-thin min-h-0 min-w-0 flex-1 overflow-y-auto"
          aria-label="Document preview"
        >
          <div class="mx-auto max-w-[842px] px-4 py-5 sm:px-6 lg:py-7">
            <!-- Toolbar -->
            <div class="relative mb-4 flex flex-wrap items-center gap-2.5">
              <button
                class="btn-secondary py-2 pl-2 pr-3"
                :aria-expanded="designOpen"
                :disabled="loading"
                @click="designOpen = !designOpen"
              >
                <span
                  class="grid h-7 w-7 place-items-center rounded-lg text-white shadow-sm"
                  :style="{ background: accentHex(currentDesign.accent) }"
                >
                  <Palette :size="15" />
                </span>
                Design
                <span class="hidden font-medium text-muted sm:inline">· {{ currentStyleLabel }}</span>
                <ChevronDown :size="15" class="text-muted transition" :class="designOpen && 'rotate-180'" />
              </button>
              <span class="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-ink-2 ring-1 ring-line">
                {{ DOCUMENT_TYPES[docType] }}
              </span>

              <button
                v-if="!loading && hasStarted"
                class="ml-auto flex items-center gap-2 rounded-xl bg-white py-1 pl-1 pr-3 text-left shadow-sm ring-1 ring-line transition hover:shadow-pop hover:ring-brand-200"
                title="See how strong your document is"
                @click="qualityOpen = true"
              >
                <ScoreRing :score="quality.score" :size="34" :stroke="4" />
                <span class="leading-tight">
                  <span class="block text-[11px] font-semibold uppercase tracking-wider text-muted">Strength</span>
                  <span class="block text-sm font-bold text-ink">{{ quality.label }}</span>
                </span>
              </button>

              <!-- Design panel -->
              <div v-if="designOpen" class="fixed inset-0 z-20" @click="designOpen = false" />
              <div
                v-if="designOpen"
                class="card absolute left-0 right-0 top-full z-30 mt-2 animate-pop-in p-4 shadow-pop sm:p-5"
                role="dialog"
                aria-label="Design"
                @keydown.esc="designOpen = false"
              >
                <div class="flex items-center justify-between">
                  <h3 class="font-semibold text-ink">Style</h3>
                  <button class="icon-btn -mr-2 -mt-1" aria-label="Close design panel" @click="designOpen = false">
                    <X :size="17" />
                  </button>
                </div>
                <div class="mt-3 grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-x-3 gap-y-4">
                  <button
                    v-for="st in designStyles"
                    :key="st.id"
                    class="group flex flex-col items-center"
                    :aria-pressed="currentDesign.style === st.id"
                    @click="updateDesign({ style: st.id })"
                  >
                    <span
                      class="overflow-hidden rounded-lg transition group-hover:-translate-y-0.5 group-hover:shadow-pop"
                      :class="currentDesign.style === st.id ? 'shadow-glow ring-2 ring-brand-500 ring-offset-2' : 'ring-1 ring-line'"
                    >
                      <DocumentThumb :document="thumbDocument" :design="`${st.id}:${currentDesign.accent}`" :width="128" />
                    </span>
                    <span
                      class="mt-2 flex items-center gap-1 text-sm font-semibold"
                      :class="currentDesign.style === st.id ? 'text-brand-700' : 'text-ink-2'"
                    >
                      <Check v-if="currentDesign.style === st.id" :size="14" />{{ st.label }}
                    </span>
                  </button>
                </div>

                <h3 class="mt-5 font-semibold text-ink">Accent colour</h3>
                <div class="mt-3 flex flex-wrap gap-2.5">
                  <button
                    v-for="a in ACCENTS"
                    :key="a.id"
                    :title="a.label"
                    :aria-label="`${a.label} accent`"
                    :aria-pressed="currentDesign.accent === a.id"
                    class="grid h-9 w-9 place-items-center rounded-full text-white shadow-sm ring-offset-2 transition hover:scale-110"
                    :class="currentDesign.accent === a.id && 'ring-2 ring-ink/70'"
                    :style="{ background: `linear-gradient(135deg, ${a.hex}, ${a.hex}cc)` }"
                    @click="updateDesign({ accent: a.id })"
                  >
                    <Check v-if="currentDesign.accent === a.id" :size="16" />
                  </button>
                </div>
              </div>
            </div>

            <p v-if="!isEmpty && !loading" class="mb-3 flex items-center gap-1.5 text-xs text-muted">
              <MousePointerClick :size="14" /> Click any text on the page to edit it.
            </p>

            <!-- A4 page, scaled to fit -->
            <div ref="pageContainer" class="w-full">
              <div :style="{ height: `${pageHeight * pageScale}px` }" class="relative mx-auto" :class="pageScale === 1 && 'w-[794px]'">
                <div
                  ref="pageRef"
                  :style="{
                    width: `${PAGE_WIDTH}px`,
                    minHeight: `${PAGE_HEIGHT}px`,
                    transform: `scale(${pageScale})`,
                    '--page-px': '60px',
                    '--page-py': '56px',
                    '--page-h': `${PAGE_HEIGHT}px`,
                    '--band-px': '60px',
                    '--band-py': '48px',
                    '--band-radius': '0px',
                  }"
                  class="absolute left-0 top-0 origin-top-left overflow-hidden rounded-md bg-white px-[60px] py-[56px] text-gray-900 shadow-paper ring-1 ring-black/5"
                >
                  <div v-if="loading" class="space-y-4">
                    <div class="h-8 w-1/2 animate-pulse rounded bg-gray-100" />
                    <div class="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
                    <div class="h-32 animate-pulse rounded bg-gray-100" />
                  </div>
                  <div
                    v-else-if="isEmpty && !shownSections.size"
                    class="flex flex-col items-center justify-center text-center"
                    :style="{ minHeight: `${PAGE_HEIGHT - 112}px` }"
                  >
                    <span class="grid h-14 w-14 place-items-center rounded-2xl bg-[#f3f0ff] text-[#6a43ee]">
                      <FileText :size="26" />
                    </span>
                    <h2 class="mt-5 text-xl font-semibold text-gray-900">Your document will appear here</h2>
                    <p class="mt-2 max-w-xs text-sm text-gray-500">
                      {{ hasStarted ? "Answer FirstDraft's questions and watch it fill in." : "Pick what you'd like to create in the chat to get started." }}
                    </p>
                  </div>
                  <DocumentRenderer v-else :document="documentContent" :design="design" editable />
                </div>
              </div>
            </div>

            <!-- Add a section -->
            <div v-if="!loading && hasStarted && missingSections.length" class="mt-5 flex flex-wrap items-center gap-2">
              <span class="text-sm text-muted">Add a section:</span>
              <button
                v-for="section in missingSections"
                :key="section.key"
                class="inline-flex items-center gap-1 rounded-full border border-dashed border-line-strong px-3 py-1 text-sm text-ink-2 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
                @click="addSection(section.key)"
              >
                <Plus :size="13" /> {{ section.label }}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>

    <QualityPanel
      :open="qualityOpen"
      :document="printDocument"
      :draft-id="draftId"
      :busy="isSending"
      @close="qualityOpen = false"
      @fix="fixWithAI"
      @usage="(u) => (usage = u)"
    />

    <!-- Print-only copy used for PDF export -->
    <Teleport to="body">
      <div id="print-root" class="hidden bg-white text-gray-900">
        <DocumentRenderer :document="printDocument" :design="design" />
      </div>
    </Teleport>
  </div>
</template>
