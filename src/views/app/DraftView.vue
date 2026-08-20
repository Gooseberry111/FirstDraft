<script setup>
import { ref, onMounted, nextTick } from "vue";
import { Send, Save } from "lucide-vue-next";
import { useRouter, useRoute } from "vue-router";
import { useDraftStore } from "@/stores/draft";
import { sendToAI, extractDocument } from "@/services/ai";
import { createEmptyDocument } from "@/services/documentBuilder";
import { computed } from "vue";
import { useDocumentProgress } from "@/composables/useDocumentProgress";
import ModernTemplate from "@/components/templates/ModernTemplate.vue";
import CorporateTemplate from "@/components/templates/CorporateTemplate.vue";
import AcademicTemplate from "@/components/templates/AcademicTemplate.vue";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import { exportWord } from "../../services/exportWord";

const loadingMessages = ref(true);
const messagesContainer = ref(null);
const progress = computed(() => useDocumentProgress(documentContent.value));
const router = useRouter();
const route = useRoute();
const draftStore = useDraftStore();
const selectedTemplate = ref("modern");
const message = ref("");
const messages = ref([]);
const sidebarOpen = ref(true);
const mobileMenuOpen = ref(false);
const sidebarWidth = ref(280);
const isDragging = ref(false);
const mobileTab = ref("chat");

const documentContent = ref(createEmptyDocument("resume"));

async function downloadWord() {
  await exportWord(documentContent.value);
}
const previewRef = ref(null);

async function exportPDF() {
  const element = previewRef.value;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");

  const pdfWidth = 210;
  const pdfHeight = 297;

  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);

  heightLeft -= pdfHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;

    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);

    heightLeft -= pdfHeight;
  }

  pdf.save("FirstDraft.pdf");
}

const createNewDraft = async () => {
  try {
    const draft = await draftStore.createDraft();

    draftStore.currentDraft = draft;

    const welcomeMessage = {
      role: "assistant",
      content:
        "Hi! What would you like to create today?\n\n• CV\n• Resume\n• Cover Letter\n• Essay",
    };

    messages.value = [welcomeMessage];

    await draftStore.addMessage(draft.id, "assistant", welcomeMessage.content);

    await draftStore.fetchDrafts();

    router.push(`/app/draft/${draft.id}`);
  } catch (error) {
    console.error("Failed to create draft:", error);
  }
};

onMounted(async () => {
  try {
    await draftStore.fetchDrafts();

    const draft = await draftStore.getDraft(route.params.id);

    const data = await draftStore.getMessages(route.params.id);

    messages.value = data;

    // Restore saved document preview
    if (draft.document_data) {
      documentContent.value = draft.document_data;
    } else {
      documentContent.value = createEmptyDocument(
        draft.document_type || "resume",
      );
    }

    loadingMessages.value = false;
    if (draft.template) {
      selectedTemplate.value = draft.template;
    }
    await scrollToBottom();
  } catch (error) {
    console.error("Failed to load draft:", error);
    loadingMessages.value = false;
  }
});

async function sendMessage() {
  if (!message.value.trim()) return;

  if (!draftStore.currentDraft) {
    alert("Please create or open a draft first");
    return;
  }

  const text = message.value;

  // Automatically rename the draft from the first user message
  if (
    draftStore.currentDraft.title === "Untitled Draft" &&
    messages.value.length <= 2
  ) {
    const title = text.slice(0, 40);

    await draftStore.updateDraftTitle(draftStore.currentDraft.id, title);

    draftStore.currentDraft.title = title;

    await draftStore.fetchDrafts();
  }

  // Add user message to UI
  messages.value.push({
    role: "user",
    content: text,
  });

  // Save user message
  await draftStore.addMessage(draftStore.currentDraft.id, "user", text);

  // Clear input
  message.value = "";

  await scrollToBottom();

  // Show thinking state
  messages.value.push({
    role: "assistant",
    content: "Thinking...",
  });

  const thinkingIndex = messages.value.length - 1;

  await scrollToBottom();

  try {
    // Send conversation to Gemini
    const recentMessages = messages.value
      .filter((msg) => msg.content !== "Thinking...")
      .slice(-12);

    const aiReply = await sendToAI(recentMessages);

    // Replace thinking message
    messages.value[thinkingIndex] = {
      role: "assistant",
      content: aiReply.content,
    };

    // Save AI response
    await draftStore.addMessage(
      draftStore.currentDraft.id,
      "assistant",
      aiReply.content,
    );

    // Extract structured document data
    const document = await extractDocument(
      messages.value,
      documentContent.value.documentType,
    );
    selectedTemplate.value = recommendTemplate(document);

    animateDocument(document);

    // Auto recommend template
    recommendTemplate(document);

    await draftStore.saveDocument(draftStore.currentDraft.id, document);

    await scrollToBottom();
  } catch (error) {
    console.error("AI ERROR:", error);

    messages.value[thinkingIndex] = {
      role: "assistant",
      content: "Sorry, something went wrong while generating a response.",
    };

    await scrollToBottom();
  }
}

const openDraft = async (id) => {
  try {
    const draft = await draftStore.getDraft(id);

    await loadDraftMessages(id);

    // Restore saved preview
    if (draft.document_data) {
      documentContent.value = draft.document_data;
    } else {
      documentContent.value = createEmptyDocument(
        draft.document_type || "resume",
      );
    }

    router.push(`/app/draft/${id}`);
  } catch (error) {
    console.error("Failed to open draft:", error);
  }
};

const loadDraftMessages = async (draftId) => {
  messages.value = await draftStore.getMessages(draftId);
};

const scrollToBottom = async () => {
  await nextTick();

  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};
async function selectTemplate(template) {
  selectedTemplate.value = template;

  if (draftStore.currentDraft) {
    await draftStore.updateTemplate(draftStore.currentDraft.id, template);
  }
}

// Enter = send
// Shift + Enter = new line
function handleEnter(event) {
  if (event.shiftKey) {
    return;
  }

  event.preventDefault();
  sendMessage();
}

/*
|--------------------------------------------------------------------------
| DOCUMENT ANIMATION
|--------------------------------------------------------------------------
*/

function animateDocument(newDocument) {
  const currentDocument = JSON.parse(JSON.stringify(documentContent.value));

  documentContent.value = currentDocument;

  // Personal information
  animateText(currentDocument.personalInfo, newDocument.personalInfo);

  // Summary
  animateTextField(currentDocument, newDocument, "summary");

  // Arrays
  animateArray(currentDocument, newDocument, "skills");

  animateArray(currentDocument, newDocument, "certifications");

  animateArray(currentDocument, newDocument, "achievements");

  // Object arrays
  animateObjects(currentDocument, newDocument, "experience");

  animateObjects(currentDocument, newDocument, "education");

  animateObjects(currentDocument, newDocument, "projects");
}

/*
|--------------------------------------------------------------------------
| ANIMATE PERSONAL INFO
|--------------------------------------------------------------------------
*/

function animateText(target, source) {
  if (!source) return;

  Object.keys(source).forEach((key) => {
    const value = source[key];

    if (!value || value === target[key]) return;

    target[key] = "";

    let index = 0;

    const interval = setInterval(() => {
      target[key] = value.slice(0, index + 1);

      index++;

      if (index >= value.length) {
        clearInterval(interval);
      }
    }, 20);
  });
}

/*
|--------------------------------------------------------------------------
| ANIMATE TEXT FIELD
|--------------------------------------------------------------------------
*/

function animateTextField(target, source, field) {
  const value = source[field];

  if (!value || value === target[field]) return;

  target[field] = "";

  let index = 0;

  const interval = setInterval(() => {
    target[field] = value.slice(0, index + 1);

    index++;

    if (index >= value.length) {
      clearInterval(interval);
    }
  }, 20);
}
function recommendTemplate(document) {
  if (
    document.publications?.length > 0 ||
    document.research?.length > 0 ||
    document.documentType === "cv"
  ) {
    return "academic";
  }

  if (document.experience?.length >= 3 && document.skills?.length >= 5) {
    return "corporate";
  }

  return "modern";
}
/*
|--------------------------------------------------------------------------
| ANIMATE SIMPLE ARRAYS
|--------------------------------------------------------------------------
*/

function animateArray(target, source, field) {
  if (!source[field]?.length) return;

  target[field] = [];

  source[field].forEach((item, index) => {
    setTimeout(() => {
      target[field].push(item);
    }, index * 250);
  });
}
function startDrag() {
  isDragging.value = true;

  document.addEventListener("mousemove", dragSidebar);
  document.addEventListener("mouseup", stopDrag);
}

function dragSidebar(e) {
  if (!isDragging.value) return;

  sidebarWidth.value = Math.max(220, Math.min(500, e.clientX));
}

function stopDrag() {
  isDragging.value = false;

  document.removeEventListener("mousemove", dragSidebar);

  document.removeEventListener("mouseup", stopDrag);
}
/*
|--------------------------------------------------------------------------
| ANIMATE OBJECT ARRAYS
|--------------------------------------------------------------------------
*/

function animateObjects(target, source, field) {
  if (!source[field]?.length) return;

  target[field] = [];

  source[field].forEach((item, index) => {
    const animatedItem = {};

    target[field].push(animatedItem);

    Object.keys(item).forEach((key) => {
      const value = item[key] || "";

      animatedItem[key] = "";

      setTimeout(() => {
        let charIndex = 0;

        const interval = setInterval(() => {
          animatedItem[key] = value.slice(0, charIndex + 1);

          charIndex++;

          if (charIndex >= value.length) {
            clearInterval(interval);
          }
        }, 15);
      }, index * 200);
    });
  });
}
</script>
<template>
  <div class="min-h-screen bg-[#0f1117] text-white">
    <div class="flex h-[calc(100vh-48px)]">
      <!-- LEFT SIDEBAR -->
      <aside
        :style="{
          width: sidebarOpen ? `${sidebarWidth}px` : '0px',
        }"
        class="hidden lg:flex overflow-hidden transition-all duration-300 flex-col bg-[#171923]"
      >
        <div class="border-b border-[#2a3142] p-5">
          <h1 class="text-2xl font-semibold">FirstDraft</h1>
        </div>

        <div class="p-4">
          <button
            @click="createNewDraft"
            class="w-full rounded-xl bg-violet-600 px-4 py-3 font-medium transition hover:bg-violet-500"
          >
            New Draft
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4">
          <p class="mb-4 text-xs uppercase tracking-wider text-zinc-500">
            Recent Drafts
          </p>

          <div
            v-for="draft in draftStore.drafts"
            :key="draft.id"
            @click="openDraft(draft.id)"
            class="mb-3 cursor-pointer rounded-xl border border-[#2a3142] bg-[#1d2130] p-3 transition hover:border-violet-500"
          >
            {{ draft.title }}
          </div>

          <div
            v-if="draftStore.drafts.length === 0"
            class="rounded-xl border border-[#2a3142] p-3 text-zinc-400"
          >
            No drafts yet
          </div>
        </div>
      </aside>
      <Transition name="fade">
        <div
          v-if="mobileMenuOpen"
          class="fixed inset-0 z-50 bg-black/50 lg:hidden"
          @click="mobileMenuOpen = false"
        >
          <aside class="h-full w-[280px] bg-[#171923]" @click.stop>
            <div class="border-b border-[#2a3142] p-5">
              <div class="flex items-center justify-between">
                <h1 class="text-xl font-semibold">FirstDraft</h1>

                <button @click="mobileMenuOpen = false">✕</button>
              </div>
            </div>

            <div class="p-4">
              <button
                @click="createNewDraft"
                class="w-full rounded-xl bg-violet-600 px-4 py-3"
              >
                New Draft
              </button>
            </div>

            <div class="overflow-y-auto p-4">
              <div
                v-for="draft in draftStore.drafts"
                :key="draft.id"
                @click="
                  openDraft(draft.id);
                  mobileMenuOpen = false;
                "
                class="mb-3 cursor-pointer rounded-xl border border-[#2a3142] bg-[#1d2130] p-3"
              >
                {{ draft.title }}
              </div>
            </div>
            <div
              class="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-violet-500"
              @mousedown="startDrag"
            />
          </aside>
        </div>
      </Transition>

      <!-- CHAT COLUMN -->
      <section
        :class="[
          mobileTab !== 'chat' ? 'hidden lg:flex' : 'flex',
          'h-full min-h-0 w-full lg:w-[450px] shrink-0 flex-col overflow-hidden border-r border-[#2a3142] bg-[#11151f]',
        ]"
      >
        <!-- Header -->
        <div class="shrink-0 border-b border-[#2a3142]">
          <div class="flex items-center justify-between p-4">
            <button
              @click="sidebarOpen = !sidebarOpen"
              class="hidden lg:flex rounded-lg border border-[#2a3142] p-2"
            >
              ☰
            </button>

            <button
              @click="mobileMenuOpen = true"
              class="lg:hidden rounded-lg border border-[#2a3142] p-2"
            >
              ☰
            </button>

            <div class="flex items-center gap-2">
              <button
                @click="exportPDF"
                class="rounded-xl border border-[#2a3142] px-4 py-2"
              >
                PDF
              </button>

              <button
                @click="downloadWord"
                class="rounded-xl border border-[#2a3142] px-4 py-2"
              >
                Word
              </button>
            </div>
          </div>

          <!-- MOBILE CHAT/PREVIEW TABS -->
          <div class="flex lg:hidden border-t border-[#2a3142]">
            <button
              @click="mobileTab = 'chat'"
              :class="
                mobileTab === 'chat' ? 'text-violet-400' : 'text-zinc-400'
              "
              class="flex-1 py-3 text-sm font-medium"
            >
              Chat
            </button>

            <button
              @click="mobileTab = 'preview'"
              :class="
                mobileTab === 'preview' ? 'text-violet-400' : 'text-zinc-400'
              "
              class="flex-1 py-3 text-sm font-medium"
            >
              Preview
            </button>
          </div>
        </div>

        <!-- Messages -->
        <div ref="messagesContainer" class="min-h-0 flex-1 overflow-y-auto p-4">
          <template v-if="loadingMessages">
            <div
              v-for="i in 5"
              :key="i"
              class="mb-4 h-20 animate-pulse rounded-3xl bg-[#1d2130]"
            />
          </template>

          <template v-else>
            <div v-for="(msg, index) in messages" :key="index" class="mb-4">
              <div
                v-if="msg.role === 'assistant'"
                class="max-w-[90%] rounded-3xl rounded-tl-md border border-[#2a3142] bg-[#1d2130] p-4"
              >
                {{ msg.content }}
              </div>

              <div
                v-else
                class="ml-auto max-w-[90%] rounded-3xl rounded-br-md bg-violet-600 p-4"
              >
                {{ msg.content }}
              </div>
            </div>
          </template>
        </div>

        <!-- INPUT -->
        <form
          class="shrink-0 border-t border-[#2a3142] p-4"
          @submit.prevent="sendMessage"
        >
          <div
            class="flex items-center gap-3 rounded-2xl border border-[#2a3142] bg-[#171923] p-3"
          >
            <textarea
              v-model="message"
              placeholder="Reply to FirstDraft..."
              rows="1"
              @keydown.enter="handleEnter"
              class="max-h-40 flex-1 resize-none bg-transparent outline-none"
            ></textarea>

            <button
              type="submit"
              class="rounded-xl bg-violet-600 p-2 transition hover:bg-violet-500"
            >
              <Send :size="18" />
            </button>
          </div>
        </form>
      </section>

      <!-- PREVIEW COLUMN -->
      <section
        :class="[
          mobileTab !== 'preview' ? 'hidden lg:block' : 'block',
          'flex-1 overflow-y-auto bg-[#0f1117] p-4 lg:p-8',
        ]"
      >
        <div class="mx-auto w-full max-w-[900px]">
          <!--selector -->
          <div class="mb-4 flex gap-2">
            <button
              @click="selectedTemplate = 'modern'"
              :class="
                selectedTemplate === 'modern'
                  ? 'bg-violet-600 text-white'
                  : 'bg-[#171923] text-zinc-400'
              "
              class="rounded-xl px-4 py-2 transition"
            >
              Modern
            </button>

            <button
              @click="selectedTemplate = 'corporate'"
              :class="
                selectedTemplate === 'corporate'
                  ? 'bg-violet-600 text-white'
                  : 'bg-[#171923] text-zinc-400'
              "
              class="rounded-xl px-4 py-2 transition"
            >
              Corporate
            </button>

            <button
              @click="selectedTemplate = 'academic'"
              :class="
                selectedTemplate === 'academic'
                  ? 'bg-violet-600 text-white'
                  : 'bg-[#171923] text-zinc-400'
              "
              class="rounded-xl px-4 py-2 transition"
            >
              Academic CV
            </button>
          </div>
          <!-- Progess Card-->
          <div class="mb-6 rounded-2xl bg-[#171923] p-5">
            <div class="mb-2 flex items-center justify-between">
              <h3 class="font-semibold text-white">Document Progress</h3>

              <span class="text-violet-400"> {{ progress.percentage }}% </span>
            </div>

            <div class="h-2 overflow-hidden rounded-full bg-[#2a3142]">
              <div
                class="h-full bg-violet-500 transition-all duration-500"
                :style="{ width: `${progress.percentage}%` }"
              />
            </div>

            <div class="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div>
                {{ progress.sections.personalInfo ? "✓" : "✗" }}
                Personal Info
              </div>

              <div>
                {{ progress.sections.summary ? "✓" : "✗" }}
                Summary
              </div>

              <div>
                {{ progress.sections.experience ? "✓" : "✗" }}
                Experience
              </div>

              <div>
                {{ progress.sections.education ? "✓" : "✗" }}
                Education
              </div>

              <div>
                {{ progress.sections.skills ? "✓" : "✗" }}
                Skills
              </div>

              <div>
                {{ progress.sections.projects ? "✓" : "✗" }}
                Projects
              </div>
            </div>
          </div>

          <!-- A4 PAGE -->
          <div
            ref="previewRef"
            class="mx-auto w-full max-w-[794px] bg-white p-6 text-black shadow-2xl sm:p-12"
          >
            <ModernTemplate
              v-if="selectedTemplate === 'modern'"
              :document="documentContent"
            />

            <CorporateTemplate
              v-else-if="selectedTemplate === 'corporate'"
              :document="documentContent"
            />

            <AcademicTemplate
              v-else-if="selectedTemplate === 'academic'"
              :document="documentContent"
            />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
