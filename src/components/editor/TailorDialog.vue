<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ArrowRight, Check, FileText, Loader2, Mail, Target } from "lucide-vue-next";
import BaseModal from "@/components/BaseModal.vue";
import { tailorDocument } from "@/services/ai";
import { useDraftStore } from "@/stores/draft";
import { DOCUMENT_TYPES } from "@/services/documentBuilder";
import { formatDesign, parseDesign } from "@/components/templates/themes";

// Paste a job posting → a tailored copy of this resume/CV + a matching cover
// letter, saved as two new drafts (the original is left untouched).
const props = defineProps({
  open: { type: Boolean, default: false },
  document: { type: Object, required: true },
  design: { type: String, default: "" },
});
const emit = defineEmits(["close", "usage"]);

const router = useRouter();
const draftStore = useDraftStore();

const posting = ref("");
const makeResume = ref(true);
const makeLetter = ref(true);
const working = ref(false);
const error = ref("");
const result = ref(null); // { changes, missingKeywords, resumeId, letterId, company, jobTitle }

const typeLabel = computed(() => DOCUMENT_TYPES[props.document.documentType] || "Resume");
const canSubmit = computed(() => posting.value.trim().length >= 40 && (makeResume.value || makeLetter.value) && !working.value);

watch(
  () => props.open,
  (open) => {
    if (open) {
      result.value = null;
      error.value = "";
    }
  },
);

async function tailor() {
  if (!canSubmit.value) return;
  working.value = true;
  error.value = "";
  try {
    const t = await tailorDocument(props.document, posting.value);
    if (t.usage) emit("usage", t.usage);
    const where = [t.jobTitle, t.company].filter(Boolean).join(" at ") || "this job";
    const name = props.document.personalInfo?.name;
    const accent = parseDesign(props.design, props.document.documentType).accent;
    const out = { changes: t.changes, missingKeywords: t.missingKeywords, company: t.company, jobTitle: t.jobTitle };

    if (makeResume.value) {
      const draft = await draftStore.createDraftFrom({
        title: `${name ? `${name} — ` : ""}${typeLabel.value} (${t.company || "tailored"})`,
        document: { ...t.resume, targetRole: t.jobTitle || t.resume.targetRole },
        template: props.design || null,
        messages: [
          { role: "user", content: `Tailor my ${typeLabel.value.toLowerCase()} for ${where}.` },
          {
            role: "assistant",
            content:
              `Here's your ${typeLabel.value.toLowerCase()} tailored for **${where}**. What I changed:\n\n` +
              t.changes.map((c) => `- ${c}`).join("\n") +
              (t.missingKeywords.length
                ? `\n\nThe posting also asks for: ${t.missingKeywords.join(", ")}. If you genuinely have any of these, tell me and I'll add them.`
                : ""),
          },
        ],
      });
      out.resumeId = draft.id;
    }

    if (makeLetter.value) {
      const draft = await draftStore.createDraftFrom({
        title: `Cover letter — ${t.company || t.jobTitle || "tailored"}`,
        document: t.coverLetter,
        template: formatDesign({ style: "modern", accent }),
        messages: [
          { role: "user", content: `Write a cover letter for ${where}.` },
          {
            role: "assistant",
            content: `Your cover letter for **${where}** is in the preview — written only from facts in your ${typeLabel.value.toLowerCase()}. Want to add a personal reason you're excited about ${t.company || "the company"}? That's what makes a letter stand out.`,
          },
        ],
      });
      out.letterId = draft.id;
    }

    result.value = out;
  } catch (e) {
    error.value = e?.message || "Tailoring failed. Please try again.";
  } finally {
    working.value = false;
  }
}

function openDraft(id) {
  emit("close");
  router.push(`/app/draft/${id}`);
}
</script>

<template>
  <BaseModal
    :open="open"
    title="Tailor to a job"
    :subtitle="result ? 'Done — your original is unchanged' : 'Creates new drafts — your original stays as it is'"
    :icon="Target"
    @close="emit('close')"
  >
    <!-- Result -->
    <div v-if="result">
      <div class="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
        <p class="flex items-center gap-2 font-semibold text-emerald-900">
          <Check :size="18" /> Tailored for {{ [result.jobTitle, result.company].filter(Boolean).join(" at ") || "this job" }}
        </p>
      </div>

      <h3 class="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-muted">What changed</h3>
      <ul class="space-y-1.5">
        <li v-for="(c, i) in result.changes" :key="i" class="flex items-start gap-2 text-sm text-ink-2">
          <Check :size="15" class="mt-0.5 shrink-0 text-brand-600" /> {{ c }}
        </li>
      </ul>

      <template v-if="result.missingKeywords.length">
        <h3 class="mb-1 mt-5 text-xs font-bold uppercase tracking-wider text-muted">The posting also asks for</h3>
        <p class="mb-2 text-xs text-muted">Add these only if they're true for you — just tell FirstDraft in the chat.</p>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="kw in result.missingKeywords" :key="kw" class="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
            {{ kw }}
          </span>
        </div>
      </template>

      <div class="mt-6 grid gap-2.5 sm:grid-cols-2">
        <button v-if="result.resumeId" class="btn-primary py-3" @click="openDraft(result.resumeId)">
          <FileText :size="16" /> Open tailored {{ typeLabel.toLowerCase() }}
        </button>
        <button v-if="result.letterId" class="btn-secondary py-3" @click="openDraft(result.letterId)">
          <Mail :size="16" /> Open cover letter
        </button>
      </div>
    </div>

    <!-- Form -->
    <form v-else @submit.prevent="tailor">
      <label class="block">
        <span class="text-sm font-semibold text-ink-2">Job posting</span>
        <textarea
          v-model="posting"
          rows="8"
          maxlength="8000"
          required
          placeholder="Paste the full job description here — title, company, responsibilities and requirements…"
          class="scrollbar-thin mt-1.5 w-full resize-y rounded-xl border border-line bg-white px-3.5 py-3 text-sm text-ink placeholder:text-faint focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
        />
      </label>

      <p class="mb-2 mt-4 text-sm font-semibold text-ink-2">Create</p>
      <div class="grid gap-2 sm:grid-cols-2">
        <label
          v-for="opt in [
            { model: makeResume, set: (v) => (makeResume = v), icon: FileText, label: `Tailored ${typeLabel.toLowerCase()}`, hint: 'Reordered & reworded for this job' },
            { model: makeLetter, set: (v) => (makeLetter = v), icon: Mail, label: 'Matching cover letter', hint: '~300 words, from your real experience' },
          ]"
          :key="opt.label"
          class="flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3.5 transition"
          :class="opt.model ? 'border-brand-400 ring-4 ring-brand-100' : 'border-line hover:border-line-strong'"
        >
          <input type="checkbox" class="mt-1 accent-[#6a3ef0]" :checked="opt.model" @change="opt.set($event.target.checked)" />
          <span>
            <span class="flex items-center gap-1.5 text-sm font-semibold text-ink"><component :is="opt.icon" :size="15" /> {{ opt.label }}</span>
            <span class="text-xs text-muted">{{ opt.hint }}</span>
          </span>
        </label>
      </div>

      <p class="mt-4 rounded-xl bg-brand-50/70 px-3.5 py-2.5 text-xs text-ink-2 ring-1 ring-brand-100">
        FirstDraft only reorders and rephrases what's already in your {{ typeLabel.toLowerCase() }} — it never adds skills or experience you haven't told it about.
      </p>

      <p v-if="error" class="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">{{ error }}</p>

      <button type="submit" class="btn-primary mt-5 w-full py-3" :disabled="!canSubmit">
        <Loader2 v-if="working" :size="17" class="animate-spin" />
        <Target v-else :size="17" />
        {{ working ? "Tailoring… (about 5 seconds)" : "Tailor it" }}
        <ArrowRight v-if="!working" :size="16" />
      </button>
      <p class="mt-2 text-center text-xs text-muted">Uses 1 of your daily messages.</p>
    </form>
  </BaseModal>
</template>
