<script setup>
import { computed, ref, watch } from "vue";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Gauge,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  Wand2,
  X,
  XCircle,
} from "lucide-vue-next";
import ScoreRing from "./ScoreRing.vue";
import { analyzeDocument, gradeFor } from "@/services/quality";
import { reviewDocument } from "@/services/ai";
import { DOCUMENT_TYPES, docNoun, isProseDocument } from "@/services/documentBuilder";

// Slide-over showing how strong the document is:
// - Quick check: instant, rule-based (no AI request)
// - Expert review: one AI request, graded like a recruiter / admissions reader
const props = defineProps({
  open: { type: Boolean, default: false },
  document: { type: Object, required: true },
  draftId: { type: String, default: "" },
  busy: { type: Boolean, default: false },
});
const emit = defineEmits(["close", "fix", "usage"]);

const tab = ref("quick");
const quick = computed(() => analyzeDocument(props.document));
const typeLabel = computed(() => DOCUMENT_TYPES[props.document.documentType] || "document");
const noun = computed(() => docNoun(props.document.documentType));
const isResume = computed(() => !isProseDocument(props.document.documentType));
const expanded = ref(new Set());

const topFixes = computed(() => {
  const issues = quick.value.issues;
  return [...issues.filter((i) => i.status === "fail"), ...issues.filter((i) => i.status === "warn")].slice(0, 3);
});

function toggle(id) {
  const next = new Set(expanded.value);
  next.has(id) ? next.delete(id) : next.add(id);
  expanded.value = next;
}

// ---------- Expert review (cached per draft in this browser) ----------
const review = ref(null);
const reviewedHash = ref("");
const reviewing = ref(false);
const reviewError = ref("");
const jobDescription = ref("");

const hashDocument = (doc) => {
  const str = JSON.stringify(doc);
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return String(h);
};
const outdated = computed(() => review.value && reviewedHash.value !== hashDocument(props.document));
const storageKey = computed(() => `fd.review.${props.draftId}`);

watch(
  () => props.draftId,
  () => {
    review.value = null;
    reviewError.value = "";
    jobDescription.value = "";
    tab.value = "quick";
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey.value) || "null");
      if (saved?.review) {
        review.value = saved.review;
        reviewedHash.value = saved.hash;
        jobDescription.value = saved.jobDescription || "";
      }
    } catch {
      /* storage unavailable */
    }
  },
  { immediate: true },
);

async function runReview() {
  if (reviewing.value) return;
  reviewing.value = true;
  reviewError.value = "";
  try {
    const result = await reviewDocument(props.document, jobDescription.value);
    review.value = result.review;
    reviewedHash.value = hashDocument(props.document);
    if (result.usage) emit("usage", result.usage);
    try {
      localStorage.setItem(
        storageKey.value,
        JSON.stringify({ review: review.value, hash: reviewedHash.value, jobDescription: jobDescription.value }),
      );
    } catch {
      /* storage unavailable */
    }
  } catch (error) {
    reviewError.value = error?.message || "The review failed. Please try again.";
  } finally {
    reviewing.value = false;
  }
}

function fix(text) {
  if (!text || props.busy) return;
  emit("fix", text);
}

const statusIcon = { pass: Check, warn: AlertTriangle, fail: XCircle };
const statusClass = {
  pass: "bg-emerald-100 text-emerald-700",
  warn: "bg-amber-100 text-amber-700",
  fail: "bg-rose-100 text-rose-700",
};
const barColor = (score) =>
  score >= 90 ? "bg-emerald-500" : score >= 75 ? "bg-green-500" : score >= 60 ? "bg-amber-500" : score >= 40 ? "bg-orange-500" : "bg-rose-500";
</script>

<template>
  <Transition name="fade">
    <div v-if="open" class="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" @click="emit('close')" />
  </Transition>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="translate-x-full"
    leave-active-class="transition duration-200 ease-in"
    leave-to-class="translate-x-full"
  >
    <aside
      v-if="open"
      class="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-canvas shadow-2xl"
      role="dialog"
      aria-label="Document strength"
      @keydown.esc="emit('close')"
    >
      <!-- Header -->
      <header class="flex items-center gap-3 border-b border-line bg-surface/80 px-5 py-4 backdrop-blur">
        <span class="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
          <Gauge :size="18" />
        </span>
        <div class="min-w-0 flex-1">
          <h2 class="font-bold text-ink">How strong is your {{ noun }}?</h2>
          <p class="text-xs text-muted">Checked against what recruiters look for</p>
        </div>
        <button class="icon-btn" aria-label="Close" @click="emit('close')"><X :size="18" /></button>
      </header>

      <!-- Tabs -->
      <div class="flex gap-1 border-b border-line bg-surface/60 px-5 pt-2">
        <button
          v-for="t in [
            { id: 'quick', label: 'Quick check', icon: Gauge },
            { id: 'expert', label: 'Expert review', icon: Sparkles },
          ]"
          :key="t.id"
          class="-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition"
          :class="tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted hover:text-ink'"
          @click="tab = t.id"
        >
          <component :is="t.icon" :size="15" /> {{ t.label }}
        </button>
      </div>

      <div class="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <!-- ================= Quick check ================= -->
        <template v-if="tab === 'quick'">
          <div class="card flex items-center gap-5 p-5">
            <ScoreRing :score="quick.score" :size="92" />
            <div>
              <p class="text-xl font-extrabold text-ink">{{ quick.label }}</p>
              <p class="mt-1 text-sm text-muted">
                Checks {{ quick.categories.reduce((n, c) => n + c.checks.length, 0) }} things recruiters look for. Updates as you type.
              </p>
            </div>
          </div>

          <!-- Top fixes -->
          <section v-if="topFixes.length" class="mt-6">
            <h3 class="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">Fix these first</h3>
            <ul class="space-y-2.5">
              <li v-for="issue in topFixes" :key="issue.id" class="card p-4">
                <div class="flex items-start gap-3">
                  <span class="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full" :class="statusClass[issue.status]">
                    <component :is="statusIcon[issue.status]" :size="13" />
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-ink">{{ issue.title }}</p>
                    <p v-if="issue.tip" class="mt-0.5 text-sm text-muted">{{ issue.tip }}</p>
                    <button v-if="issue.fix" class="chip mt-2.5 py-1 text-xs" :disabled="busy" @click="fix(issue.fix)">
                      <Wand2 :size="13" /> Fix with AI
                    </button>
                  </div>
                </div>
              </li>
            </ul>
          </section>
          <div v-else class="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
            Everything here passes. Try an expert review for more detailed feedback.
          </div>

          <!-- All categories -->
          <section class="mt-6">
            <h3 class="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">All checks</h3>
            <ul class="card divide-y divide-line overflow-hidden">
              <li v-for="cat in quick.categories" :key="cat.id">
                <button class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-subtle/60" @click="toggle(cat.id)">
                  <span class="min-w-0 flex-1">
                    <span class="flex items-center justify-between text-sm font-semibold text-ink">
                      {{ cat.label }}
                      <span class="tabular-nums text-muted">{{ cat.score }}</span>
                    </span>
                    <span class="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-subtle">
                      <span class="block h-full rounded-full transition-[width] duration-500" :class="barColor(cat.score)" :style="{ width: `${cat.score}%` }" />
                    </span>
                  </span>
                  <ChevronDown :size="16" class="shrink-0 text-muted transition" :class="expanded.has(cat.id) && 'rotate-180'" />
                </button>
                <ul v-if="expanded.has(cat.id)" class="space-y-2 bg-subtle/40 px-4 py-3">
                  <li v-for="c in cat.checks" :key="c.id" class="flex items-start gap-2.5 text-sm">
                    <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full" :class="statusClass[c.status]">
                      <component :is="statusIcon[c.status]" :size="11" />
                    </span>
                    <span class="min-w-0 flex-1">
                      <span :class="c.status === 'pass' ? 'text-ink-2' : 'font-medium text-ink'">{{ c.title }}</span>
                      <span v-if="c.status !== 'pass' && c.tip" class="block text-xs text-muted">{{ c.tip }}</span>
                    </span>
                    <button
                      v-if="c.status !== 'pass' && c.fix"
                      class="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50"
                      :disabled="busy"
                      @click="fix(c.fix)"
                    >
                      Fix
                    </button>
                  </li>
                </ul>
              </li>
            </ul>
          </section>
        </template>

        <!-- ================= Expert review ================= -->
        <template v-else>
          <div v-if="!review || outdated" class="card p-5">
            <p class="font-semibold text-ink">
              {{ review ? "You've made changes since the last review" : `Get an expert review of your ${noun}` }}
            </p>
            <p class="mt-1 text-sm text-muted">
              Read and marked the way a {{ isResume ? "recruiter" : document.documentType === "essay" ? "admissions reader" : "hiring manager" }} would, with suggested rewrites. Uses 1 of your daily messages.
            </p>

            <label v-if="isResume || document.documentType === 'cover_letter'" class="mt-4 block">
              <span class="flex items-center gap-1.5 text-sm font-semibold text-ink-2">
                <Target :size="15" class="text-brand-600" /> Job posting <span class="font-normal text-muted">(optional)</span>
              </span>
              <textarea
                v-model="jobDescription"
                rows="4"
                maxlength="8000"
                placeholder="Paste the job ad to see how well you match and which keywords are missing"
                class="scrollbar-thin mt-1.5 w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
              />
            </label>

            <button class="btn-primary mt-4 w-full py-3" :disabled="reviewing" @click="runReview">
              <Loader2 v-if="reviewing" :size="17" class="animate-spin" />
              <Sparkles v-else :size="17" />
              {{ reviewing ? "Reviewing…" : review ? "Review again" : "Get expert review" }}
            </button>
            <p v-if="reviewError" class="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
              {{ reviewError }}
            </p>
          </div>

          <template v-if="review">
            <div class="card mt-4 flex items-center gap-5 p-5" :class="outdated && 'opacity-70'">
              <ScoreRing :score="review.score" :size="92" />
              <div class="min-w-0">
                <p class="text-xl font-extrabold text-ink">{{ gradeFor(review.score).label }}</p>
                <p class="mt-1 text-sm text-ink-2">{{ review.verdict }}</p>
              </div>
            </div>

            <!-- Job match -->
            <section v-if="review.jobMatch !== null" class="card mt-4 p-5">
              <div class="flex items-center justify-between">
                <h3 class="flex items-center gap-1.5 text-sm font-bold text-ink"><Target :size="15" class="text-brand-600" /> Job match</h3>
                <span class="text-lg font-extrabold tabular-nums text-ink">{{ review.jobMatch }}%</span>
              </div>
              <div class="mt-2 h-2 overflow-hidden rounded-full bg-subtle">
                <div class="h-full rounded-full transition-[width] duration-500" :class="barColor(review.jobMatch)" :style="{ width: `${review.jobMatch}%` }" />
              </div>
              <template v-if="review.missingKeywords.length">
                <p class="mt-4 text-sm font-semibold text-ink-2">Missing keywords from the posting</p>
                <p class="text-xs text-muted">Only add the ones you really have. Tap one and FirstDraft will help you add it.</p>
                <div class="mt-2.5 flex flex-wrap gap-1.5">
                  <button
                    v-for="kw in review.missingKeywords"
                    :key="kw"
                    class="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-100 disabled:opacity-50"
                    :disabled="busy"
                    @click="fix(`I have experience with ${kw}. Please work it into my ${noun} where it fits. Ask me for the details first.`)"
                  >
                    + {{ kw }}
                  </button>
                </div>
              </template>
            </section>

            <!-- Categories -->
            <section class="card mt-4 space-y-3.5 p-5">
              <div v-for="c in review.categories" :key="c.name">
                <div class="flex items-center justify-between text-sm">
                  <span class="font-semibold text-ink">{{ c.name }}</span>
                  <span class="font-bold tabular-nums text-ink-2">{{ c.score }}/10</span>
                </div>
                <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-subtle">
                  <div class="h-full rounded-full" :class="barColor(c.score * 10)" :style="{ width: `${c.score * 10}%` }" />
                </div>
                <p class="mt-1 text-xs text-muted">{{ c.comment }}</p>
              </div>
            </section>

            <!-- Strengths -->
            <section v-if="review.strengths.length" class="mt-6">
              <h3 class="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">What's good</h3>
              <ul class="space-y-2">
                <li v-for="(s, i) in review.strengths" :key="i" class="flex items-start gap-2.5 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900 ring-1 ring-emerald-200">
                  <Check :size="15" class="mt-0.5 shrink-0 text-emerald-600" /> {{ s }}
                </li>
              </ul>
            </section>

            <!-- Improvements -->
            <section v-if="review.improvements.length" class="mt-6">
              <h3 class="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">How to make it stronger</h3>
              <ol class="space-y-3">
                <li v-for="(imp, i) in review.improvements" :key="i" class="card p-4">
                  <div class="flex items-start gap-3">
                    <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-gradient text-xs font-bold text-white">{{ i + 1 }}</span>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-bold text-ink">{{ imp.title }}</p>
                      <p class="mt-1 text-sm text-ink-2">{{ imp.detail }}</p>
                      <p v-if="imp.example" class="mt-2.5 rounded-lg border-l-[3px] border-brand-400 bg-brand-50/70 px-3 py-2 text-[13px] italic text-ink-2">
                        {{ imp.example }}
                      </p>
                      <button v-if="imp.fix" class="chip mt-3 py-1 text-xs" :disabled="busy" @click="fix(imp.fix)">
                        <Wand2 :size="13" /> Fix this
                      </button>
                    </div>
                  </div>
                </li>
              </ol>
            </section>

            <button v-if="!outdated" class="btn-ghost mt-5 w-full" :disabled="reviewing" @click="runReview">
              <RefreshCw :size="15" :class="reviewing && 'animate-spin'" /> Review again
            </button>
          </template>
        </template>
      </div>
    </aside>
  </Transition>
</template>
