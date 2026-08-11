<script setup>
import { ref } from "vue";
import { Send, Save } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useDraftStore } from "@/stores/draft";
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import { sendToAI } from "@/services/ai";
import { nextTick } from "vue";
import { buildDocument } from "@/services/documentBuilder";

const loadingMessages = ref(true);
const messagesContainer = ref(null);
const router = useRouter();
const draftStore = useDraftStore();
const route = useRoute();
const documentContent = ref("");
const createNewDraft = async () => {
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
};
const message = ref("");

const messages = ref([]);

onMounted(async () => {
  await draftStore.fetchDrafts();

  const data = await draftStore.getMessages(route.params.id);

  messages.value = data;

  loadingMessages.value = false;

  await scrollToBottom();
});

async function sendMessage() {
  if (!message.value.trim()) return;

  // Must have an active draft
  if (!draftStore.currentDraft) {
    alert("Please create or open a draft first");
    return;
  }

  const text = message.value;

  // Auto rename draft from first user message
  if (
    draftStore.currentDraft.title === "Untitled Draft" &&
    messages.value.length <= 2
  ) {
    const title = text.slice(0, 40);

    await draftStore.updateDraftTitle(draftStore.currentDraft.id, title);

    draftStore.currentDraft.title = title;

    await draftStore.fetchDrafts();
  }

  // Add user message
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
    const aiReply = await sendToAI(
      messages.value.filter((msg) => msg.content !== "Thinking..."),
    );

    // Replace thinking message
    messages.value[thinkingIndex] = aiReply;
    documentContent.value = buildDocument(messages.value);
    // Save AI message
    await draftStore.addMessage(
      draftStore.currentDraft.id,
      "assistant",
      aiReply.content,
    );

    await scrollToBottom();
  } catch (error) {
    console.error(error);

    messages.value[thinkingIndex] = {
      role: "assistant",
      content: "Sorry, something went wrong while generating a response.",
    };

    await scrollToBottom();
  }
}
const openDraft = async (id) => {
  await draftStore.getDraft(id);

  await loadDraftMessages(id);

  router.push(`/app/draft/${id}`);
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
            <input
              v-model="message"
              placeholder="Reply to FirstDraft..."
              class="flex-1 bg-transparent outline-none"
            />

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
            class="min-h-[1123px] rounded-2xl bg-white p-12 text-black shadow-2xl"
          >
            <div class="border-b pb-6">
              <h1 class="text-4xl font-bold">Untitled Document</h1>

              <p class="mt-2 text-zinc-500">
                Your document updates in real time.
              </p>
            </div>

            <div v-if="documentContent" class="prose max-w-none">
              <pre class="whitespace-pre-wrap font-sans"
                >{{ documentContent }}
  </pre
              >
            </div>

            <div v-else class="flex min-h-[800px] items-center justify-center">
              <div class="text-center">
                <div v-if="documentContent" class="whitespace-pre-wrap">
                  {{ documentContent }}
                </div>

                <div v-else class="text-center">
                  <h2 class="text-2xl font-semibold">Select a document type</h2>

                  <p class="mt-2 text-zinc-500">
                    FirstDraft will build your document as you chat.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
