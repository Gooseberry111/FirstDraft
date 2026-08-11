<script setup>
import { ref, onMounted, nextTick } from "vue";
import { Send, Save } from "lucide-vue-next";
import { useRouter, useRoute } from "vue-router";
import { useDraftStore } from "@/stores/draft";
import { sendToAI, extractDocument } from "@/services/ai";
import { createEmptyDocument } from "@/services/documentBuilder";

const loadingMessages = ref(true);
const messagesContainer = ref(null);

const router = useRouter();
const route = useRoute();
const draftStore = useDraftStore();

const message = ref("");
const messages = ref([]);

const documentContent = ref(createEmptyDocument("resume"));

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
    const aiReply = await sendToAI(
      messages.value.filter((msg) => msg.content !== "Thinking..."),
    );

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

    // Animate the preview
    animateDocument(document);

    // Save the complete document to Supabase
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
  <div class="h-screen overflow-hidden bg-[#0f1117] text-white">
    <div class="grid h-full grid-cols-[280px_450px_minmax(0,1fr)]">
      <!-- LEFT SIDEBAR -->
      <aside
        class="flex h-screen flex-col border-r border-[#2a3142] bg-[#171923]"
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

      <!-- CHAT COLUMN -->
      <section
        class="flex h-screen min-h-0 flex-col border-r border-[#2a3142] bg-[#11151f]"
      >
        <!-- Header -->
        <div
          class="flex shrink-0 items-center justify-between border-b border-[#2a3142] p-4"
        >
          <div>
            <h2 class="font-semibold">
              {{ draftStore.currentDraft?.title || "Untitled Draft" }}
            </h2>

            <p class="text-sm text-zinc-500">Start chatting</p>
          </div>

          <button
            class="rounded-xl border border-[#2a3142] px-4 py-2 transition hover:border-violet-500"
          >
            Save
          </button>
        </div>

        <!-- Messages -->
        <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4">
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
      <section class="h-screen overflow-y-auto bg-[#0f1117] p-8">
        <div class="mx-auto w-full max-w-[900px]">
          <!-- A4 PAGE -->
          <div
            class="min-h-[1123px] bg-white p-10 text-black shadow-2xl sm:p-12"
          >
            <!-- Header -->
            <div class="border-b border-gray-300 pb-6">
              <h1 class="text-3xl font-bold tracking-tight text-gray-900">
                {{ documentContent.personalInfo.name || "Your Name" }}
              </h1>

              <div
                v-if="
                  documentContent.personalInfo.email ||
                  documentContent.personalInfo.phone ||
                  documentContent.personalInfo.location ||
                  documentContent.personalInfo.linkedin ||
                  documentContent.personalInfo.website
                "
                class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500"
              >
                <span v-if="documentContent.personalInfo.email">
                  {{ documentContent.personalInfo.email }}
                </span>

                <span v-if="documentContent.personalInfo.phone">
                  {{ documentContent.personalInfo.phone }}
                </span>

                <span v-if="documentContent.personalInfo.location">
                  {{ documentContent.personalInfo.location }}
                </span>

                <span v-if="documentContent.personalInfo.linkedin">
                  {{ documentContent.personalInfo.linkedin }}
                </span>

                <span v-if="documentContent.personalInfo.website">
                  {{ documentContent.personalInfo.website }}
                </span>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-if="
                !documentContent.summary &&
                !documentContent.experience?.length &&
                !documentContent.education?.length &&
                !documentContent.skills?.length &&
                !documentContent.projects?.length &&
                !documentContent.certifications?.length
              "
              class="flex min-h-[800px] items-center justify-center"
            >
              <div class="text-center">
                <h2 class="text-2xl font-semibold text-gray-800">
                  Your document will appear here
                </h2>

                <p class="mt-2 text-sm text-gray-500">
                  Start chatting with FirstDraft to build your resume.
                </p>
              </div>
            </div>

            <!-- Summary -->
            <section v-if="documentContent.summary" class="mt-8">
              <h2
                class="border-b border-gray-300 pb-2 text-sm font-bold uppercase tracking-widest text-gray-800"
              >
                Professional Summary
              </h2>

              <p class="mt-3 text-sm leading-6 text-gray-700">
                {{ documentContent.summary }}
              </p>
            </section>

            <!-- Experience -->
            <section v-if="documentContent.experience?.length" class="mt-8">
              <h2
                class="border-b border-gray-300 pb-2 text-sm font-bold uppercase tracking-widest text-gray-800"
              >
                Experience
              </h2>

              <div
                v-for="(job, index) in documentContent.experience"
                :key="index"
                class="mt-5"
              >
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h3 class="font-semibold text-gray-900">
                      {{ job.position }}
                    </h3>

                    <p class="text-sm text-gray-600">
                      {{ job.company }}
                    </p>
                  </div>

                  <span class="shrink-0 text-sm text-gray-500">
                    {{ job.date }}
                  </span>
                </div>

                <p
                  v-if="job.description"
                  class="mt-2 text-sm leading-6 text-gray-700"
                >
                  {{ job.description }}
                </p>
              </div>
            </section>

            <!-- Education -->
            <section v-if="documentContent.education?.length" class="mt-8">
              <h2
                class="border-b border-gray-300 pb-2 text-sm font-bold uppercase tracking-widest text-gray-800"
              >
                Education
              </h2>

              <div
                v-for="(education, index) in documentContent.education"
                :key="index"
                class="mt-5"
              >
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h3 class="font-semibold text-gray-900">
                      {{ education.degree }}
                    </h3>

                    <p class="text-sm text-gray-600">
                      {{ education.school }}
                    </p>
                  </div>

                  <span class="shrink-0 text-sm text-gray-500">
                    {{ education.date }}
                  </span>
                </div>
              </div>
            </section>

            <!-- Skills -->
            <section v-if="documentContent.skills?.length" class="mt-8">
              <h2
                class="border-b border-gray-300 pb-2 text-sm font-bold uppercase tracking-widest text-gray-800"
              >
                Skills
              </h2>

              <p class="mt-3 text-sm leading-6 text-gray-700">
                {{ documentContent.skills.join(" • ") }}
              </p>
            </section>

            <!-- Projects -->
            <section v-if="documentContent.projects?.length" class="mt-8">
              <h2
                class="border-b border-gray-300 pb-2 text-sm font-bold uppercase tracking-widest text-gray-800"
              >
                Projects
              </h2>

              <div
                v-for="(project, index) in documentContent.projects"
                :key="index"
                class="mt-5"
              >
                <h3 class="font-semibold text-gray-900">
                  {{ project.name }}
                </h3>

                <p
                  v-if="project.description"
                  class="mt-1 text-sm leading-6 text-gray-700"
                >
                  {{ project.description }}
                </p>
              </div>
            </section>

            <!-- Certifications -->
            <section v-if="documentContent.certifications?.length" class="mt-8">
              <h2
                class="border-b border-gray-300 pb-2 text-sm font-bold uppercase tracking-widest text-gray-800"
              >
                Certifications
              </h2>

              <ul class="mt-3 space-y-2">
                <li
                  v-for="(
                    certification, index
                  ) in documentContent.certifications"
                  :key="index"
                  class="text-sm text-gray-700"
                >
                  {{ certification }}
                </li>
              </ul>
            </section>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
