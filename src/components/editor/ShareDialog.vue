<script setup>
import { computed, ref } from "vue";
import { Check, Copy, ExternalLink, Globe, Loader2, Lock, Share2 } from "lucide-vue-next";
import BaseModal from "@/components/BaseModal.vue";
import { useDraftStore } from "@/stores/draft";

// Opt-in, read-only public link. Turning it off (or back on) invalidates the old link.
const props = defineProps({
  open: { type: Boolean, default: false },
  draft: { type: Object, default: null },
});
const emit = defineEmits(["close"]);

const draftStore = useDraftStore();
const working = ref(false);
const error = ref("");
const copied = ref(false);

const shareUrl = computed(() =>
  props.draft?.share_id ? `${window.location.origin}/s/${props.draft.share_id}` : "",
);

async function setSharing(enabled) {
  working.value = true;
  error.value = "";
  try {
    await draftStore.setSharing(props.draft.id, enabled);
  } catch (e) {
    error.value = e?.message || "Couldn't update sharing.";
  } finally {
    working.value = false;
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(shareUrl.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    error.value = "Couldn't copy the link. Select it and copy it yourself.";
  }
}
</script>

<template>
  <BaseModal :open="open" title="Share" subtitle="A read-only web page of this document" :icon="Share2" @close="emit('close')">
    <div class="card flex items-center gap-3 p-4">
      <span
        class="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
        :class="shareUrl ? 'bg-emerald-100 text-emerald-700' : 'bg-subtle text-muted'"
      >
        <component :is="shareUrl ? Globe : Lock" :size="19" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-ink">{{ shareUrl ? "Anyone with the link can view" : "Private. Only you can see it" }}</p>
        <p class="text-xs text-muted">{{ shareUrl ? "They can't edit it or see your chat." : "Turn on sharing to get a link." }}</p>
      </div>
      <button
        class="relative h-7 w-12 shrink-0 rounded-full transition"
        :class="shareUrl ? 'bg-brand-gradient' : 'bg-line-strong'"
        role="switch"
        :aria-checked="!!shareUrl"
        aria-label="Share with a link"
        :disabled="working || !draft"
        @click="setSharing(!shareUrl)"
      >
        <span class="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all" :class="shareUrl ? 'left-6' : 'left-1'" />
      </button>
    </div>

    <div v-if="shareUrl" class="mt-4">
      <div class="flex gap-2">
        <input
          :value="shareUrl"
          readonly
          aria-label="Share link"
          class="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:outline-none"
          @focus="$event.target.select()"
        />
        <button class="btn-primary shrink-0" @click="copy">
          <component :is="copied ? Check : Copy" :size="16" /> {{ copied ? "Copied" : "Copy" }}
        </button>
      </div>
      <a :href="shareUrl" target="_blank" rel="noopener" class="btn-ghost mt-2 px-2 text-brand-700">
        <ExternalLink :size="15" /> Open the shared page
      </a>
      <p class="mt-3 text-xs text-muted">
        The page always shows your latest version. It includes your contact details, so only share it with people you trust.
        Turning sharing off breaks the link.
      </p>
    </div>

    <p v-if="working" class="mt-3 flex items-center gap-2 text-sm text-muted"><Loader2 :size="15" class="animate-spin" /> Updating…</p>
    <p v-if="error" class="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">{{ error }}</p>
  </BaseModal>
</template>
