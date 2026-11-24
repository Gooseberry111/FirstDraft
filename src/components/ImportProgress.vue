<script setup>
import { FileUp, Loader2, X } from "lucide-vue-next";

defineProps({
  importing: { type: Boolean, default: false },
  stage: { type: String, default: "" },
  error: { type: String, default: "" },
});
defineEmits(["dismiss"]);
</script>

<template>
  <Transition name="fade">
    <div v-if="importing" class="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" role="status">
      <div class="card w-full max-w-sm animate-pop-in p-7 text-center">
        <span class="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
          <FileUp :size="24" />
          <Loader2 :size="64" class="absolute animate-spin text-brand-300/60" />
        </span>
        <p class="mt-5 font-bold text-ink">{{ stage || "Working…" }}</p>
        <p class="mt-1 text-sm text-muted">Every fact is kept exactly as written — nothing is invented.</p>
      </div>
    </div>
  </Transition>
  <Transition name="fade">
    <div
      v-if="error && !importing"
      class="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-2xl bg-white p-4 shadow-pop ring-1 ring-rose-200"
      role="alert"
    >
      <p class="flex-1 text-sm text-rose-700">{{ error }}</p>
      <button class="icon-btn -m-1 h-7 w-7" aria-label="Dismiss" @click="$emit('dismiss')"><X :size="15" /></button>
    </div>
  </Transition>
</template>
